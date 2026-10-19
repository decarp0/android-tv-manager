import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDevices, parseMdnsServices, parsePackages } from './parsers.js'

test('parses adb device states and optional model attributes', () => {
  assert.deepEqual(parseDevices(
    'List of devices attached\n192.168.1.20:5555 device product:mdz-28-aa model:MIBOX4 device:onc\n192.168.1.21:5555 unauthorized\n',
  ), [
    { serial: '192.168.1.20:5555', state: 'device', product: 'mdz-28-aa', model: 'MIBOX4', device: 'onc' },
    { serial: '192.168.1.21:5555', state: 'unauthorized' },
  ])
})

test('parses valid Android wireless debugging endpoints from adb mDNS output', () => {
  assert.deepEqual(parseMdnsServices(
    'List of discovered mdns services\n'
    + 'adb-tls-pairing._tcp 192.168.1.20:37641\n'
    + 'adb-tls-connect._tcp 192.168.1.20:41435\n'
    + 'adb-tls-connect._tcp 192.168.1.300:5555\n'
    + 'adb-tls-connect._tcp 192.168.1.20:70000\n'
    + 'other-service._tcp 192.168.1.21:5555\n',
  ), [
    { host: '192.168.1.20', port: 41435, service: 'connect' },
    { host: '192.168.1.20', port: 37641, service: 'pairing' },
  ])
})

test('parses package metadata and joins package state lists', () => {
  assert.deepEqual(parsePackages(
    'package:/system/app/Example/Example.apk=com.example.app installer=com.android.vending uid:10001\npackage:com.android.settings\n',
    'package:com.example.app\n',
    'package:com.android.settings\n',
    'package:com.example.app\n',
    new Set(['com.android.settings']),
  ), [
    {
      packageName: 'com.android.settings',
      type: 'system',
      state: 'enabled',
      protected: true,
    },
    {
      packageName: 'com.example.app',
      apkPath: '/system/app/Example/Example.apk',
      uid: 10001,
      installer: 'com.android.vending',
      type: 'user',
      state: 'disabled',
      protected: false,
    },
  ])
})
