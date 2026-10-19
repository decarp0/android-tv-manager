import {
  Activity, Command, FileClock, LayoutDashboard, Network, Package, Plug, Settings2, Tv, Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Section } from '@/app/types'
import { useAppContext } from '@/app/useAppContext'

const navItems: { label: Section; icon: typeof LayoutDashboard; group: 'workspace' | 'system' }[] = [
  { label: 'Overview', icon: LayoutDashboard, group: 'workspace' },
  { label: 'Connection', icon: Plug, group: 'workspace' },
  { label: 'Remote', icon: Tv, group: 'workspace' },
  { label: 'Apps', icon: Package, group: 'workspace' },
  { label: 'Logcat', icon: Activity, group: 'workspace' },
  { label: 'History', icon: FileClock, group: 'workspace' },
  { label: 'Network', icon: Network, group: 'system' },
  { label: 'Tools', icon: Wrench, group: 'system' },
  { label: 'Settings', icon: Settings2, group: 'system' },
]

export function AppSidebar() {
  const { section, setSection, packages, selectedDevice } = useAppContext()

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Command aria-hidden="true" /></div>
        <div>
          <div className="brand-name">Field Console</div>
          <div className="brand-caption">ANDROID TV TOOLKIT</div>
        </div>
      </div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="nav-list">
        {navItems.filter((item) => item.group === 'workspace').map(({ label, icon: Icon }) => (
          <button
            aria-current={section === label ? 'page' : undefined}
            className={`nav-item ${section === label ? 'nav-item-active' : ''}`}
            key={label}
            onClick={() => setSection(label)}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {label === 'Apps' && <span className="nav-count">{packages.length || ''}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-label sidebar-label-spaced">SYSTEM</div>
      <nav aria-label="System navigation" className="nav-list">
        {navItems.filter((item) => item.group === 'system').map(({ label, icon: Icon }) => (
          <button
            aria-current={section === label ? 'page' : undefined}
            className={`nav-item ${section === label ? 'nav-item-active' : ''}`}
            key={label}
            onClick={() => setSection(label)}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Separator />
        <div className="connection-mini">
          <span className={`status-dot ${selectedDevice?.state === 'device' ? 'status-dot-online' : ''}`} />
          <span className="connection-mini-label">{selectedDevice?.state === 'device' ? 'Device connected' : 'No active device'}</span>
        </div>
        <div className="sidebar-version"><span>LOCAL SESSION</span><Badge variant="outline">v0.1</Badge></div>
      </div>
    </aside>
  )
}
