export const remoteKeyCodes = {
  up: 19,
  down: 20,
  left: 21,
  right: 22,
  ok: 23,
  back: 4,
  home: 3,
} as const

export type RemoteKey = keyof typeof remoteKeyCodes

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const maxPngDimension = 8192
const maxPngPixels = 50_000_000

export function getPngDimensions(png: Buffer): { width: number; height: number } | null {
  if (png.length < 45 || !png.subarray(0, 8).equals(pngSignature)) return null

  let offset = 8
  let dimensions: { width: number; height: number } | null = null
  let hasImageData = false

  while (offset + 12 <= png.length) {
    const chunkLength = png.readUInt32BE(offset)
    const chunkType = png.toString('ascii', offset + 4, offset + 8)
    const chunkEnd = offset + 12 + chunkLength
    if (chunkEnd > png.length) return null

    if (!dimensions) {
      if (chunkType !== 'IHDR' || chunkLength !== 13) return null
      const width = png.readUInt32BE(offset + 8)
      const height = png.readUInt32BE(offset + 12)
      if (width < 1 || height < 1 || width > maxPngDimension || height > maxPngDimension || width * height > maxPngPixels) {
        return null
      }
      dimensions = { width, height }
    } else if (chunkType === 'IHDR') {
      return null
    }

    if (chunkType === 'IDAT') hasImageData = true
    if (chunkType === 'IEND') {
      return chunkLength === 0 && hasImageData && chunkEnd === png.length ? dimensions : null
    }
    offset = chunkEnd
  }

  return null
}
