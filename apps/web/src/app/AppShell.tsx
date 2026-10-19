import type { CSSProperties } from 'react'
import { useAppContext } from './useAppContext'
import { AppSidebar } from './layout/AppSidebar'
import { ConsolePanel } from './layout/ConsolePanel'
import { ConsoleResizer } from './layout/ConsoleResizer'
import { DeviceHeader } from './layout/DeviceHeader'
import { NoticeBanners } from './layout/NoticeBanners'
import { PageContent } from './layout/PageContent'
import { UninstallDialog } from './layout/UninstallDialog'

export function AppShell() {
  const { consoleWidth } = useAppContext()

  return (
    <main className="console-shell" style={{ '--console-width': `${consoleWidth}px` } as CSSProperties}>
      <AppSidebar />
      <section className="workspace">
        <DeviceHeader />
        <NoticeBanners />
        <div className="content-area"><PageContent /></div>
      </section>
      <ConsoleResizer />
      <ConsolePanel />
      <UninstallDialog />
    </main>
  )
}
