import { useAppContext } from '@/app/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { eventTone, formatTime } from '@/lib/console-utils'
import { ArrowDownToLine, Circle, Play, Search, Square, Terminal, X } from 'lucide-react'

export function ConsolePanel() {
  const {
    serial, consolePaused, setConsolePaused, consolePausedRef, exportConsole,
    setEvents, filter, setFilter, visibleEvents, consoleAutoScrollRef, scrollRef,
    connectedDevices,
  } = useAppContext()

  return (
    <aside className="console-panel" aria-label="ADB console">
      <div className="console-header">
        <div>
          <div className="console-title"><span className="console-indicator" />Live console</div>
          <div className="console-subtitle">{serial || 'Waiting for device'}</div>
        </div>
        <div className="console-actions">
          <Button
            aria-label={consolePaused ? 'Resume console' : 'Pause console'}
            onClick={() => {
              const paused = !consolePaused
              consolePausedRef.current = paused
              setConsolePaused(paused)
            }}
            size="icon-sm"
            variant="ghost"
          >
            {consolePaused ? <Play /> : <Square />}
          </Button>
          <Button aria-label="Export console log" onClick={exportConsole} size="icon-sm" variant="ghost"><ArrowDownToLine /></Button>
          <Button aria-label="Clear console" onClick={() => setEvents([])} size="icon-sm" variant="ghost"><X /></Button>
        </div>
      </div>
      <div className="console-search">
        <Search aria-hidden="true" />
        <Input aria-label="Filter console output" onChange={(event) => setFilter(event.target.value)} placeholder="Filter output..." value={filter} />
      </div>
      <div className="console-meta">
        <span>{visibleEvents.length} events</span>
        {consolePaused && <Badge variant="secondary">PAUSED</Badge>}
      </div>
      <div
        aria-label="Console output"
        className="console-events"
        onScroll={(event) => {
          consoleAutoScrollRef.current = event.currentTarget.scrollTop < 24
        }}
        ref={scrollRef}
        role="region"
        tabIndex={0}
      >
        {visibleEvents.length === 0 ? (
          <div className="console-empty">
            <Terminal aria-hidden="true" />
            <strong>No console output yet</strong>
            <span>ADB commands and device logs appear here.</span>
          </div>
        ) : visibleEvents.map((event) => (
          <div className="console-event" key={event.id}>
            <span className="console-time">{formatTime(event.ts)}</span>
            <span className={`console-kind console-kind-${event.kind}`}>{event.kind}</span>
            <pre className={eventTone(event)}>{event.text.trimEnd()}</pre>
          </div>
        ))}
      </div>
      <div className="console-footer"><span><Circle aria-hidden="true" /> ADB events stream</span><span>{connectedDevices.length} device{connectedDevices.length === 1 ? '' : 's'}</span></div>
    </aside>
  )
}
