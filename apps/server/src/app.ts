import path from 'node:path'
import Fastify, { type FastifyRequest } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { APP_ENV, ADB, allowedHosts, allowedOrigins, MAX_APK_SIZE, MAX_SCREENSHOT_SIZE, PORT, SCREENSHOT_TIMEOUT_MS, TOKEN } from './config.js'
import { hasValidToken } from './lib/auth.js'
import { createAdbService } from './services/adb.js'
import { createConsoleEvents } from './services/console-events.js'
import { readHistory, writeHistory } from './services/history-store.js'
import { registerDeviceRoutes } from './routes/devices.js'
import { registerHistoryRoutes } from './routes/history.js'
import { registerPackageRoutes } from './routes/packages.js'
import { registerWebSocketRoutes } from './routes/websocket.js'

const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 })
const events = createConsoleEvents()
const context = {
  app,
  config: {
    adbPath: ADB,
    maxApkSize: MAX_APK_SIZE,
    maxScreenshotSize: MAX_SCREENSHOT_SIZE,
    screenshotTimeoutMs: SCREENSHOT_TIMEOUT_MS,
  },
  adb: createAdbService(ADB, events.publish),
  events,
  history: { read: readHistory, write: writeHistory },
}

app.addHook('onRequest', async (request: FastifyRequest, reply) => {
  if (!allowedHosts.has(request.headers.host ?? '')) {
    return reply.code(403).send({ error: 'Only localhost requests are allowed.' })
  }
  const origin = request.headers.origin
  if (origin && !allowedOrigins.has(origin)) {
    return reply.code(403).send({ error: 'Cross-origin requests are not allowed.' })
  }
  if ((request.url.startsWith('/api/') || request.url.startsWith('/ws')) && !hasValidToken(request, TOKEN)) {
    return reply.code(401).send({ error: 'Missing or invalid local session token.' })
  }
})

await app.register(fastifyMultipart, {
  limits: { fileSize: MAX_APK_SIZE, files: 1, fields: 0, parts: 1 },
})
await registerWebSocketRoutes(context)
registerDeviceRoutes(context)
registerPackageRoutes(context)
registerHistoryRoutes(context)

app.setErrorHandler((error: unknown, request, reply) => {
  request.log.error(error)
  const status = typeof error === 'object' && error !== null && 'statusCode' in error
    && typeof error.statusCode === 'number' && error.statusCode >= 400
    ? error.statusCode
    : 500
  reply.code(status).send({ error: error instanceof Error ? error.message : 'Unexpected server error.' })
})

if (APP_ENV === 'production') {
  await app.register(fastifyStatic, {
    root: path.resolve(import.meta.dirname, '../../web/dist'),
    prefix: '/',
    index: ['index.html'],
  })
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/ws')) {
      return reply.code(404).send({ error: 'Not found.' })
    }
    return reply.sendFile('index.html')
  })
}

await app.listen({ host: '127.0.0.1', port: PORT })
const uiPort = APP_ENV === 'production' ? PORT : 5173
console.log(`TV Debloat Console: http://127.0.0.1:${uiPort}/?token=${TOKEN}`)
console.log('The token grants access to ADB shell controls. Keep it private.')
