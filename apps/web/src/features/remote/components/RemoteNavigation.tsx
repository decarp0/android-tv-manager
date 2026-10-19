import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RemoteKey } from '@/lib/api'
import { DirectionalPad } from './DirectionalPad'
import { RemoteSystemControls } from './RemoteSystemControls'

export function RemoteNavigation({
  ready,
  serial,
  disabled,
  sendingKey,
  onSendKey,
}: {
  ready: boolean
  serial: string
  disabled: boolean
  sendingKey: RemoteKey | null
  onSendKey: (key: RemoteKey) => void
}) {
  return (
    <Card className="remote-controls-card">
      <CardHeader>
        <CardTitle>Navigation</CardTitle>
        <CardDescription>Send a single Android key event to the selected device.</CardDescription>
      </CardHeader>
      <CardContent className="remote-controls-content">
        <div className="remote-device-line">
          <span className={`status-dot ${ready ? 'status-dot-online' : ''}`} />
          <span>{ready ? serial : 'No connected device'}</span>
        </div>
        <DirectionalPad disabled={disabled} onSendKey={onSendKey} sendingKey={sendingKey} />
        <RemoteSystemControls disabled={disabled} onSendKey={onSendKey} sendingKey={sendingKey} />
      </CardContent>
    </Card>
  )
}
