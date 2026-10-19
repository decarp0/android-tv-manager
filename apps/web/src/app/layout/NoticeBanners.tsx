import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/app/useAppContext'

export function NoticeBanners() {
  const { notice, setNotice, token } = useAppContext()

  return (
    <>
      {notice && (
        <div className="notice" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{notice}</span>
          <Button aria-label="Dismiss message" onClick={() => setNotice('')} size="icon-sm" variant="ghost"><X /></Button>
        </div>
      )}
      {!token && (
        <div className="auth-banner">
          <ShieldCheck aria-hidden="true" />
          Open the one-time local URL printed by the server in the terminal to authenticate this browser session.
        </div>
      )}
    </>
  )
}
