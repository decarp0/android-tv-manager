import { execFile } from 'node:child_process'
import { createConnection } from 'node:net'
import { networkInterfaces } from 'node:os'
import { promisify } from 'node:util'
import { parseMdnsServices, type DiscoveredEndpoint } from './parsers.js'

type NetworkAddress = {
  address: string
  family: string | number
  internal: boolean
  netmask: string
}

type NetworkInterfaces = Record<string, readonly NetworkAddress[] | undefined>

const MAX_HOSTS_PER_SUBNET = 254
const MAX_SCAN_HOSTS = 512
const SCAN_CONCURRENCY = 32
const TCP_TIMEOUT_MS = 500
const execFileAsync = promisify(execFile)

export function parseDefaultRouteInterface(output: string, platform: NodeJS.Platform): string | undefined {
  if (platform === 'darwin') return output.match(/^\s*interface:\s*(\S+)\s*$/m)?.[1]
  if (platform === 'linux') return output.match(/\bdev\s+(\S+)/)?.[1]
  if (platform === 'win32') return output.trim() || undefined
  return undefined
}

export async function getDefaultRouteInterface(platform = process.platform): Promise<string> {
  let command: string
  let args: string[]
  switch (platform) {
    case 'darwin':
      command = 'route'
      args = ['-n', 'get', 'default']
      break
    case 'linux':
      command = 'ip'
      args = ['-o', 'route', 'show', 'default']
      break
    case 'win32':
      command = 'powershell.exe'
      args = [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric, InterfaceMetric | Select-Object -First 1 -ExpandProperty InterfaceAlias)",
      ]
      break
    default:
      throw new Error(`Automatic network discovery is not supported on ${platform}.`)
  }
  const { stdout } = await execFileAsync(command, args, { timeout: 3000, windowsHide: true })
  const name = parseDefaultRouteInterface(stdout, platform)
  if (!name) throw new Error('Could not identify the default-route network interface.')
  return name
}

export function getPrivateIPv4ScanTargets(
  interfaceName: string,
  interfaces: NetworkInterfaces = networkInterfaces(),
): string[] {
  const hosts = new Set<string>()
  const addresses = interfaces[interfaceName] ?? []
  const localAddresses = new Set(
    addresses
      .filter((networkInterface) => networkInterface.family === 'IPv4' || networkInterface.family === 4)
      .map((networkInterface) => ipv4ToNumber(networkInterface.address))
      .filter((address): address is number => address !== undefined),
  )

  // shortcut: skip subnets over 254 hosts and cap at 512 probes, until larger LAN discovery is required.
  for (const networkInterface of addresses) {
    const address = ipv4ToNumber(networkInterface.address)
    const mask = ipv4ToNumber(networkInterface.netmask)
    if (
      networkInterface.internal
      || (networkInterface.family !== 'IPv4' && networkInterface.family !== 4)
      || address === undefined
      || mask === undefined
      || !isPrivateIPv4(networkInterface.address)
    ) continue

    const network = (address & mask) >>> 0
    const broadcast = (network | (~mask >>> 0)) >>> 0
    const hostCount = broadcast - network - 1
    if (hostCount < 1 || hostCount > MAX_HOSTS_PER_SUBNET) continue

    for (let host = network + 1; host < broadcast; host += 1) {
      if (!localAddresses.has(host)) hosts.add(numberToIPv4(host))
      if (hosts.size >= MAX_SCAN_HOSTS) return [...hosts]
    }
  }

  return [...hosts]
}

export async function discoverAdbEndpoints(
  mdnsOutput: string,
  hosts: readonly string[],
  port = 5555,
): Promise<DiscoveredEndpoint[]> {
  const endpoints = new Map<string, DiscoveredEndpoint>()
  for (const endpoint of parseMdnsServices(mdnsOutput)) {
    endpoints.set(endpointKey(endpoint), endpoint)
  }

  const openHosts = await scanTcpPort(hosts, port)
  for (const host of openHosts) {
    const endpoint: DiscoveredEndpoint = { host, port, service: 'connect' }
    endpoints.set(endpointKey(endpoint), endpoint)
  }

  return [...endpoints.values()].sort(
    (a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service) || a.port - b.port,
  )
}

async function scanTcpPort(hosts: readonly string[], port: number): Promise<string[]> {
  const candidates = [...new Set(hosts)]
  const openHosts: string[] = []
  let nextCandidate = 0

  async function scanNext() {
    while (nextCandidate < candidates.length) {
      const host = candidates[nextCandidate]
      nextCandidate += 1
      if (await isTcpPortOpen(host, port)) openHosts.push(host)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, candidates.length) }, () => scanNext()),
  )
  return openHosts
}

function isTcpPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, family: 4 })
    let finished = false
    const timeout = setTimeout(() => finish(false), TCP_TIMEOUT_MS)

    function finish(open: boolean) {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      socket.destroy()
      resolve(open)
    }

    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}

function endpointKey(endpoint: DiscoveredEndpoint): string {
  return `${endpoint.service}:${endpoint.host}:${endpoint.port}`
}

function ipv4ToNumber(value: string): number | undefined {
  const octets = value.split('.')
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)) {
    return undefined
  }
  return octets.reduce((result, octet) => result * 256 + Number(octet), 0)
}

function isPrivateIPv4(value: string): boolean {
  const [first, second] = value.split('.').map(Number)
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
}

function numberToIPv4(value: number): string {
  return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`
}
