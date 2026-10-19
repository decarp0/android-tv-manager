import assert from 'node:assert/strict'
import test from 'node:test'
import { getPngDimensions, remoteKeyCodes } from './remote-control.js'

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)])
}

function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', Buffer.from([1])),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

test('maps only the fixed Android remote key events', () => {
  assert.deepEqual(remoteKeyCodes, {
    up: 19,
    down: 20,
    left: 21,
    right: 22,
    ok: 23,
    back: 4,
    home: 3,
  })
})

test('accepts complete PNG structure and returns bounded dimensions', () => {
  assert.deepEqual(getPngDimensions(png(1920, 1080)), { width: 1920, height: 1080 })
  assert.equal(getPngDimensions(png(8193, 1)), null)
  assert.equal(getPngDimensions(png(8192, 8192)), null)
  assert.equal(getPngDimensions(png(0, 720)), null)
  assert.equal(getPngDimensions(png(1920, 1080).subarray(0, -12)), null)
  assert.equal(getPngDimensions(Buffer.from('not a png')), null)
})
