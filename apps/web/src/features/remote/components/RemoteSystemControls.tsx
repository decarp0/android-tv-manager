import { ArrowLeft, Home, LoaderCircle } from 'lucide-react'
import type { RemoteKey } from '@/lib/api'
import { Button } from '@/components/ui/button'

export function RemoteSystemControls({
  disabled,
  sendingKey,
  onSendKey,
}: {
  disabled: boolean
  sendingKey: RemoteKey | null
  onSendKey: (key: RemoteKey) => void
}) {
  return (
    <div className="remote-system-controls">
      <Button disabled={disabled} onClick={() => onSendKey('back')} variant="outline">
        {sendingKey === 'back' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <ArrowLeft data-icon="inline-start" />}
        Back
      </Button>
      <Button disabled={disabled} onClick={() => onSendKey('home')} variant="outline">
        {sendingKey === 'home' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Home data-icon="inline-start" />}
        Home
      </Button>
    </div>
  )
}
