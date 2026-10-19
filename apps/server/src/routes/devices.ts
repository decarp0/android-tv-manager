import { discoverAdbEndpoints, getDefaultRouteInterface, getPrivateIPv4ScanTargets } from '../network-discovery.js'
import { getPngDimensions, remoteKeyCodes, type RemoteKey } from '../remote-control.js'
import { isValidHost, isWifiSerial } from '../lib/validation.js'
import type { ServerContext } from '../context.js'
import { parseDevices } from '../parsers.js'

export function registerDeviceRoutes({ app, adb, config, events }: ServerContext) {
  const { runAdb, captureScreenshot } = adb

  app.get('/api/devices', async () => {
    const output = await runAdb(['devices', '-l'])
    return parseDevices(output)
  })

  app.get('/api/devices/discover', async () => {
    const output = await runAdb(['mdns', 'services'])
    let targets: string[] = []
    try {
      const interfaceName = await getDefaultRouteInterface()
      targets = getPrivateIPv4ScanTargets(interfaceName)
    } catch (error) {
      events.publish({
        kind: 'error',
        text: `TCP 5555 discovery skipped: ${error instanceof Error ? error.message : String(error)}`,
        source: 'system',
      })
    }
    events.publish({ kind: 'info', text: `Checking local IPv4 networks for TCP port 5555 (${targets.length} hosts).`, source: 'system' })
    return discoverAdbEndpoints(output, targets)
  })

  app.post<{ Body: { host: string; port?: number } }>('/api/devices/connect', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['host'],
        properties: {
          host: { type: 'string', maxLength: 15 },
          port: { type: 'integer', minimum: 1, maximum: 65535 },
        },
      },
    },
  }, async (request, reply) => {
    const { host, port = 5555 } = request.body
    if (!isValidHost(host)) return reply.code(400).send({ error: 'Enter a valid IPv4 address.' })
    const output = await runAdb(['connect', `${host}:${port}`])
    if (/cannot connect|failed to connect|connection refused/i.test(output)) {
      return reply.code(502).send({ error: output.trim() || 'ADB could not connect to the device.' })
    }
    return { serial: `${host}:${port}` }
  })

  app.post<{ Body: { host: string; port: number; pairingCode: string } }>('/api/devices/pair', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['host', 'port', 'pairingCode'],
        properties: {
          host: { type: 'string', maxLength: 15 },
          port: { type: 'integer', minimum: 1, maximum: 65535 },
          pairingCode: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
    },
  }, async (request, reply) => {
    const { host, port, pairingCode } = request.body
    if (!isValidHost(host)) return reply.code(400).send({ error: 'Enter a valid IPv4 address.' })
    const output = await runAdb(
      ['pair', `${host}:${port}`, pairingCode],
      undefined,
      ['pair', `${host}:${port}`, '<pairing-code>'],
    )
    if (/failed|unable|error/i.test(output)) {
      return reply.code(502).send({ error: output.trim() || 'ADB pairing failed.' })
    }
    return { result: output.trim() }
  })

  app.post<{ Body: { serial: string } }>('/api/devices/disconnect', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['serial'],
        properties: { serial: { type: 'string', maxLength: 21 } },
      },
    },
  }, async (request, reply) => {
    const { serial } = request.body
    if (!isWifiSerial(serial)) return reply.code(400).send({ error: 'Only Wi-Fi ADB devices can be disconnected here.' })
    await runAdb(['disconnect', serial])
    return { serial }
  })

  app.get<{ Querystring: { serial: string } }>('/api/devices/screenshot', {
    schema: {
      querystring: {
        type: 'object',
        required: ['serial'],
        properties: { serial: { type: 'string', maxLength: 21 } },
      },
    },
  }, async (request, reply) => {
    const { serial } = request.query
    if (!isWifiSerial(serial)) return reply.code(400).send({ error: 'Choose a connected Wi-Fi ADB device.' })
    const screenshot = await captureScreenshot(serial, config.maxScreenshotSize, config.screenshotTimeoutMs)
    const dimensions = getPngDimensions(screenshot)
    if (!dimensions) return reply.code(502).send({ error: 'ADB returned invalid screenshot dimensions.' })
    return reply
      .header('Cache-Control', 'no-store, max-age=0')
      .header('X-Screenshot-Width', String(dimensions.width))
      .header('X-Screenshot-Height', String(dimensions.height))
      .type('image/png')
      .send(screenshot)
  })

  app.post<{ Body: { serial: string; key: RemoteKey } }>('/api/devices/input', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['serial', 'key'],
        properties: {
          serial: { type: 'string', maxLength: 21 },
          key: { type: 'string', enum: Object.keys(remoteKeyCodes) },
        },
      },
    },
  }, async (request, reply) => {
    const { serial, key } = request.body
    if (!isWifiSerial(serial)) return reply.code(400).send({ error: 'Choose a connected Wi-Fi ADB device.' })
    await runAdb(['shell', 'input', 'keyevent', String(remoteKeyCodes[key])], serial)
    return { key }
  })
}
