import { beforeEach, describe, expect, it } from 'vitest'
import { mountReadingQueue } from '../src/app'
import { QueueController } from '../src/controller'
import { createQueueStorage } from '../src/storage'
import { MemoryStorage, sequenceIds } from './helpers'

function input(selector: string, value: string): HTMLInputElement {
  const node = document.querySelector<HTMLInputElement>(selector)
  if (!node) throw new Error(`Missing input: ${selector}`)
  node.value = value
  node.dispatchEvent(new Event('input', { bubbles: true }))
  return node
}

function click(selector: string): void {
  const node = document.querySelector<HTMLButtonElement>(selector)
  if (!node) throw new Error(`Missing button: ${selector}`)
  node.click()
}

function submit(selector: string): void {
  const form = document.querySelector<HTMLFormElement>(selector)
  if (!form) throw new Error(`Missing form: ${selector}`)
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function setup(...ids: string[]) {
  const root = document.createElement('div')
  root.id = 'app'
  document.body.append(root)
  const raw = new MemoryStorage()
  const controller = new QueueController(createQueueStorage(raw), sequenceIds(...ids))
  mountReadingQueue(root, controller)
  return { root, raw, controller }
}

function add(title: string, author: string): void {
  input('#book-title', title)
  input('#book-author', author)
  submit('#book-form')
}

beforeEach(() => {
  document.body.replaceChildren()
})

describe('reading queue shell', () => {
  it('renders the first-run empty state, all counts, and selected All filter', () => {
    setup('one')
    expect(document.querySelector('[data-empty-state="all"]')?.textContent).toMatch(/queue is open/i)
    expect(document.querySelector('#count-to-read')?.textContent).toBe('00')
    expect(document.querySelector('#count-reading')?.textContent).toBe('00')
    expect(document.querySelector('#count-finished')?.textContent).toBe('00')
    expect(document.querySelector('[data-filter="all"]')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('associates both blank-field errors and recovers through the same form', () => {
    setup('kindred')
    submit('#book-form')
    const title = document.querySelector<HTMLInputElement>('#book-title')!
    const author = document.querySelector<HTMLInputElement>('#book-author')!
    expect(title.getAttribute('aria-describedby')).toBe('book-title-error')
    expect(author.getAttribute('aria-describedby')).toBe('book-author-error')
    expect(document.querySelector('#book-title-error')?.textContent).toBe('Add a title.')
    expect(document.querySelector('#book-author-error')?.textContent).toBe('Add an author.')
    add('Kindred', 'Octavia E. Butler')
    expect(document.querySelectorAll('[data-testid="book-row"]')).toHaveLength(1)
    expect(document.querySelector('#book-title-error')?.textContent).toBe('')
  })

  it('connects add, status, edit, and delete controls to persistence', () => {
    const { raw } = setup('dune')
    add('Dune', 'Frank Herbert')
    click('[data-title="Dune"] [data-status="reading"]')
    expect(document.querySelector('[data-title="Dune"] [data-status-badge]')?.textContent).toBe('Reading')
    click('[data-title="Dune"] [data-action="edit"]')
    input('#book-edit-title', 'Dune Messiah')
    submit('[data-edit-form]')
    expect(document.querySelector('[data-book-title]')?.textContent).toBe('Dune Messiah')
    expect(document.querySelector('[data-status-badge]')?.textContent).toBe('Reading')
    click('[data-title="Dune Messiah"] [data-action="delete"]')
    expect(document.querySelectorAll('[data-testid="book-row"]')).toHaveLength(0)
    expect(raw.writes).toBe(4)
  })

  it('shows selected filters and a filtered empty state without hiding global counts', () => {
    setup('kindred', 'dune')
    add('Kindred', 'Octavia E. Butler')
    add('Dune', 'Frank Herbert')
    click('[data-title="Kindred"] [data-status="reading"]')
    click('[data-filter="finished"]')
    expect(document.querySelector('[data-filter="finished"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('[data-empty-state="finished"]')?.textContent).toMatch(/no finished books/i)
    expect(document.querySelector('#count-to-read')?.textContent).toBe('01')
    expect(document.querySelector('#count-reading')?.textContent).toBe('01')
    expect(document.querySelector('#count-finished')?.textContent).toBe('00')
  })

  it('renders markup-looking values literally without executable elements', () => {
    setup('hostile')
    add('<img src=x onerror=alert(1)>Neuromancer', '<b>William</b> Gibson')
    const row = document.querySelector('[data-testid="book-row"]')!
    expect(row.querySelector('[data-book-title]')?.textContent).toBe('<img src=x onerror=alert(1)>Neuromancer')
    expect(row.querySelector('[data-book-author]')?.textContent).toBe('<b>William</b> Gibson')
    expect(row.querySelector('img')).toBeNull()
    expect(row.querySelector('b')).toBeNull()
  })

  it('announces storage failures while retaining the visible queue and retry draft', () => {
    const { raw } = setup('kindred', 'dune')
    add('Kindred', 'Octavia E. Butler')
    raw.throwOnWrite = true
    add('Dune', 'Frank Herbert')
    expect(document.querySelector('.message-region')?.getAttribute('aria-live')).toBe('polite')
    expect(document.querySelector('.message-region')?.textContent).toMatch(/previous queue is still intact/i)
    expect(document.querySelectorAll('[data-testid="book-row"]')).toHaveLength(1)
    expect(document.querySelector<HTMLInputElement>('#book-title')?.value).toBe('Dune')
  })

  it('keeps the active filter selected when moving its final row away', () => {
    setup('kindred')
    add('Kindred', 'Octavia E. Butler')
    click('[data-title="Kindred"] [data-status="reading"]')
    click('[data-filter="reading"]')
    click('[data-title="Kindred"] [data-status="finished"]')
    expect(document.querySelector('[data-filter="reading"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('[data-empty-state="reading"]')).not.toBeNull()
  })
})
