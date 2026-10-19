import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { homedir } from 'node:os'
import type { HistoryEntry } from '../types.js'

const DATA_DIR = path.join(homedir(), '.tv-debloat')
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    return JSON.parse(await readFile(HISTORY_FILE, 'utf8')) as HistoryEntry[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function writeHistory(entries: HistoryEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  const tempFile = `${HISTORY_FILE}.tmp`
  await writeFile(tempFile, JSON.stringify(entries.slice(-200), null, 2), { mode: 0o600 })
  await rename(tempFile, HISTORY_FILE)
}
