import type { FastifyInstance } from 'fastify'
import type { createAdbService } from './services/adb.js'
import type { createConsoleEvents } from './services/console-events.js'
import type { readHistory, writeHistory } from './services/history-store.js'

export type ServerContext = {
  app: FastifyInstance
  config: {
    adbPath: string
    maxApkSize: number
    maxScreenshotSize: number
    screenshotTimeoutMs: number
  }
  adb: ReturnType<typeof createAdbService>
  events: ReturnType<typeof createConsoleEvents>
  history: {
    read: typeof readHistory
    write: typeof writeHistory
  }
}
