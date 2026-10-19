import { ChevronRight, LoaderCircle, Plug, RefreshCw, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { endpointId } from '@/lib/console-utils'
import { useAppContext } from '@/app/useAppContext'

export function DeviceHeader() {
  const {
    section, token, busy, discoverEndpoints, connectDiscoveredDevice,
    discoveredEndpoints, discoveredSelection, selectDiscoveredEndpoint,
    selectedEndpoint, discoveryMessage,
  } = useAppContext()

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Console</span><ChevronRight aria-hidden="true" /><strong>{section}</strong>
      </div>
      <div className="header-connect-wrap">
        <form className="header-connect" onSubmit={connectDiscoveredDevice}>
          <Wifi aria-hidden="true" />
          <Select
            onValueChange={(value) => selectDiscoveredEndpoint(value ?? '')}
            value={discoveredSelection || null}
          >
            <SelectTrigger className="header-endpoint-select" aria-label="Discovered ADB endpoints">
              <SelectValue placeholder={discoveredEndpoints.length ? 'Choose a device' : 'Scan for devices'} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {discoveredEndpoints.map((endpoint) => (
                  <SelectItem key={endpointId(endpoint)} value={endpointId(endpoint)}>
                    {endpoint.host}:{endpoint.port} · {endpoint.service === 'connect' ? 'Connect' : 'Pair'}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button disabled={!token || busy === 'discover'} onClick={() => void discoverEndpoints()} size="sm" type="button" variant="outline">
            {busy === 'discover' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            {busy === 'discover' ? 'Scanning…' : 'Scan'}
          </Button>
          <Button disabled={!token || busy === 'connect' || selectedEndpoint?.service !== 'connect'} size="sm" type="submit">
            {busy === 'connect' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Plug data-icon="inline-start" />}
            Connect
          </Button>
        </form>
        {(discoveryMessage || selectedEndpoint?.service === 'pairing') && (
          <div className="header-discovery-status" role="status">
            {discoveryMessage || 'Pairing endpoints must be paired from Connection.'}
          </div>
        )}
      </div>
    </header>
  )
}
