import type { ServerContext } from '../context.js'
import { packageActionArgs } from '../lib/package-actions.js'
import { isWifiSerial } from '../lib/validation.js'

export function registerHistoryRoutes({ app, adb, history: store }: ServerContext) {
  const { runAdb } = adb

  app.get<{ Querystring: { serial?: string } }>('/api/history', async (request) => {
    const entries = await store.read()
    return request.query.serial ? entries.filter((entry) => entry.serial === request.query.serial) : entries
  })

  app.post<{ Body: { id: string; serial: string } }>('/api/history/undo', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'serial'],
        properties: {
          id: { type: 'string', maxLength: 16 },
          serial: { type: 'string', maxLength: 21 },
        },
      },
    },
  }, async (request, reply) => {
    const { id, serial } = request.body
    if (!isWifiSerial(serial)) return reply.code(400).send({ error: 'Choose a connected Wi-Fi ADB device.' })
    const entries = await store.read()
    const entry = entries.find((item) => item.id === id && item.serial === serial && !item.undone)
    if (!entry) return reply.code(404).send({ error: 'No undoable package change was found.' })
    const args = packageActionArgs(entry.previousState === 'disabled' ? 'disable' : 'enable', entry.packageName)
    if (entry.action === 'uninstall') {
      await runAdb(['shell', 'cmd', 'package', 'install-existing', '--user', '0', entry.packageName], serial)
      if (entry.previousState === 'disabled') await runAdb(args, serial)
    } else {
      await runAdb(args, serial)
    }
    entry.undone = true
    await store.write(entries)
    return { ok: true }
  })
}
