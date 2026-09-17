import { FILTERS, STATUSES, isBookStatus, isQueueFilter } from './types'
import type { Book, BookStatus, FieldErrors, QueueFilter, QueueState, QueueView } from './types'
import type { IdGenerator } from './id'
import type { QueueStorage } from './storage'

const EMPTY_COUNTS: Record<BookStatus, number> = {
  'to-read': 0,
  reading: 0,
  finished: 0,
}

export type QueueListener = (view: QueueView) => void

export class QueueController {
  private state: QueueState = {
    books: [],
    selectedFilter: 'all',
    editingBookId: null,
    draftTitle: '',
    draftAuthor: '',
    fieldErrors: {},
    loadError: null,
    actionError: null,
    storageError: null,
  }
  private readonly listeners = new Set<QueueListener>()

  constructor(
    private readonly storage: QueueStorage,
    private readonly ids: IdGenerator,
  ) {
    const loaded = storage.load()
    if (loaded.ok) {
      this.state.books = loaded.books
    } else if (loaded.kind === 'load') {
      this.state.loadError = loaded.message
    } else {
      this.state.storageError = loaded.message
    }
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener)
    listener(this.view())
    return () => this.listeners.delete(listener)
  }

  view(): QueueView {
    const counts = { ...EMPTY_COUNTS }
    for (const book of this.state.books) counts[book.status] += 1
    const visibleBooks = this.state.selectedFilter === 'all'
      ? this.state.books
      : this.state.books.filter((book) => book.status === this.state.selectedFilter)

    return {
      ...this.state,
      books: this.state.books.map((book) => ({ ...book })),
      fieldErrors: { ...this.state.fieldErrors },
      counts,
      visibleBooks: visibleBooks.map((book) => ({ ...book })),
    }
  }

  setDraft(field: 'title' | 'author', value: string): void {
    if (field === 'title') this.state.draftTitle = value
    else this.state.draftAuthor = value
  }

  beginAdd(): void {
    this.startCommand()
    this.state.editingBookId = null
    this.state.draftTitle = ''
    this.state.draftAuthor = ''
    this.emit()
  }

  beginEdit(id: string): void {
    this.startCommand()
    const book = this.state.books.find((candidate) => candidate.id === id)
    if (!book) {
      this.state.editingBookId = null
      this.state.actionError = 'That book is no longer in the queue.'
    } else {
      this.state.editingBookId = id
      this.state.draftTitle = book.title
      this.state.draftAuthor = book.author
    }
    this.emit()
  }

  cancelEdit(): void {
    this.startCommand()
    this.state.editingBookId = null
    this.state.draftTitle = ''
    this.state.draftAuthor = ''
    this.emit()
  }

  submitAdd(title = this.state.draftTitle, author = this.state.draftAuthor): boolean {
    this.startCommand()
    this.state.editingBookId = null
    this.state.draftTitle = title
    this.state.draftAuthor = author
    if (!this.validateDraft(title, author)) return this.fail()

    const id = this.createUniqueId()
    if (!id) return this.fail()

    const candidate = [
      ...this.state.books,
      { id, title: title.trim(), author: author.trim(), status: 'to-read' as const },
    ]
    return this.commit(candidate, true)
  }

  submitEdit(
    id = this.state.editingBookId,
    title = this.state.draftTitle,
    author = this.state.draftAuthor,
  ): boolean {
    this.startCommand()
    this.state.draftTitle = title
    this.state.draftAuthor = author
    if (!id) {
      this.state.actionError = 'Choose a saved book before editing it.'
      return this.fail()
    }
    if (!this.validateDraft(title, author)) return this.fail()

    const index = this.state.books.findIndex((book) => book.id === id)
    if (index < 0) {
      this.state.editingBookId = null
      this.state.actionError = 'That book is no longer in the queue.'
      return this.fail()
    }

    const current = this.state.books[index]
    if (!current) return this.fail()
    const candidate = this.state.books.map((book) =>
      book.id === id
        ? { ...book, title: title.trim(), author: author.trim(), status: current.status }
        : book,
    )
    return this.commit(candidate, true)
  }

  deleteBook(id: string): boolean {
    this.startCommand()
    if (!this.state.books.some((book) => book.id === id)) {
      this.state.actionError = 'That book is no longer in the queue.'
      return this.fail()
    }
    return this.commit(this.state.books.filter((book) => book.id !== id), false)
  }

  changeStatus(id: string, status: string): boolean {
    this.startCommand()
    if (!isBookStatus(status)) {
      this.state.actionError = 'Choose To read, Reading, or Finished.'
      return this.fail()
    }
    if (!this.state.books.some((book) => book.id === id)) {
      this.state.actionError = 'That book is no longer in the queue.'
      return this.fail()
    }
    const candidate = this.state.books.map((book) =>
      book.id === id ? { ...book, status } : book,
    )
    return this.commit(candidate, false)
  }

  selectFilter(filter: string): void {
    this.startCommand()
    if (!isQueueFilter(filter)) {
      this.state.actionError = 'That queue filter is not available.'
      this.emit()
      return
    }
    this.state.selectedFilter = filter
    this.emit()
  }

  private startCommand(): void {
    this.state.actionError = null
    this.state.fieldErrors = {}
  }

  private validateDraft(title: string, author: string): boolean {
    const errors: FieldErrors = {}
    if (!title.trim()) errors.title = 'Add a title.'
    if (!author.trim()) errors.author = 'Add an author.'
    this.state.fieldErrors = errors
    return Object.keys(errors).length === 0
  }

  private createUniqueId(): string | null {
    const existing = new Set(this.state.books.map((book) => book.id))
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidate = this.ids.candidate()
      if (candidate && !existing.has(candidate)) return candidate
    }
    this.state.actionError = 'A unique book ID could not be created. Try adding the book again.'
    return null
  }

  private commit(candidate: Book[], clearDraft: boolean): boolean {
    try {
      this.storage.save(candidate)
    } catch {
      this.state.storageError = 'Your change could not be saved. Your previous queue is still intact; please try again.'
      return this.fail()
    }

    this.state.books = candidate
    this.state.loadError = null
    this.state.storageError = null
    this.state.actionError = null
    if (clearDraft) {
      this.state.editingBookId = null
      this.state.draftTitle = ''
      this.state.draftAuthor = ''
      this.state.fieldErrors = {}
    }
    this.emit()
    return true
  }

  private fail(): false {
    this.emit()
    return false
  }

  private emit(): void {
    const view = this.view()
    for (const listener of this.listeners) listener(view)
  }
}

export { FILTERS, STATUSES }
export type { QueueFilter }
