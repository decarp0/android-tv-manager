import { randomBytes } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import fastifyWebsocket from '@fastify/websocket'
import type { ServerContext } from '../context.js'
import type { ConsoleEvent } from '../types.js'
import { isWifiSerial } from '../lib/validation.js'
import { startRemoteStream } from '../remote-stream.js'

export async function registerWebSocketRoutes({ app, adb, events }: ServerContext) {
  await app.register(fastifyWebsocket)

  const remoteStreams = new Map<string, AbortController>()
  let logcatProcess: ChildProcess | undefined
  let logcatSerial: string | undefined

  function stopLogcat() {
    if (logcatProcess) {
      logcatProcess.kill('SIGTERM')
      logcatProcess = undefined
      events.publish({ kind: 'info', serial: logcatSerial, text: 'Logcat stopped.', source: 'stream' })
      logcatSerial = undefined
    }
  }

  app.get('/ws', { websocket: true }, (socket, request) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.searchParams.get('channel') === 'remote') {
      const serial = url.searchParams.get('serial')
      if (!isWifiSerial(serial)) {
        socket.send(JSON.stringify({ type: 'error', message: 'Choose a connected Wi-Fi ADB device.' }))
        socket.close(1008, 'Invalid device')
        return
      }
      if (remoteStreams.has(serial)) {
        socket.send(JSON.stringify({ type: 'error', message: 'A live stream is already active for this device.' }))
        socket.close(1013, 'Stream already active')
        return
      }

      const controller = new AbortController()
      remoteStreams.set(serial, controller)
      const stop = () => {
        controller.abort()
        if (remoteStreams.get(serial) === controller) remoteStreams.delete(serial)
      }
      socket.once('close', stop)
      socket.once('error', stop)
      events.publish({ kind: 'info', serial, text: 'Starting scrcpy 3.3.3 live stream.', source: 'stream' })

      void startRemoteStream(serial, socket, controller.signal, (text) => {
        events.publish({ kind: 'info', serial, text, source: 'stream' })
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : String(error)
        events.publish({ kind: 'error', serial, text: message, source: 'system' })
        if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'error', message }))
        socket.close(1011, 'Could not start scrcpy stream')
      }).finally(() => {
        stop()
        if (socket.readyState === 1) socket.close(1000, 'Stream ended')
      })
      return
    }

    events.add(socket)
    socket.send(JSON.stringify({
      id: randomBytes(8).toString('hex'),
      ts: Date.now(),
      kind: 'info',
      text: 'Console stream connected.',
      source: 'system',
    } satisfies ConsoleEvent))

    socket.on('message', (message: unknown) => {
      try {
        const data = JSON.parse(String(message)) as { type?: string; serial?: string }
        if (data.type === 'logcat:start' && isWifiSerial(data.serial)) {
          stopLogcat()
          logcatSerial = data.serial
          events.publish({ kind: 'command', serial: logcatSerial, text: `${adb.adbPath} -s ${logcatSerial} logcat -v threadtime`, source: 'stream' })
          logcatProcess = spawn(adb.adbPath, ['-s', logcatSerial, 'logcat', '-v', 'threadtime'], { stdio: ['ignore', 'pipe', 'pipe'] })
          logcatProcess.stdout?.on('data', (chunk: Buffer) => {
            events.publish({ kind: 'logcat', serial: logcatSerial, text: chunk.toString(), source: 'stream' })
          })
          logcatProcess.stderr?.on('data', (chunk: Buffer) => {
            events.publish({ kind: 'stderr', serial: logcatSerial, text: chunk.toString(), source: 'stream' })
          })
          logcatProcess.on('error', (error) => {
            events.publish({ kind: 'error', serial: logcatSerial, text: error.message, source: 'system' })
            logcatProcess = undefined
          })
          logcatProcess.on('close', (code) => {
            events.publish({ kind: 'exit', serial: logcatSerial, text: `logcat exit ${code ?? 1}`, exitCode: code ?? 1, source: 'stream' })
            logcatProcess = undefined
            logcatSerial = undefined
          })
        } else if (data.type === 'logcat:stop') {
          stopLogcat()
        }
      } catch (error) {
        events.publish({ kind: 'error', text: `Invalid WebSocket message: ${String(error)}`, source: 'system' })
      }
    })
    socket.on('close', () => {
      events.delete(socket)
      if (events.size === 0) stopLogcat()
    })
    socket.on('error', () => events.delete(socket))
  })
}
