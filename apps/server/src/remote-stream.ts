import { readFile } from 'node:fs/promises'
import { AdbServerClient } from '@yume-chan/adb'
import { AdbScrcpyClient, AdbScrcpyOptions3_3_3 } from '@yume-chan/adb-scrcpy'
import { AdbServerNodeTcpConnector } from '@yume-chan/adb-server-node-tcp'
import { DefaultServerPath, type ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy'
import { ReadableStream, type ReadableStreamDefaultReader } from '@yume-chan/stream-extra'

const MAX_SOCKET_BUFFER_BYTES = 4 * 1024 * 1024
const PACKET_HEADER_SIZE = 14

export interface RemoteStreamSocket {
  readyState: number
  bufferedAmount: number
  send(data: Buffer | string): void
}

export function encodeRemotePacket(packet: ScrcpyMediaStreamPacket): Buffer {
  const result = Buffer.allocUnsafe(PACKET_HEADER_SIZE + packet.data.byteLength)
  result.write('TSV1', 0, 'ascii')
  result.writeUInt8(packet.type === 'configuration' ? 0 : 1, 4)
  result.writeUInt8(packet.type === 'data' && packet.keyframe ? 1 : 0, 5)
  result.writeBigInt64BE(packet.type === 'data' ? packet.pts ?? 0n : 0n, 6)
  Buffer.from(packet.data.buffer, packet.data.byteOffset, packet.data.byteLength).copy(result, PACKET_HEADER_SIZE)
  return result
}

function consumeServerOutput(
  client: AdbScrcpyClient<AdbScrcpyOptions3_3_3<boolean>>,
  signal: AbortSignal,
  onLog: (text: string) => void,
): void {
  const reader = client.output.getReader()
  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return
        if (value.trim()) onLog(value.trim())
      }
    } catch (error) {
      if (!signal.aborted) onLog(`scrcpy output stream failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      reader.releaseLock()
    }
  })()
}

export async function startRemoteStream(
  serial: string,
  socket: RemoteStreamSocket,
  signal: AbortSignal,
  onLog: (text: string) => void,
): Promise<void> {
  let adb: Awaited<ReturnType<AdbServerClient['createAdb']>> | undefined
  let client: AdbScrcpyClient<AdbScrcpyOptions3_3_3<boolean>> | undefined
  let reader: ReadableStreamDefaultReader<ScrcpyMediaStreamPacket> | undefined

  try {
    const adbServer = new AdbServerClient(
      new AdbServerNodeTcpConnector({ host: '127.0.0.1', port: 5037 }),
    )
    adb = await adbServer.createAdb({ serial })
    if (signal.aborted) return

    const serverBinary = await readFile(new URL('../scrcpy-server.bin', import.meta.url))
    await AdbScrcpyClient.pushServer(adb, ReadableStream.from([serverBinary]))
    if (signal.aborted) return

    const options = new AdbScrcpyOptions3_3_3({
      video: true,
      audio: false,
      control: false,
      tunnelForward: true,
      maxSize: 1280,
      maxFps: 30,
    })
    client = await AdbScrcpyClient.start(adb, DefaultServerPath, options)
    consumeServerOutput(client, signal, onLog)
    if (signal.aborted) return

    if (!client.videoStream) throw new Error('scrcpy video was disabled unexpectedly.')
    const video = await client.videoStream
    if (signal.aborted) return

    socket.send(JSON.stringify({
      type: 'ready',
      codec: video.metadata.codec,
      deviceName: video.metadata.deviceName,
      width: video.metadata.width,
      height: video.metadata.height,
    }))

    const videoReader = video.stream.getReader()
    reader = videoReader
    let waitingForKeyframe = false
    const cancelReader = () => {
      void videoReader.cancel().catch((error) => {
        onLog(`could not cancel scrcpy video reader: ${error instanceof Error ? error.message : String(error)}`)
      })
    }
    signal.addEventListener('abort', cancelReader, { once: true })
    try {
      while (!signal.aborted && socket.readyState === 1) {
        const { done, value } = await videoReader.read()
        if (done) break

        if (value.type === 'configuration') {
          socket.send(encodeRemotePacket(value))
          waitingForKeyframe = true
          continue
        }
        if (socket.bufferedAmount > MAX_SOCKET_BUFFER_BYTES) {
          waitingForKeyframe = true
          continue
        }
        if (waitingForKeyframe && value.keyframe !== true) continue

        waitingForKeyframe = false
        socket.send(encodeRemotePacket(value))
      }
    } finally {
      signal.removeEventListener('abort', cancelReader)
    }
  } finally {
    if (reader) {
      try {
        await reader.cancel()
      } catch (error) {
        if (!signal.aborted) onLog(`could not stop scrcpy video reader: ${error instanceof Error ? error.message : String(error)}`)
      }
      reader.releaseLock()
    }
    if (client) {
      try {
        await client.close()
      } catch (error) {
        onLog(`could not stop scrcpy server: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (adb) {
      try {
        await adb.close()
      } catch (error) {
        onLog(`could not close the ADB stream: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}
