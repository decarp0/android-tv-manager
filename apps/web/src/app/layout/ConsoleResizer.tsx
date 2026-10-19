import { getMaxConsoleWidth, minConsoleWidth } from '@/lib/console-utils'
import { useAppContext } from '@/app/useAppContext'

export function ConsoleResizer() {
  const { consoleWidth, setConsoleWidth, consoleResizeRef } = useAppContext()

  return (
    <div
      aria-label="Resize live console"
      aria-orientation="vertical"
      aria-valuemax={getMaxConsoleWidth()}
      aria-valuemin={minConsoleWidth}
      aria-valuenow={Math.min(consoleWidth, getMaxConsoleWidth())}
      aria-valuetext={`${Math.min(consoleWidth, getMaxConsoleWidth())} pixels`}
      className="console-resizer"
      onKeyDown={(event) => {
        const currentWidth = Math.min(consoleWidth, getMaxConsoleWidth())
        let nextWidth: number | null = null
        if (event.key === 'ArrowLeft') nextWidth = currentWidth + 16
        if (event.key === 'ArrowRight') nextWidth = currentWidth - 16
        if (event.key === 'Home') nextWidth = minConsoleWidth
        if (event.key === 'End') nextWidth = getMaxConsoleWidth()
        if (nextWidth !== null) {
          event.preventDefault()
          setConsoleWidth(Math.max(minConsoleWidth, Math.min(getMaxConsoleWidth(), nextWidth)))
        }
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        consoleResizeRef.current = {
          x: event.clientX,
          width: Math.min(consoleWidth, getMaxConsoleWidth()),
        }
      }}
      onPointerMove={(event) => {
        const drag = consoleResizeRef.current
        if (!drag) return
        setConsoleWidth(Math.max(minConsoleWidth, Math.min(getMaxConsoleWidth(), drag.width + drag.x - event.clientX)))
      }}
      onPointerUp={() => {
        consoleResizeRef.current = null
      }}
      onPointerCancel={() => {
        consoleResizeRef.current = null
      }}
      role="separator"
      tabIndex={0}
    />
  )
}
