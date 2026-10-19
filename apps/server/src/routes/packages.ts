import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { pipeline } from 'node:stream/promises'
import type { ServerContext } from '../context.js'
import { parsePackages } from '../parsers.js'
import { packageActionArgs } from '../lib/package-actions.js'
import { isWifiSerial } from '../lib/validation.js'
import type { HistoryEntry } from '../types.js'

export function registerPackageRoutes({ app, adb, config, history: store }: ServerContext) {
  const { runAdb, getProtectedPackages } = adb

  app.get<{ Querystring: { serial: string } }>('/api/packages', {
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
    const protectedForDevice = await getProtectedPackages(serial)
    const all = await runAdb(['shell', 'pm', 'list', 'packages', '-f', '-U', '-i', '--user', '0'], serial)
    const disabled = await runAdb(['shell', 'pm', 'list', 'packages', '-d', '--user', '0'], serial)
    const system = await runAdb(['shell', 'pm', 'list', 'packages', '-s', '--user', '0'], serial)
    const user = await runAdb(['shell', 'pm', 'list', 'packages', '-3', '--user', '0'], serial)
    return parsePackages(all, disabled, system, user, protectedForDevice)
  })

  app.post<{ Querystring: { serial: string } }>('/api/packages/install', {
    bodyLimit: config.maxApkSize + 1024 * 1024,
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
    const uploaded = await request.file({ limits: { fileSize: config.maxApkSize }, throwFileSizeLimit: false })
    if (!uploaded) return reply.code(400).send({ error: 'Choose a single APK file to install.' })
    if (path.extname(uploaded.filename).toLowerCase() !== '.apk') {
      uploaded.file.resume()
      return reply.code(400).send({ error: 'Only single .apk files are supported; split APK bundles are not supported.' })
    }

    const tempApkPath = path.join(tmpdir(), `tv-debloat-${randomBytes(16).toString('hex')}.apk`)
    try {
      await pipeline(uploaded.file, createWriteStream(tempApkPath, { flags: 'wx', mode: 0o600 }))
      if (uploaded.file.truncated) return reply.code(413).send({ error: 'APK exceeds the 512 MiB upload limit.' })
      const result = await runAdb(
        ['install', '-r', tempApkPath],
        serial,
        ['install', '-r', '<uploaded APK>'],
        120_000,
      )
      return { result }
    } finally {
      await unlink(tempApkPath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      })
    }
  })

  app.post<{ Body: { serial: string; packageName: string; action: HistoryEntry['action'] } }>('/api/packages/action', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['serial', 'packageName', 'action'],
        properties: {
          serial: { type: 'string', maxLength: 21 },
          packageName: { type: 'string', pattern: '^[A-Za-z0-9_.]+$', maxLength: 255 },
          action: { type: 'string', enum: ['disable', 'enable', 'uninstall'] },
        },
      },
    },
  }, async (request, reply) => {
    const { serial, packageName, action } = request.body
    if (!isWifiSerial(serial)) return reply.code(400).send({ error: 'Choose a connected Wi-Fi ADB device.' })
    const protectedForDevice = await getProtectedPackages(serial)
    if (protectedForDevice.has(packageName)) {
      return reply.code(409).send({ error: `${packageName} is protected to prevent breaking core TV functions.` })
    }
    const [installedOutput, disabledOutput] = await Promise.all([
      runAdb(['shell', 'pm', 'list', 'packages', '--user', '0'], serial),
      runAdb(['shell', 'pm', 'list', 'packages', '-d', '--user', '0'], serial),
    ])
    const installed = installedOutput.split(/\r?\n/).includes(`package:${packageName}`)
    if (!installed) return reply.code(404).send({ error: 'Package is not currently installed for user 0.' })
    const disabled = disabledOutput.split(/\r?\n/).includes(`package:${packageName}`)
    const previousState: HistoryEntry['previousState'] = disabled ? 'disabled' : 'enabled'
    const result = await runAdb(packageActionArgs(action, packageName), serial)
    const entry: HistoryEntry = {
      id: randomBytes(8).toString('hex'),
      ts: Date.now(),
      serial,
      packageName,
      action,
      previousState,
      undone: false,
    }
    const entries = await store.read()
    entries.push(entry)
    await store.write(entries)
    return { result, historyEntry: entry }
  })
}
