import { ListFilter, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeading } from '@/components/PageHeading'

export function LogcatPage({ isRunning, onToggle, ready, serial }: { isRunning: boolean; onToggle: () => void; ready: boolean; serial: string }) {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="LIVE DIAGNOSTICS" title="Logcat" description="Stream Android system logs to the console panel. Use its filter to narrow output." />
      <Card>
        <CardHeader>
          <CardTitle>Live device log</CardTitle>
          <CardDescription>Raw logcat stream is shown in the right-hand console alongside ADB communication.</CardDescription>
        </CardHeader>
        <CardContent className="logcat-controls">
          <div className="logcat-device"><span className={`status-dot ${serial ? 'status-dot-online' : ''}`} />{serial || 'No device selected'}</div>
          <Button disabled={!ready} onClick={onToggle} variant={isRunning ? 'destructive' : 'default'}>
            {isRunning ? <Square data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {isRunning ? 'Stop stream' : 'Start logcat'}
          </Button>
        </CardContent>
      </Card>
      <div className="helper-note"><ListFilter aria-hidden="true" /><span>Filtering by level, tag, PID and crash buffer is planned. The console filter currently searches raw ADB output and log lines.</span></div>
    </div>
  )
}
