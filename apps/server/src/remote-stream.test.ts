import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeRemotePacket } from './remote-stream.js'

test('encodes scrcpy configuration packets for the browser bridge', () => {
  const packet = encodeRemotePacket({
    type: 'configuration',
    data: Uint8Array.from([1, 2, 3]),
  })

  assert.equal(packet.toString('ascii', 0, 4), 'TSV1')
  assert.equal(packet.readUInt8(4), 0)
  assert.equal(packet.readUInt8(5), 0)
  assert.equal(packet.readBigInt64BE(6), 0n)
  assert.deepEqual(packet.subarray(14), Buffer.from([1, 2, 3]))
})

test('preserves video frame metadata and payload', () => {
  const packet = encodeRemotePacket({
    type: 'data',
    keyframe: true,
    pts: 123456789n,
    data: Uint8Array.from([4, 5, 6]),
  })

  assert.equal(packet.toString('ascii', 0, 4), 'TSV1')
  assert.equal(packet.readUInt8(4), 1)
  assert.equal(packet.readUInt8(5), 1)
  assert.equal(packet.readBigInt64BE(6), 123456789n)
  assert.deepEqual(packet.subarray(14), Buffer.from([4, 5, 6]))
})
