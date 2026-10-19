import { randomBytes } from 'node:crypto'

export const PORT = Number(process.env.PORT ?? 4173)
export const APP_ENV = process.env.APP_ENV ?? 'development'
export const ADB = process.env.ADB_PATH ?? 'adb'
export const MAX_APK_SIZE = 512 * 1024 * 1024
export const MAX_SCREENSHOT_SIZE = 32 * 1024 * 1024
export const SCREENSHOT_TIMEOUT_MS = 20_000
export const TOKEN = randomBytes(24).toString('hex')

export const allowedHosts = new Set([
  `127.0.0.1:${PORT}`,
  `localhost:${PORT}`,
  '127.0.0.1:5173',
  'localhost:5173',
])

export const allowedOrigins = new Set([
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])
