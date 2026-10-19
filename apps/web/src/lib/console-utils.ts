import type { ConsoleEvent, DiscoveredEndpoint } from '@/lib/api'

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp)
}

export function eventTone(event: ConsoleEvent): string {
  if (event.kind === 'exit') return event.exitCode && event.exitCode !== 0 ? 'console-text-error' : 'console-text-exit'
  return `console-text-${event.kind}`
}

export function endpointId(endpoint: DiscoveredEndpoint): string {
  return `${endpoint.service}:${endpoint.host}:${endpoint.port}`
}

export const minConsoleWidth = 260
export const defaultConsoleWidth = 352

export function getMaxConsoleWidth(): number {
  const compact = window.innerWidth <= 1190
  const reservedWidth = compact ? 195 + 400 + 8 : 224 + 440 + 8
  return Math.max(minConsoleWidth, Math.min(560, window.innerWidth - reservedWidth))
}
