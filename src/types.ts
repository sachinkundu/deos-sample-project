export const STORAGE_KEY = 'reading-queue:v1'
export const STATUSES = ['to-read', 'reading', 'finished'] as const
export const FILTERS = ['all', ...STATUSES] as const

export type BookStatus = (typeof STATUSES)[number]
export type QueueFilter = (typeof FILTERS)[number]

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
}

export interface StoredQueue {
  version: 1
  books: Book[]
}

export interface FieldErrors {
  title?: string
  author?: string
}

export interface QueueState {
  books: Book[]
  selectedFilter: QueueFilter
  editingBookId: string | null
  draftTitle: string
  draftAuthor: string
  fieldErrors: FieldErrors
  loadError: string | null
  actionError: string | null
  storageError: string | null
}

export interface QueueView extends QueueState {
  counts: Record<BookStatus, number>
  visibleBooks: Book[]
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  'to-read': 'To read',
  reading: 'Reading',
  finished: 'Finished',
}

export const FILTER_LABELS: Record<QueueFilter, string> = {
  all: 'All books',
  ...STATUS_LABELS,
}

export function isBookStatus(value: unknown): value is BookStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

export function isQueueFilter(value: unknown): value is QueueFilter {
  return typeof value === 'string' && (FILTERS as readonly string[]).includes(value)
}
