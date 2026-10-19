import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'
import { discoverAdbEndpoints, getPrivateIPv4ScanTargets, parseDefaultRouteInterface } from './network-discovery.js'

test('parses default route interfaces on macOS, Linux, and Windows', () => {
  assert.equal(parseDefaultRouteInterface('interface: en0\n', 'darwin'), 'en0')
  assert.equal(parseDefaultRouteInterface('default via 192.168.1.1 dev wlp2s0 proto dhcp metric 600\n', 'linux'), 'wlp2s0')
  assert.equal(parseDefaultRouteInterface('Wi-Fi\n', 'win32'), 'Wi-Fi')
  assert.equal(parseDefaultRouteInterface('', 'win32'), undefined)
})

test('finds a legacy ADB endpoint when TCP port 5555 is open and mDNS is empty', async (t) => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())))

  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  assert.deepEqual(
    await discoverAdbEndpoints('List of discovered mdns services\n', ['127.0.0.1'], address.port),
    [{ host: '127.0.0.1', port: address.port, service: 'connect' }],
  )
})

test('limits subnet targets to non-local IPv4 hosts on small private networks', () => {
  const targets = getPrivateIPv4ScanTargets('en0', {
    en0: [{ address: '192.168.1.10', netmask: '255.255.255.0', family: 'IPv4', internal: false }],
    bridge0: [{ address: '10.2.3.4', netmask: '255.0.0.0', family: 'IPv4', internal: false }],
    lo0: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: true }],
    en1: [{ address: 'fe80::1', netmask: 'ffff:ffff::', family: 'IPv6', internal: false }],
  })
  assert.equal(targets.length, 253)
  assert.ok(targets.includes('192.168.1.1'))
  assert.ok(targets.includes('192.168.1.254'))
  assert.ok(!targets.includes('192.168.1.10'))
  assert.ok(!targets.includes('10.2.3.4'))
  assert.ok(!targets.includes('127.0.0.1'))
})
