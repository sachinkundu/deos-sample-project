import { STORAGE_KEY, isBookStatus } from './types'
import type { Book, StoredQueue } from './types'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface QueueStorage {
  load():
    | { ok: true; books: Book[] }
    | { ok: false; kind: 'load' | 'storage'; message: string }
  save(books: Book[]): void
}

function isValidBook(value: unknown): value is Book {
  if (!value || typeof value !== 'object') return false
  const book = value as Record<string, unknown>
  return (
    typeof book.id === 'string' &&
    book.id.length > 0 &&
    typeof book.title === 'string' &&
    book.title.trim().length > 0 &&
    typeof book.author === 'string' &&
    book.author.trim().length > 0 &&
    isBookStatus(book.status)
  )
}

export function validateStoredQueue(value: unknown): value is StoredQueue {
  if (!value || typeof value !== 'object') return false
  const envelope = value as Record<string, unknown>
  if (envelope.version !== 1 || !Array.isArray(envelope.books)) return false
  if (!envelope.books.every(isValidBook)) return false
  const ids = envelope.books.map((book) => book.id)
  return new Set(ids).size === ids.length
}

export function serializeQueue(books: Book[]): string {
  const envelope: StoredQueue = { version: 1, books }
  if (!validateStoredQueue(envelope)) {
    throw new Error('The queue contains invalid or duplicate book data.')
  }
  return JSON.stringify(envelope)
}

export function createQueueStorage(storage: StorageLike): QueueStorage {
  return {
    load() {
      let raw: string | null
      try {
        raw = storage.getItem(STORAGE_KEY)
      } catch {
        return {
          ok: false,
          kind: 'storage',
          message: 'Your saved queue could not be read. Browser storage may be unavailable.',
        }
      }

      if (raw === null) return { ok: true, books: [] }

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        return {
          ok: false,
          kind: 'load',
          message: 'Your saved queue is not valid JSON and was not changed.',
        }
      }

      if (!validateStoredQueue(parsed)) {
        return {
          ok: false,
          kind: 'load',
          message: 'Your saved queue has an unsupported or invalid format and was not changed.',
        }
      }

      return { ok: true, books: parsed.books.map((book) => ({ ...book })) }
    },

    save(books) {
      storage.setItem(STORAGE_KEY, serializeQueue(books))
    },
  }
}
