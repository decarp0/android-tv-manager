import { Activity, ChevronRight, Gauge, HardDrive, Package, Plug, Wifi } from 'lucide-react'
import type { Device } from '@/lib/api'
import type { Section } from '@/app/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MetricCard } from './MetricCard'

export function Overview({
  connectedDevices,
  onNavigate,
  selectedDevice,
  packageCount,
}: {
  connectedDevices: Device[]
  onNavigate: (section: Section) => void
  selectedDevice?: Device
  packageCount: number
}) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LOCAL DEVICE MANAGEMENT</div>
          <h1>Device overview</h1>
          <p>Inspect, troubleshoot and safely manage your Android TV box over Wi-Fi.</p>
        </div>
        <Badge variant={selectedDevice?.state === 'device' ? 'secondary' : 'outline'}>
          <span className={`status-dot ${selectedDevice?.state === 'device' ? 'status-dot-online' : ''}`} />
          {selectedDevice?.state === 'device' ? 'Connected' : 'Offline'}
        </Badge>
      </div>
      <div className="metric-grid">
        <MetricCard icon={Wifi} label="Wi-Fi ADB" value={selectedDevice?.serial ?? 'Not connected'} detail={selectedDevice ? selectedDevice.state : 'Connect using the address above'} />
        <MetricCard icon={Package} label="Packages" value={packageCount ? String(packageCount) : '—'} detail="User 0 installed apps" />
        <MetricCard icon={Activity} label="Log stream" value="Ready" detail="Start logcat from Debug" />
      </div>
      <div className="overview-grid">
        <Card className="welcome-card">
          <CardHeader>
            <div className="welcome-icon"><Gauge aria-hidden="true" /></div>
            <CardTitle>Work directly on the device</CardTitle>
            <CardDescription>Connection, package controls and logs are available now. Changes run through ADB and are shown in the console.</CardDescription>
          </CardHeader>
          <CardContent className="welcome-actions">
            <Button onClick={() => onNavigate('Apps')}><Package data-icon="inline-start" />Manage apps</Button>
            <Button onClick={() => onNavigate('Logcat')} variant="outline"><Activity data-icon="inline-start" />Open logcat</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Device session</CardTitle>
            <CardDescription>ADB-over-Wi-Fi status</CardDescription>
          </CardHeader>
          <CardContent className="session-list">
            <div><span>Active target</span><strong>{selectedDevice?.serial ?? 'None'}</strong></div>
            <Separator />
            <div><span>Model</span><strong>{selectedDevice?.model ?? 'Waiting for device details'}</strong></div>
            <Separator />
            <div><span>Discovered devices</span><strong>{connectedDevices.length}</strong></div>
          </CardContent>
        </Card>
      </div>
      <div className="section-title-row"><div><h2>Next up</h2><p>Start with a connected device, then inspect its apps or live logs.</p></div><Button onClick={() => onNavigate('Connection')} variant="ghost">Connection settings <ChevronRight data-icon="inline-end" /></Button></div>
      <div className="next-grid">
        <button className="next-card" onClick={() => onNavigate('Connection')} type="button"><Plug aria-hidden="true" /><span><strong>Connect over Wi-Fi</strong><small>ADB on port 5555</small></span><ChevronRight aria-hidden="true" /></button>
        <button className="next-card" onClick={() => onNavigate('Apps')} type="button"><HardDrive aria-hidden="true" /><span><strong>Review installed apps</strong><small>Disable or remove per user</small></span><ChevronRight aria-hidden="true" /></button>
        <button className="next-card" onClick={() => onNavigate('Logcat')} type="button"><Activity aria-hidden="true" /><span><strong>Debug an issue</strong><small>Stream Android logcat</small></span><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  )
}
