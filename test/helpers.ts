import { STORAGE_KEY } from '../src/types'
import type { StorageLike } from '../src/storage'

export class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  reads = 0
  writes = 0
  throwOnRead = false
  throwOnWrite = false

  getItem(key: string): string | null {
    this.reads += 1
    if (this.throwOnRead) throw new Error('read blocked')
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.writes += 1
    if (this.throwOnWrite) throw new Error('write blocked')
    this.values.set(key, value)
  }

  saved(): unknown {
    const raw = this.values.get(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  }
}

export function sequenceIds(...ids: string[]) {
  let index = 0
  return {
    candidate: () => ids[index++] ?? `generated-${index}`,
  }
}
