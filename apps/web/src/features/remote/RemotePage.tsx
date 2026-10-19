import { useEffect, useRef, useState } from 'react'
import { ScrcpyVideoCodecId, type ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy'
import { BitmapVideoFrameRenderer, WebCodecsVideoDecoder, WebGLVideoFrameRenderer } from '@yume-chan/scrcpy-decoder-webcodecs'
import { CircleHelp, LoaderCircle, Play, RefreshCw, Square, Tv } from 'lucide-react'
import type { RemoteKey } from '@/lib/api'
import { api, apiBlob } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { decodeRemotePacket } from './remote-utils'
import { RemoteNavigation } from './components/RemoteNavigation'

export function RemotePage({
  onNotice,
  ready,
  serial,
  token,
}: {
  onNotice: (message: string) => void
  ready: boolean
  serial: string
  token: string
}) {
  const [screen, setScreen] = useState<{ url: string; capturedAt: number } | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [sendingKey, setSendingKey] = useState<RemoteKey | null>(null)
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle')
  const [streamError, setStreamError] = useState('')
  const captureController = useRef<AbortController | null>(null)
  const streamSocket = useRef<WebSocket | null>(null)
  const decoder = useRef<WebCodecsVideoDecoder | null>(null)
  const decoderWriter = useRef<WritableStreamDefaultWriter<ScrcpyMediaStreamPacket> | null>(null)
  const intentionalStreamClose = useRef(true)
  const canvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    return () => {
      captureController.current?.abort()
      intentionalStreamClose.current = true
      streamSocket.current?.close(1000, 'Remote view closed')
      streamSocket.current = null
      const writer = decoderWriter.current
      decoderWriter.current = null
      if (writer) void writer.abort().catch(() => undefined)
      decoder.current?.dispose()
      decoder.current = null
    }
  }, [])

  useEffect(() => {
    if (ready) return
    intentionalStreamClose.current = true
    streamSocket.current?.close(1000, 'Device disconnected')
  }, [ready])

  useEffect(() => {
    if (!screen) return
    return () => URL.revokeObjectURL(screen.url)
  }, [screen])

  function disposeDecoder() {
    const writer = decoderWriter.current
    decoderWriter.current = null
    if (writer) void writer.abort().catch(() => undefined)
    decoder.current?.dispose()
    decoder.current = null
  }

  function failStream(message: string) {
    intentionalStreamClose.current = true
    setStreamError(message)
    setStreamStatus('error')
    const socket = streamSocket.current
    streamSocket.current = null
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close()
    disposeDecoder()
  }

  function startStream() {
    if (!WebCodecsVideoDecoder.isSupported) {
      setStreamError('This browser does not support WebCodecs. Try a recent Chromium-based browser.')
      setStreamStatus('error')
      return
    }

    onNotice('')
    setStreamError('')
    setStreamStatus('connecting')
    intentionalStreamClose.current = false
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}&channel=remote&serial=${encodeURIComponent(serial)}`,
    )
    streamSocket.current = socket
    socket.binaryType = 'arraybuffer'
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        let message: { type?: string; message?: string; codec?: number }
        try {
          message = JSON.parse(event.data) as typeof message
        } catch {
          failStream('The stream server sent an invalid response.')
          return
        }

        if (message.type === 'error') {
          failStream(message.message ?? 'The live stream could not start.')
          return
        }
        if (message.type !== 'ready') return
        if (message.codec !== ScrcpyVideoCodecId.H264) {
          failStream('The device selected an unsupported video codec.')
          return
        }

        try {
          if (!canvas.current) throw new Error('The video display is not ready.')
          const renderer = WebGLVideoFrameRenderer.isSupported
            ? new WebGLVideoFrameRenderer(canvas.current)
            : new BitmapVideoFrameRenderer(canvas.current)
          const nextDecoder = new WebCodecsVideoDecoder({
            codec: ScrcpyVideoCodecId.H264,
            renderer,
          })
          decoder.current = nextDecoder
          decoderWriter.current = nextDecoder.writable.getWriter()
          setStreamStatus('live')
        } catch (error) {
          failStream(error instanceof Error ? error.message : String(error))
        }
        return
      }

      if (!(event.data instanceof ArrayBuffer)) {
        failStream('The stream server sent an unsupported video packet.')
        return
      }
      const packet = decodeRemotePacket(event.data)
      const writer = decoderWriter.current
      if (!packet || !writer) {
        failStream('The live stream sent an invalid video packet.')
        return
      }
      void writer.write(packet).catch((error: unknown) => {
        failStream(error instanceof Error ? error.message : String(error))
      })
    }
    socket.onclose = () => {
      const wasCurrent = streamSocket.current === socket
      if (wasCurrent) {
        streamSocket.current = null
        disposeDecoder()
      }
      if (wasCurrent && !intentionalStreamClose.current) {
        setStreamError('The live stream disconnected. Start it again to reconnect.')
        setStreamStatus('error')
      }
    }
    socket.onerror = () => {
      if (streamSocket.current === socket) failStream('Could not connect to the live stream.')
    }
  }

  function stopStream() {
    intentionalStreamClose.current = true
    streamSocket.current?.close(1000, 'Stream stopped')
    streamSocket.current = null
    disposeDecoder()
    setStreamError('')
    setStreamStatus('idle')
  }

  async function captureScreen() {
    const controller = new AbortController()
    captureController.current = controller
    setCapturing(true)
    onNotice('')
    try {
      const blob = await apiBlob(token, `/api/devices/screenshot?serial=${encodeURIComponent(serial)}`, {
        signal: controller.signal,
      })
      setScreen({ url: URL.createObjectURL(blob), capturedAt: Date.now() })
    } catch (error) {
      if (!controller.signal.aborted) onNotice(error instanceof Error ? error.message : String(error))
    } finally {
      if (captureController.current === controller) captureController.current = null
      if (!controller.signal.aborted) setCapturing(false)
    }
  }

  async function sendKey(key: RemoteKey) {
    setSendingKey(key)
    onNotice('')
    try {
      await api<{ key: RemoteKey }>(token, '/api/devices/input', {
        method: 'POST',
        body: JSON.stringify({ serial, key }),
      })
    } catch (error) {
      onNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setSendingKey(null)
    }
  }

  const controlsDisabled = !ready || !token || sendingKey !== null
  const screenIsCurrent = Boolean(screen && ready)
  const visibleStreamStatus = ready ? streamStatus : 'idle'

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <h1>Remote</h1>
          <p>Watch the live Android TV screen and navigate over Wi-Fi ADB.</p>
        </div>
      </div>
      <div className="remote-layout">
        <Card className="remote-screen-card">
          <CardHeader className="remote-card-header">
            <div>
              <CardTitle>Device screen</CardTitle>
              <CardDescription>{ready ? serial : 'No connected device'}</CardDescription>
            </div>
            <div className="remote-stream-actions">
                {visibleStreamStatus === 'live' && <Badge variant="secondary"><span className="status-dot status-dot-online" />Live</Badge>}
                {visibleStreamStatus === 'connecting' && <Badge variant="outline"><LoaderCircle className="animate-spin" data-icon="inline-start" />Starting</Badge>}
              <Button
                  disabled={!ready || !token || visibleStreamStatus === 'connecting'}
                  onClick={visibleStreamStatus === 'live' ? stopStream : startStream}
                size="sm"
                  variant={visibleStreamStatus === 'live' ? 'outline' : 'default'}
              >
                  {visibleStreamStatus === 'connecting'
                  ? <LoaderCircle className="animate-spin" data-icon="inline-start" />
                    : visibleStreamStatus === 'live'
                    ? <Square data-icon="inline-start" />
                    : <Play data-icon="inline-start" />}
                  {visibleStreamStatus === 'connecting' ? 'Starting…' : visibleStreamStatus === 'live' ? 'Stop stream' : 'Start live view'}
              </Button>
              <Button disabled={!ready || !token || capturing} onClick={() => void captureScreen()} size="sm" variant="outline">
                {capturing ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                {capturing ? 'Capturing…' : screenIsCurrent ? 'Capture still' : 'Screenshot'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="remote-screen-content">
            {visibleStreamStatus === 'error' && streamError && <div className="remote-stream-error" role="alert">{streamError}</div>}
            {visibleStreamStatus === 'live' || visibleStreamStatus === 'connecting' ? (
              <>
                <div className="remote-screen-frame">
                  <canvas
                    aria-label={`Live video of Android TV device ${serial}`}
                    className="remote-screen-image remote-stream-canvas"
                    ref={canvas}
                    role="img"
                  />
                  {visibleStreamStatus === 'connecting' && <div className="remote-stream-placeholder"><LoaderCircle className="animate-spin" />Connecting to the TV…</div>}
                </div>
                <div aria-live="polite" className="remote-screen-caption">
                  <span>{visibleStreamStatus === 'live' ? 'Live H.264 video' : 'Starting scrcpy stream'}</span>
                  <span>Up to 1280 px · 30 fps · no audio</span>
                </div>
              </>
            ) : screenIsCurrent && screen ? (
              <>
                <div className="remote-screen-frame">
                  <img alt={`Screenshot of Android TV device ${serial}`} className="remote-screen-image" src={screen.url} />
                </div>
                <div aria-live="polite" className="remote-screen-caption">
                  <span>Captured {new Date(screen.capturedAt).toLocaleTimeString()}</span>
                  <span>Still image · manual refresh</span>
                </div>
              </>
            ) : (
              <Empty className="remote-empty">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Tv aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>{ready ? 'No screen view yet' : 'Connect a device to start'}</EmptyTitle>
                  <EmptyDescription>
                    {ready
                      ? 'Start the live view or capture a still screenshot.'
                      : 'Connect to an Android device over Wi-Fi ADB, then return here.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
        <RemoteNavigation
          disabled={controlsDisabled}
          onSendKey={(key) => void sendKey(key)}
          ready={ready}
          sendingKey={sendingKey}
          serial={serial}
        />
      </div>
      <div className="helper-note"><CircleHelp aria-hidden="true" /><span>Screen capture is on demand, not live video. Android may show protected video or other secure surfaces as black. The controls send only the listed D-pad, OK, Back and Home key events.</span></div>
    </div>
  )
}
