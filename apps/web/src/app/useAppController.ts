import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api, persistTokenAndCleanUrl, readTokenFromUrl, type ConsoleEvent, type Device, type DiscoveredEndpoint, type HistoryEntry, type PackageInfo } from '@/lib/api'
import { defaultConsoleWidth, endpointId } from '@/lib/console-utils'
import { optionalServiceHints, packageAssessment } from '@/features/apps/model'
import type { PackageAssessmentFilter, PackageStateFilter, PackageTypeFilter } from '@/features/apps/types'
import type { Section } from './types'

type PendingUninstall = { packageName: string; serial: string }
type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'tv-debloat-theme'

export function useAppController() {

  const [token] = useState(() => readTokenFromUrl())
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark')
  const [section, setSection] = useState<Section>('Overview')
  const [devices, setDevices] = useState<Device[]>([])
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<DiscoveredEndpoint[]>([])
  const [discoveredSelection, setDiscoveredSelection] = useState('')
  const [discoveryMessage, setDiscoveryMessage] = useState('')
  const [serial, setSerial] = useState('')
  const [host, setHost] = useState(() => localStorage.getItem('tv-debloat-host') ?? '')
  const [port, setPort] = useState('5555')
  const [pairingPort, setPairingPort] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [events, setEvents] = useState<ConsoleEvent[]>([])
  const [filter, setFilter] = useState('')
  const [packageSearch, setPackageSearch] = useState('')
  const [packageTypeFilter, setPackageTypeFilter] = useState<PackageTypeFilter>('all')
  const [packageStateFilter, setPackageStateFilter] = useState<PackageStateFilter>('all')
  const [packageAssessmentFilter, setPackageAssessmentFilter] = useState<PackageAssessmentFilter>('all')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [pendingUninstall, setPendingUninstall] = useState<PendingUninstall | null>(null)
  const [logcatRunning, setLogcatRunning] = useState(false)
  const [consolePaused, setConsolePaused] = useState(false)
  const [consoleWidth, setConsoleWidth] = useState(defaultConsoleWidth)
  const scrollRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const consolePausedRef = useRef(false)
  const consoleAutoScrollRef = useRef(true)
  const consoleResizeRef = useRef<{ x: number; width: number } | null>(null)
  useEffect(() => {
    persistTokenAndCleanUrl(token)
  }, [token])

  useEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#111820' : '#f1f5f6')
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  const selectedDevice = devices.find((device) => device.serial === serial)
  const selectedEndpoint = discoveredEndpoints.find((endpoint) => endpointId(endpoint) === discoveredSelection)
  const isDeviceReady = selectedDevice?.state === 'device'
  const connectedDevices = devices.filter((device) => device.state === 'device' && device.serial.includes(':'))
  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase()
    return packages.filter((item) => {
      const searchableText = [
        item.packageName,
        item.installer,
        optionalServiceHints.get(item.packageName),
      ].join(' ').toLowerCase()
      return (!query || searchableText.includes(query))
        && (packageTypeFilter === 'all' || item.type === packageTypeFilter)
        && (packageStateFilter === 'all' || item.state === packageStateFilter)
        && (packageAssessmentFilter === 'all' || packageAssessment(item) === packageAssessmentFilter)
    })
  }, [packages, packageSearch, packageTypeFilter, packageStateFilter, packageAssessmentFilter])
  const visibleEvents = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return events.filter((event) => !query || event.text.toLowerCase().includes(query) || event.kind.includes(query)).reverse()
  }, [events, filter])

  const refreshDevices = useCallback(async () => {
    try {
      const list = await api<Device[]>(token, '/api/devices')
      setDevices(list)
      setSerial((current) => {
        if (current && list.some((item) => item.serial === current)) return current
        return list.find((item) => item.state === 'device' && item.serial.includes(':'))?.serial ?? ''
      })
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }, [token])

  async function discoverEndpoints() {
    setBusy('discover')
    setDiscoveryMessage('')
    try {
      const endpoints = await api<DiscoveredEndpoint[]>(token, '/api/devices/discover')
      setDiscoveredEndpoints(endpoints)
      setDiscoveredSelection('')
      if (endpoints.length === 0) {
        setDiscoveryMessage('No Wireless debugging or TCP 5555 endpoints found on the active local network. Check that ADB over Wi-Fi is enabled, or enter the IP and port manually.')
      }
    } catch (error) {
      setDiscoveryMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
    }
  }

  function selectDiscoveredEndpoint(id: string) {
    setDiscoveredSelection(id)
    const endpoint = discoveredEndpoints.find((candidate) => endpointId(candidate) === id)
    if (!endpoint) return
    setHost(endpoint.host)
    if (endpoint.service === 'connect') setPort(String(endpoint.port))
    else setPairingPort(String(endpoint.port))
  }

  const refreshPackages = useCallback(async (deviceSerial = serial) => {
    if (!deviceSerial) {
      setPackages([])
      return
    }
    setLoadingPackages(true)
    try {
      const items = await api<PackageInfo[]>(token, `/api/packages?serial=${encodeURIComponent(deviceSerial)}`)
      setPackages(items)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setLoadingPackages(false)
    }
  }, [serial, token])

  const refreshHistory = useCallback(async (deviceSerial = serial) => {
    if (!deviceSerial) {
      setHistory([])
      return
    }
    try {
      setHistory(await api<HistoryEntry[]>(token, `/api/history?serial=${encodeURIComponent(deviceSerial)}`))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }, [serial, token])

  useEffect(() => {
    if (!token) return
    const initialRefresh = window.setTimeout(() => void refreshDevices())
    const timer = window.setInterval(() => void refreshDevices(), 3000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(timer)
    }
  }, [refreshDevices, token])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (section === 'Apps') void refreshPackages()
      if (section === 'History') void refreshHistory()
    })
    return () => window.clearTimeout(timer)
  }, [refreshHistory, refreshPackages, section])

  useEffect(() => {
    if (!token) return
    let active = true
    let reconnectTimer = 0
    const connectSocket = () => {
      if (!active) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`)
      socketRef.current = socket
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as ConsoleEvent
          if (!consolePausedRef.current) setEvents((current) => [...current.slice(-499), event])
          if (event.text.startsWith('logcat exit')) setLogcatRunning(false)
        } catch {
          setNotice('Received an invalid console event.')
        }
      }
      socket.onopen = () => setNotice('')
      socket.onclose = () => {
        if (active) reconnectTimer = window.setTimeout(connectSocket, 2000)
      }
    }
    connectSocket()
    return () => {
      active = false
      window.clearTimeout(reconnectTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    if (consolePaused || !consoleAutoScrollRef.current || !scrollRef.current) return
    scrollRef.current.scrollTop = 0
  }, [consolePaused, visibleEvents])

  function connectDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void connectTo(host, Number(port))
  }

  function connectDiscoveredDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedEndpoint?.service !== 'connect') return
    void connectTo(selectedEndpoint.host, selectedEndpoint.port)
  }

  async function connectTo(targetHost: string, targetPort: number) {
    setBusy('connect')
    setNotice('')
    try {
      localStorage.setItem('tv-debloat-host', targetHost)
      const result = await api<{ serial: string }>(token, '/api/devices/connect', {
        method: 'POST',
        body: JSON.stringify({ host: targetHost, port: targetPort }),
      })
      setSerial(result.serial)
      await refreshDevices()
      setSection('Overview')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
    }
  }

  async function pairDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('pair')
    setNotice('')
    try {
      const result = await api<{ result: string }>(token, '/api/devices/pair', {
        method: 'POST',
        body: JSON.stringify({ host, port: Number(pairingPort), pairingCode }),
      })
      setPairingCode('')
      setNotice(`${result.result} Now connect using the connection port shown under Wireless debugging on the TV.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
    }
  }

  async function disconnectDevice(deviceSerial: string) {
    setBusy('disconnect')
    try {
      await api(token, '/api/devices/disconnect', {
        method: 'POST',
        body: JSON.stringify({ serial: deviceSerial }),
      })
      if (serial === deviceSerial) setSerial('')
      await refreshDevices()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
    }
  }

  async function runPackageAction(packageName: string, action: 'disable' | 'enable' | 'uninstall') {
    if (!serial || !isDeviceReady) {
      setNotice('Connect to an online device before changing packages.')
      return
    }
    setBusy(packageName)
    setNotice('')
    try {
      await api(token, '/api/packages/action', {
        method: 'POST',
        body: JSON.stringify({ serial, packageName, action }),
      })
      await Promise.all([refreshPackages(serial), refreshHistory(serial)])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
      setPendingUninstall(null)
    }
  }

  async function installApk(file: File): Promise<boolean> {
    if (!serial || !isDeviceReady) {
      setNotice('Connect to an online Wi-Fi ADB device before installing an APK.')
      return false
    }
    setBusy('install')
    setNotice('')
    try {
      const body = new FormData()
      body.append('apk', file)
      const result = await api<{ result: string }>(
        token,
        `/api/packages/install?serial=${encodeURIComponent(serial)}`,
        { method: 'POST', body },
      )
      await refreshPackages(serial)
      const output = result.result.trim()
      setNotice(output ? `${file.name}: ${output}` : `Installed ${file.name}.`)
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      setBusy('')
    }
  }

  async function undoChange(entry: HistoryEntry) {
    if (!isDeviceReady) {
      setNotice('Connect to the device before undoing this package change.')
      return
    }
    setBusy(entry.id)
    try {
      await api(token, '/api/history/undo', {
        method: 'POST',
        body: JSON.stringify({ id: entry.id, serial: entry.serial }),
      })
      await Promise.all([refreshPackages(entry.serial), refreshHistory(entry.serial)])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy('')
    }
  }

  function toggleLogcat() {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !serial) {
      setNotice('Connect to a device and wait for the console to connect before starting logcat.')
      return
    }
    socket.send(JSON.stringify({ type: logcatRunning ? 'logcat:stop' : 'logcat:start', serial }))
    setLogcatRunning(!logcatRunning)
  }

  function exportConsole() {
    const content = events.map((event) => `[${new Date(event.ts).toISOString()}] [${event.kind}] ${event.text}`).join('')
    const download = document.createElement('a')
    download.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    download.download = `tv-console-${new Date().toISOString().replaceAll(':', '-')}.log`
    download.click()
    URL.revokeObjectURL(download.href)
  }

  return {
    token, theme, toggleTheme, section, setSection, devices, discoveredEndpoints, discoveredSelection, discoveryMessage,
    serial, host, port, pairingPort, pairingCode, packages, history, events, filter,
    packageSearch, packageTypeFilter, packageStateFilter, packageAssessmentFilter,
    notice, setNotice, busy, loadingPackages, pendingUninstall, logcatRunning,
    consolePaused, setConsolePaused, consoleWidth, scrollRef, socketRef,
    consolePausedRef, consoleAutoScrollRef, consoleResizeRef, selectedDevice,
    selectedEndpoint, isDeviceReady, connectedDevices, filteredPackages, visibleEvents,
    refreshDevices, discoverEndpoints, selectDiscoveredEndpoint, refreshPackages,
    refreshHistory, connectDevice, connectDiscoveredDevice, connectTo, pairDevice,
    disconnectDevice, runPackageAction, installApk, undoChange, toggleLogcat,
    exportConsole, setHost, setPort, setPairingPort, setPairingCode, setSerial,
    setPackageSearch, setPackageTypeFilter, setPackageStateFilter,
    setPackageAssessmentFilter, setPendingUninstall, setEvents, setFilter,
    setConsoleWidth,
  }
}
