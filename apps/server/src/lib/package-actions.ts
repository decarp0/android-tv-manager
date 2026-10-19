import type { HistoryEntry } from '../types.js'

export function packageActionArgs(action: HistoryEntry['action'], packageName: string): string[] {
  switch (action) {
    case 'disable':
      return ['shell', 'pm', 'disable-user', '--user', '0', packageName]
    case 'enable':
      return ['shell', 'pm', 'enable', '--user', '0', packageName]
    case 'uninstall':
      return ['shell', 'pm', 'uninstall', '-k', '--user', '0', packageName]
  }
}
