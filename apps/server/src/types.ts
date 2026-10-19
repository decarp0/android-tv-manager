export type ConsoleEvent = {
  id: string
  ts: number
  kind: 'command' | 'stdout' | 'stderr' | 'exit' | 'info' | 'error' | 'logcat'
  serial?: string
  text: string
  exitCode?: number
  durationMs?: number
  source: 'ui' | 'stream' | 'system'
}

export type HistoryEntry = {
  id: string
  ts: number
  serial: string
  packageName: string
  action: 'disable' | 'enable' | 'uninstall'
  previousState: 'enabled' | 'disabled'
  undone: boolean
}
