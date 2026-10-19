export function isWifiSerial(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/)
  return Boolean(match && match[1].split('.').every((part) => Number(part) <= 255) && Number(match[2]) > 0 && Number(match[2]) <= 65535)
}

export function isValidHost(value: unknown): value is string {
  return typeof value === 'string'
    && value.split('.').length === 4
    && value.split('.').every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}
