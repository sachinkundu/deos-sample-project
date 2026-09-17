import { describe, expect, it } from 'vitest'
import { QueueController } from '../src/controller'
import { createBrowserIdGenerator } from '../src/id'
import { createQueueStorage, serializeQueue } from '../src/storage'
import { STORAGE_KEY } from '../src/types'
import { MemoryStorage, sequenceIds } from './helpers'

function setup(...ids: string[]) {
  const raw = new MemoryStorage()
  const controller = new QueueController(createQueueStorage(raw), sequenceIds(...ids))
  return { raw, controller }
}

describe('QueueController', () => {
  it('adds trimmed books in To read and derives counts', () => {
    const { controller, raw } = setup('book-1')
    expect(controller.submitAdd('  Kindred ', ' Octavia E. Butler  ')).toBe(true)
    expect(controller.view().books).toEqual([
      { id: 'book-1', title: 'Kindred', author: 'Octavia E. Butler', status: 'to-read' },
    ])
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 0, finished: 0 })
    expect(raw.writes).toBe(1)
  })

  it('moves in every direction without changing insertion order', () => {
    const { controller } = setup('kindred', 'dune')
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    controller.submitAdd('Dune', 'Frank Herbert')
    controller.changeStatus('kindred', 'reading')
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 1, finished: 0 })
    controller.changeStatus('kindred', 'finished')
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 0, finished: 1 })
    controller.changeStatus('kindred', 'to-read')
    expect(controller.view().books.map((book) => book.id)).toEqual(['kindred', 'dune'])
    expect(controller.view().counts).toEqual({ 'to-read': 2, reading: 0, finished: 0 })
  })

  it('edits title and author while retaining the latest saved status', () => {
    const { controller } = setup('dune')
    controller.submitAdd('Dune', 'Frank Herbert')
    controller.beginEdit('dune')
    controller.changeStatus('dune', 'reading')
    expect(controller.submitEdit('dune', 'Dune Messiah', 'Frank Herbert')).toBe(true)
    expect(controller.view().books[0]).toEqual({
      id: 'dune', title: 'Dune Messiah', author: 'Frank Herbert', status: 'reading',
    })
  })

  it('deletes a book and reduces only its prior status count', () => {
    const { controller } = setup('kindred', 'dune')
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    controller.submitAdd('Dune', 'Frank Herbert')
    controller.changeStatus('dune', 'reading')
    expect(controller.deleteBook('dune')).toBe(true)
    expect(controller.view().books.map((book) => book.title)).toEqual(['Kindred'])
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 0, finished: 0 })
  })

  it('keeps global counts while filtering and keeps an empty active filter selected', () => {
    const { controller } = setup('kindred', 'dune')
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    controller.submitAdd('Dune', 'Frank Herbert')
    controller.changeStatus('kindred', 'reading')
    controller.selectFilter('reading')
    expect(controller.view().visibleBooks.map((book) => book.title)).toEqual(['Kindred'])
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 1, finished: 0 })
    controller.changeStatus('kindred', 'finished')
    expect(controller.view().selectedFilter).toBe('reading')
    expect(controller.view().visibleBooks).toEqual([])
    expect(controller.view().counts).toEqual({ 'to-read': 1, reading: 0, finished: 1 })
  })

  it('reports both blank fields and never mutates or writes', () => {
    const { controller, raw } = setup('unused')
    expect(controller.submitAdd('   ', '\n')).toBe(false)
    expect(controller.view().fieldErrors).toEqual({ title: 'Add a title.', author: 'Add an author.' })
    expect(controller.view().books).toEqual([])
    expect(raw.writes).toBe(0)
  })

  it('rejects a blank edit while preserving saved data and the edit draft', () => {
    const { controller, raw } = setup('kindred')
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    controller.beginEdit('kindred')
    expect(controller.submitEdit('kindred', 'Kindred', '   ')).toBe(false)
    expect(controller.view().books[0]?.author).toBe('Octavia E. Butler')
    expect(controller.view().draftAuthor).toBe('   ')
    expect(controller.view().editingBookId).toBe('kindred')
    expect(raw.writes).toBe(1)
  })

  it('does not commit memory on write failure, retains draft, and later recovers', () => {
    const { controller, raw } = setup('kindred', 'kindred-retry')
    raw.throwOnWrite = true
    expect(controller.submitAdd('Kindred', 'Octavia E. Butler')).toBe(false)
    expect(controller.view().books).toEqual([])
    expect(controller.view().draftTitle).toBe('Kindred')
    expect(controller.view().storageError).toMatch(/could not be saved/i)
    raw.throwOnWrite = false
    expect(controller.submitAdd()).toBe(true)
    expect(controller.view().books).toHaveLength(1)
    expect(controller.view().storageError).toBeNull()
  })

  it('rejects stale and unknown commands without writing', () => {
    const { controller, raw } = setup('kindred')
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    const writes = raw.writes
    expect(controller.deleteBook('missing')).toBe(false)
    expect(controller.view().actionError).toMatch(/no longer/i)
    expect(controller.changeStatus('kindred', 'paused')).toBe(false)
    expect(controller.view().actionError).toMatch(/choose To read/i)
    expect(controller.submitEdit('missing', 'X', 'Y')).toBe(false)
    expect(controller.view().actionError).toMatch(/no longer/i)
    expect(raw.writes).toBe(writes)
  })

  it('clears a superseded action error on the next valid command', () => {
    const { controller } = setup('kindred')
    controller.deleteBook('missing')
    expect(controller.view().actionError).not.toBeNull()
    controller.submitAdd('Kindred', 'Octavia E. Butler')
    expect(controller.view().actionError).toBeNull()
  })
})

describe('storage loading and round trips', () => {
  it('loads a missing key as an empty queue without rewriting it', () => {
    const raw = new MemoryStorage()
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('one'))
    expect(controller.view().books).toEqual([])
    expect(controller.view().loadError).toBeNull()
    expect(raw.writes).toBe(0)
  })

  it('restores a valid queue in insertion order with correct counts', () => {
    const raw = new MemoryStorage()
    raw.values.set(STORAGE_KEY, serializeQueue([
      { id: 'a', title: 'Kindred', author: 'Octavia E. Butler', status: 'finished' },
      { id: 'b', title: 'Dune', author: 'Frank Herbert', status: 'reading' },
    ]))
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('c'))
    expect(controller.view().books.map((book) => book.id)).toEqual(['a', 'b'])
    expect(controller.view().counts).toEqual({ 'to-read': 0, reading: 1, finished: 1 })
    expect(controller.view().selectedFilter).toBe('all')
  })

  it.each([
    ['invalid JSON', '{bad'],
    ['wrong version', JSON.stringify({ version: 2, books: [] })],
    ['invalid book', JSON.stringify({ version: 1, books: [{ id: 'a', title: '', author: 'A', status: 'to-read' }] })],
    ['duplicate ID', JSON.stringify({ version: 1, books: [
      { id: 'a', title: 'One', author: 'A', status: 'to-read' },
      { id: 'a', title: 'Two', author: 'B', status: 'reading' },
    ] })],
  ])('rejects %s without rewriting the stored value', (_name, stored) => {
    const raw = new MemoryStorage()
    raw.values.set(STORAGE_KEY, stored)
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('new'))
    expect(controller.view().books).toEqual([])
    expect(controller.view().loadError).not.toBeNull()
    expect(controller.view().counts).toEqual({ 'to-read': 0, reading: 0, finished: 0 })
    expect(raw.values.get(STORAGE_KEY)).toBe(stored)
    expect(raw.writes).toBe(0)
  })

  it('reports read failures separately with zero counts', () => {
    const raw = new MemoryStorage()
    raw.throwOnRead = true
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('one'))
    expect(controller.view().storageError).toMatch(/could not be read/i)
    expect(controller.view().loadError).toBeNull()
    expect(controller.view().counts).toEqual({ 'to-read': 0, reading: 0, finished: 0 })
  })

  it('round-trips edits, statuses, deletion, order, and counts through recreation', () => {
    const raw = new MemoryStorage()
    const first = new QueueController(createQueueStorage(raw), sequenceIds('a', 'b', 'c'))
    first.submitAdd('Kindred', 'Octavia E. Butler')
    first.submitAdd('Dune', 'Frank Herbert')
    first.submitAdd('The Dispossessed', 'Ursula K. Le Guin')
    first.changeStatus('a', 'finished')
    first.changeStatus('b', 'reading')
    first.submitEdit('c', 'The Dispossessed', 'Ursula Le Guin')
    first.deleteBook('b')
    const restored = new QueueController(createQueueStorage(raw), sequenceIds('d'))
    expect(restored.view().books).toEqual([
      { id: 'a', title: 'Kindred', author: 'Octavia E. Butler', status: 'finished' },
      { id: 'c', title: 'The Dispossessed', author: 'Ursula Le Guin', status: 'to-read' },
    ])
    expect(restored.view().counts).toEqual({ 'to-read': 1, reading: 0, finished: 1 })
  })
})

describe('ID generation', () => {
  it('uses crypto.randomUUID when it succeeds', () => {
    const generator = createBrowserIdGenerator({ randomUUID: () => 'uuid-value' }, () => 1)
    expect(generator.candidate()).toBe('uuid-value')
  })

  it('uses timestamp and a monotonic counter when randomUUID is absent', () => {
    const generator = createBrowserIdGenerator({}, () => 1_700_000_000_000)
    expect(generator.candidate()).toBe('local-loyw3v28-1')
    expect(generator.candidate()).toBe('local-loyw3v28-2')
  })

  it('uses the fallback when randomUUID throws', () => {
    const generator = createBrowserIdGenerator({ randomUUID: () => { throw new Error('blocked') } }, () => 36)
    expect(generator.candidate()).toBe('local-10-1')
  })

  it('retries a collision and succeeds on the next candidate', () => {
    const raw = new MemoryStorage()
    raw.values.set(STORAGE_KEY, serializeQueue([
      { id: 'taken', title: 'Existing', author: 'Author', status: 'to-read' },
    ]))
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('taken', 'unique'))
    expect(controller.submitAdd('New', 'Writer')).toBe(true)
    expect(controller.view().books[1]?.id).toBe('unique')
  })

  it('stops after three collisions without serializing or mutating', () => {
    const raw = new MemoryStorage()
    raw.values.set(STORAGE_KEY, serializeQueue([
      { id: 'taken', title: 'Existing', author: 'Author', status: 'to-read' },
    ]))
    const controller = new QueueController(createQueueStorage(raw), sequenceIds('taken', 'taken', 'taken', 'unused'))
    expect(controller.submitAdd('New', 'Writer')).toBe(false)
    expect(controller.view().books).toHaveLength(1)
    expect(controller.view().actionError).toMatch(/unique book ID/i)
    expect(raw.writes).toBe(0)
  })

  it('rejects duplicate IDs before serialization', () => {
    expect(() => serializeQueue([
      { id: 'same', title: 'One', author: 'A', status: 'to-read' },
      { id: 'same', title: 'Two', author: 'B', status: 'reading' },
    ])).toThrow(/invalid or duplicate/i)
  })
})
