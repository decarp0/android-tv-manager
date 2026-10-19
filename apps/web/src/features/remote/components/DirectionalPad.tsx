import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, LoaderCircle } from 'lucide-react'
import type { RemoteKey } from '@/lib/api'
import { Button } from '@/components/ui/button'

const directionalKeys = [
  { key: 'up', label: 'Up', icon: ArrowUp, className: 'remote-key-up' },
  { key: 'left', label: 'Left', icon: ArrowLeft, className: 'remote-key-left' },
  { key: 'ok', label: 'OK', icon: Check, className: 'remote-key-center' },
  { key: 'right', label: 'Right', icon: ArrowRight, className: 'remote-key-right' },
  { key: 'down', label: 'Down', icon: ArrowDown, className: 'remote-key-down' },
] satisfies { key: RemoteKey; label: string; icon: typeof ArrowUp; className: string }[]

export function DirectionalPad({
  disabled,
  sendingKey,
  onSendKey,
}: {
  disabled: boolean
  sendingKey: RemoteKey | null
  onSendKey: (key: RemoteKey) => void
}) {
  return (
    <div aria-label="Directional pad" className="remote-pad" role="group">
      {directionalKeys.map(({ key, label, icon: Icon, className }) => (
        <Button
          aria-label={label}
          className={`remote-key ${className}`}
          disabled={disabled}
          key={key}
          onClick={() => onSendKey(key)}
          size="icon-lg"
          variant={key === 'ok' ? 'default' : 'outline'}
        >
          {sendingKey === key ? <LoaderCircle className="animate-spin" /> : <Icon />}
        </Button>
      ))}
    </div>
  )
}
