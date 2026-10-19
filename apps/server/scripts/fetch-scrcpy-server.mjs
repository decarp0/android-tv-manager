import { createHash } from 'node:crypto'
import { rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '3.3.3'
const EXPECTED_SIZE = 90_164
const EXPECTED_SHA256 = '7e70323ba7f259649dd4acce97ac4fefbae8102b2c6d91e2e7be613fd5354be0'
const RELEASE_URL = `https://github.com/Genymobile/scrcpy/releases/download/v${VERSION}/scrcpy-server-v${VERSION}`
const destination = resolve(dirname(fileURLToPath(import.meta.url)), '../scrcpy-server.bin')
const temporaryFile = `${destination}.${process.pid}.tmp`

try {
  const response = await fetch(RELEASE_URL)
  if (!response.ok) throw new Error(`Scrcpy ${VERSION} download failed with HTTP ${response.status}.`)

  const downloadHost = new URL(response.url).hostname
  if (!['github.com', 'release-assets.githubusercontent.com'].includes(downloadHost)) {
    throw new Error(`Unexpected host for the Scrcpy ${VERSION} download: ${downloadHost}.`)
  }
  if (!response.body) throw new Error(`Scrcpy ${VERSION} download returned no data.`)

  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > EXPECTED_SIZE) throw new Error(`Scrcpy ${VERSION} download exceeded the expected size.`)
    chunks.push(Buffer.from(chunk))
  }
  if (size !== EXPECTED_SIZE) throw new Error(`Scrcpy ${VERSION} download has an unexpected size: ${size} bytes.`)

  const binary = Buffer.concat(chunks, size)
  const digest = createHash('sha256').update(binary).digest('hex')
  if (digest !== EXPECTED_SHA256) throw new Error(`Scrcpy ${VERSION} download failed its SHA-256 check.`)

  await writeFile(temporaryFile, binary, { flag: 'wx' })
  await rename(temporaryFile, destination)
  console.log(`Downloaded and verified Scrcpy server ${VERSION}.`)
} finally {
  await rm(temporaryFile, { force: true })
}
