import type { FormEvent } from 'react'
import { CircleHelp, LoaderCircle, Plug, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import type { Device } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeading } from '@/components/PageHeading'

export function ConnectionPage({
  devices,
  host,
  onConnect,
  onDisconnect,
  onHostChange,
  onSelect,
  onRefresh,
  serial,
  busy,
  token,
  port,
  onPortChange,
  pairingPort,
  onPairingPortChange,
  pairingCode,
  onPairingCodeChange,
  onPair,
}: {
  devices: Device[]
  host: string
  onConnect: (event: FormEvent<HTMLFormElement>) => void
  onDisconnect: (serial: string) => void
  onHostChange: (host: string) => void
  onSelect: (serial: string) => void
  onRefresh: () => void
  serial: string
  busy: string
  token: string
  port: string
  onPortChange: (port: string) => void
  pairingPort: string
  onPairingPortChange: (port: string) => void
  pairingCode: string
  onPairingCodeChange: (code: string) => void
  onPair: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="DEVICE ACCESS" title="Connection" description="Connect to an Android TV device that has ADB over network enabled." />
      <Card>
        <CardHeader>
          <CardTitle>Connect over Wi-Fi</CardTitle>
          <CardDescription>Use the device picker in the header, or enter an IP and port manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="connection-form" onSubmit={onConnect}>
            <label htmlFor="device-host">Device IP</label>
            <Input id="device-host" inputMode="decimal" onChange={(event) => onHostChange(event.target.value)} placeholder="192.168.1.50" value={host} />
            <span className="form-port">:</span>
            <Input aria-label="ADB connection port" className="connection-port" inputMode="numeric" max="65535" min="1" onChange={(event) => onPortChange(event.target.value)} type="number" value={port} />
            <Button disabled={!token || busy === 'connect'} type="submit"><Plug data-icon="inline-start" />Connect</Button>
            <Button disabled={busy === 'refresh'} onClick={onRefresh} type="button" variant="outline"><RefreshCw data-icon="inline-start" />Refresh</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pair this computer</CardTitle>
          <CardDescription>Android 11+ Wireless debugging can pair over Wi-Fi without USB. On the TV, open Developer options → Wireless debugging → Pair device with pairing code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="pair-form" onSubmit={onPair}>
            <label htmlFor="pairing-port">Pairing port</label>
            <Input id="pairing-port" inputMode="numeric" max="65535" min="1" onChange={(event) => onPairingPortChange(event.target.value)} placeholder="Shown on TV" type="number" value={pairingPort} />
            <label htmlFor="pairing-code">Pairing code</label>
            <Input autoComplete="one-time-code" id="pairing-code" inputMode="numeric" maxLength={6} onChange={(event) => onPairingCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" type="password" value={pairingCode} />
            <Button disabled={!token || busy === 'pair' || pairingCode.length !== 6 || !pairingPort} type="submit">
              {busy === 'pair' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}
              Pair device
            </Button>
          </form>
          <p className="pair-help">After pairing, use the separate connection port shown on the Wireless debugging screen above.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ADB devices</CardTitle>
          <CardDescription>Devices detected by the local ADB server. Unauthorized devices need approval on the TV.</CardDescription>
        </CardHeader>
        <CardContent className="table-card-content">
          <Table>
            <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.serial}>
                  <TableCell className="font-mono text-xs">{device.serial}</TableCell>
                  <TableCell>{device.model ?? device.product ?? '—'}</TableCell>
                  <TableCell><Badge variant={device.state === 'device' ? 'secondary' : 'outline'}>{device.state}</Badge></TableCell>
                  <TableCell className="text-right">
                    {device.serial.includes(':') && (
                      <div className="row-actions">
                        {device.state === 'device' && (
                          <Button disabled={device.serial === serial} onClick={() => onSelect(device.serial)} size="sm" variant="outline">
                            {device.serial === serial ? 'Active' : 'Use device'}
                          </Button>
                        )}
                        <Button disabled={busy === 'disconnect'} onClick={() => onDisconnect(device.serial)} size="sm" variant={device.serial === serial ? 'destructive' : 'outline'}><Unplug data-icon="inline-start" />Disconnect</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {devices.length === 0 && <TableRow><TableCell className="empty-table" colSpan={4}>No devices detected yet. Scan from the header or connect using the IP above.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="helper-note"><CircleHelp aria-hidden="true" /><span>Wireless debugging pairing persists until revoked on the TV. If the connection port changes, reconnect with the new port; port 5555 via <code>adb tcpip 5555</code> may reset after reboot.</span></div>
    </div>
  )
}
