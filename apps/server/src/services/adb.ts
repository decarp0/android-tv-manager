import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Buffer } from 'node:buffer'
import type { ConsoleEvent } from '../types.js'
import { getPngDimensions } from '../remote-control.js'

const protectedPackages = new Set([
  'com.android.systemui',
  'com.android.settings',
  'com.android.bluetooth',
  'com.google.android.tvlauncher',
  'com.google.android.apps.tv.launcherx',
  'com.google.android.inputmethod.latin',
  'com.google.android.gms',
  'com.android.vending',
])

type PublishEvent = (event: Omit<ConsoleEvent, 'id' | 'ts'>) => void

function escapeCommandArg(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value
}

export function createAdbService(adbPath: string, publish: PublishEvent) {
  function runAdb(args: string[], serial?: string, displayedArgs = args, timeoutMs = 30_000): Promise<string> {
    const fullArgs = serial ? ['-s', serial, ...args] : args
    const commandText = [adbPath, ...(serial ? ['-s', serial, ...displayedArgs] : displayedArgs)].map(escapeCommandArg).join(' ')
    const startedAt = Date.now()
    publish({ kind: 'command', serial, text: commandText, source: 'ui' })

    return new Promise((resolve, reject) => {
      const child = spawn(adbPath, fullArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
      }, timeoutMs)

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stdout += text
        if (stdout.length > 8_000_000) child.kill('SIGTERM')
        publish({ kind: 'stdout', serial, text, source: 'ui' })
      })
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderr += text
        publish({ kind: 'stderr', serial, text, source: 'ui' })
      })
      child.on('error', (error) => {
        clearTimeout(timeout)
        const message = (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `adb not found at "${adbPath}". Install Android platform-tools or set ADB_PATH.`
          : error.message
        publish({ kind: 'error', serial, text: message, source: 'system' })
        reject(new Error(message))
      })
      child.on('close', (code) => {
        clearTimeout(timeout)
        const exitCode = code ?? 1
        const durationMs = Date.now() - startedAt
        publish({ kind: 'exit', serial, text: `exit ${exitCode}`, exitCode, durationMs, source: 'ui' })
        if (timedOut) reject(new Error(`ADB command timed out after ${timeoutMs / 1000} seconds.`))
        else if (stdout.length > 8_000_000) reject(new Error('ADB output exceeded the 8 MB limit.'))
        else if (exitCode !== 0) reject(new Error(stderr.trim() || `ADB exited with code ${exitCode}.`))
        else resolve(stdout)
      })
    })
  }

  async function getProtectedPackages(serial: string): Promise<Set<string>> {
    const packages = new Set(protectedPackages)
    const output = await runAdb([
      'shell', 'cmd', 'package', 'resolve-activity', '--brief', '-a',
      'android.intent.action.MAIN', '-c', 'android.intent.category.HOME',
    ], serial)
    const homePackage = output.match(/(?:^|\n)([A-Za-z0-9_.]+)\/[^\s]+/)?.[1]
    if (homePackage) packages.add(homePackage)
    return packages
  }

  function captureScreenshot(serial: string, maxSize: number, timeoutMs: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const args = ['-s', serial, 'exec-out', 'screencap', '-p']
      const startedAt = Date.now()
      publish({ kind: 'command', serial, text: [adbPath, ...args].map(escapeCommandArg).join(' '), source: 'ui' })
      const child = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      const chunks: Buffer[] = []
      let size = 0
      let stderr = ''
      let timedOut = false
      let oversized = false
      let forceKillTimeout: ReturnType<typeof setTimeout> | undefined
      const terminateChild = () => {
        child.kill('SIGTERM')
        if (!forceKillTimeout) forceKillTimeout = setTimeout(() => child.kill('SIGKILL'), 1000)
      }
      const timeout = setTimeout(() => {
        timedOut = true
        terminateChild()
      }, timeoutMs)

      child.stdout.on('data', (chunk: Buffer) => {
        if (oversized) return
        if (size + chunk.length > maxSize) {
          oversized = true
          terminateChild()
          return
        }
        chunks.push(chunk)
        size += chunk.length
      })
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderr = `${stderr}${text}`.slice(-8000)
        publish({ kind: 'stderr', serial, text, source: 'ui' })
      })
      child.on('error', (error) => {
        clearTimeout(timeout)
        if (forceKillTimeout) clearTimeout(forceKillTimeout)
        const message = (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `adb not found at "${adbPath}". Install Android platform-tools or set ADB_PATH.`
          : error.message
        publish({ kind: 'error', serial, text: message, source: 'system' })
        reject(new Error(message))
      })
      child.on('close', (code) => {
        clearTimeout(timeout)
        if (forceKillTimeout) clearTimeout(forceKillTimeout)
        const exitCode = code ?? 1
        publish({
          kind: 'exit',
          serial,
          text: `exit ${exitCode} (screenshot ${size} bytes)`,
          exitCode,
          durationMs: Date.now() - startedAt,
          source: 'ui',
        })
        if (timedOut) return reject(new Error(`ADB screenshot timed out after ${timeoutMs / 1000} seconds.`))
        if (oversized) return reject(new Error(`ADB screenshot exceeded the ${maxSize / 1024 / 1024} MiB limit.`))
        if (exitCode !== 0) return reject(new Error(stderr.trim() || `ADB exited with code ${exitCode}.`))
        const screenshot = Buffer.concat(chunks, size)
        if (!getPngDimensions(screenshot)) return reject(new Error('ADB returned invalid or incomplete PNG screenshot data.'))
        resolve(screenshot)
      })
    })
  }

  return { adbPath, runAdb, getProtectedPackages, captureScreenshot }
}
