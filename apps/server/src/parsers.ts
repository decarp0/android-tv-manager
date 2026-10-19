export type Device = {
  serial: string
  state: string
  model?: string
  product?: string
  device?: string
}

export type DiscoveredEndpoint = {
  host: string
  port: number
  service: 'connect' | 'pairing'
}

export type PackageInfo = {
  packageName: string
  apkPath?: string
  uid?: number
  installer?: string
  type: 'system' | 'user'
  state: 'enabled' | 'disabled'
  protected: boolean
}

export function parseDevices(output: string): Device[] {
  return output
    .split(/\r?\n/)
    .slice(1)
    .flatMap((line) => {
      const [serial, state, ...attributes] = line.trim().split(/\s+/)
      if (!serial || !state) return []
      const props = Object.fromEntries(
        attributes.map((attribute) => {
          const [key, ...value] = attribute.split(':')
          return [key, value.join(':')]
        }),
      )
      return [{
        serial,
        state,
        ...(props.model ? { model: props.model } : {}),
        ...(props.product ? { product: props.product } : {}),
        ...(props.device ? { device: props.device } : {}),
      }]
    })
}

export function parseMdnsServices(output: string): DiscoveredEndpoint[] {
  // shortcut: IPv6 mDNS endpoints stay hidden until ADB host and serial validation support them.
  return output
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.trim().match(/^adb-tls-(connect|pairing)\._tcp\s+(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/)
      if (!match) return []
      const [, service, host, rawPort] = match
      if (service !== 'connect' && service !== 'pairing') return []
      const port = Number(rawPort)
      if (host.split('.').some((part) => Number(part) > 255) || port < 1 || port > 65535) return []
      const serviceType: DiscoveredEndpoint['service'] = service === 'connect' ? 'connect' : 'pairing'
      return [{ host, port, service: serviceType }]
    })
    .sort((a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service) || a.port - b.port)
}

export function parsePackages(
  allOutput: string,
  disabledOutput: string,
  systemOutput: string,
  userOutput: string,
  protectedPackages: ReadonlySet<string>,
): PackageInfo[] {
  const disabled = new Set(packageNames(disabledOutput))
  const system = new Set(packageNames(systemOutput))
  const user = new Set(packageNames(userOutput))

  return allOutput
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.trim().match(/^package:(?:(.*?)=)?([A-Za-z0-9_.]+)(?:\s+(.*))?$/)
      if (!match) return []
      const [, apkPath, packageName, metadata = ''] = match
      const uid = metadata.match(/(?:^|\s)uid:(\d+)/)?.[1]
      const installer = metadata.match(/(?:^|\s)installer=([^\s]+)/)?.[1]
      return [{
        packageName,
        ...(apkPath ? { apkPath } : {}),
        ...(uid ? { uid: Number(uid) } : {}),
        ...(installer && installer !== 'null' ? { installer } : {}),
        type: system.has(packageName) ? 'system' as const : user.has(packageName) ? 'user' as const : 'system' as const,
        state: disabled.has(packageName) ? 'disabled' as const : 'enabled' as const,
        protected: protectedPackages.has(packageName),
      }]
    })
    .sort((a, b) => a.packageName.localeCompare(b.packageName))
}

function packageNames(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^package:([A-Za-z0-9_.]+)$/)?.[1])
    .filter((name): name is string => Boolean(name))
}
