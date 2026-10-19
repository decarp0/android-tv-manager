export function decodeRemotePacket(buffer: ArrayBuffer): ScrcpyMediaStreamPacket | null {
  if (buffer.byteLength < 14) return null
  const bytes = new Uint8Array(buffer)
  if (bytes[0] !== 84 || bytes[1] !== 83 || bytes[2] !== 86 || bytes[3] !== 49) return null

  const data = bytes.subarray(14)
  if (bytes[4] === 0) return { type: 'configuration', data }
  if (bytes[4] !== 1) return null

  return {
    type: 'data',
    keyframe: (bytes[5] & 1) === 1,
    pts: new DataView(buffer).getBigInt64(6),
    data,
  }
}
import type { ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy'
