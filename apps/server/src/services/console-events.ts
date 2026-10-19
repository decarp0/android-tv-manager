import { randomBytes } from 'node:crypto'
import type { ConsoleEvent } from '../types.js'

type ConsoleSocket = {
  send: (value: string) => void
  readyState: number
}

export function createConsoleEvents() {
  const sockets = new Set<ConsoleSocket>()

  function publish(event: Omit<ConsoleEvent, 'id' | 'ts'>) {
    const fullEvent: ConsoleEvent = { id: randomBytes(8).toString('hex'), ts: Date.now(), ...event }
    const message = JSON.stringify(fullEvent)
    for (const socket of sockets) {
      if (socket.readyState === 1) socket.send(message)
    }
  }

  return {
    publish,
    add: (socket: ConsoleSocket) => sockets.add(socket),
    delete: (socket: ConsoleSocket) => sockets.delete(socket),
    get size() { return sockets.size },
  }
}
