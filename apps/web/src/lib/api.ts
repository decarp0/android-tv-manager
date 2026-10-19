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

export type HistoryEntry = {
  id: string
  ts: number
  serial: string
  packageName: string
  action: 'disable' | 'enable' | 'uninstall'
  previousState: 'enabled' | 'disabled'
  undone: boolean
}

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

export type RemoteKey = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'home'

export function readTokenFromUrl(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('token') ?? sessionStorage.getItem('tv-debloat-token') ?? ''
}

export function persistTokenAndCleanUrl(token: string): void {
  if (token) sessionStorage.setItem('tv-debloat-token', token)
  const url = new URL(window.location.href)
  if (url.searchParams.has('token')) {
    url.searchParams.delete('token')
    window.history.replaceState({}, '', url)
  }
}

export async function api<T>(token: string, endpoint: string, init?: RequestInit): Promise<T> {
  if (!token) throw new Error('Open the local address printed in the server terminal to authenticate.')
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...(init?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
  const payload = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`)
  return payload
}

export async function apiBlob(token: string, endpoint: string, init?: RequestInit): Promise<Blob> {
  if (!token) throw new Error('Open the local address printed in the server terminal to authenticate.')
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error ?? `Request failed (${response.status}).`)
  }
  if (response.headers.get('content-type')?.split(';')[0].trim() !== 'image/png') {
    throw new Error('The device did not return a PNG screenshot.')
  }
  return response.blob()
}
