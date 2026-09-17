import { QueueController } from './controller'
import { FILTER_LABELS, FILTERS, STATUS_LABELS, STATUSES } from './types'
import type { Book, BookStatus, QueueView } from './types'

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function field(
  id: string,
  labelText: string,
  value: string,
  error: string | undefined,
  onInput: (value: string) => void,
): HTMLDivElement {
  const wrapper = element('div', 'field')
  const label = element('label', 'field__label', labelText)
  label.htmlFor = id
  const input = element('input', 'field__input')
  input.id = id
  input.name = id.includes('edit') ? id.replace('book-edit-', 'edit-') : id.replace('book-', '')
  input.value = value
  input.autocomplete = 'off'
  input.setAttribute('aria-invalid', error ? 'true' : 'false')
  const errorId = `${id}-error`
  const message = element('p', 'field__error', error ?? '')
  message.id = errorId
  if (error) input.setAttribute('aria-describedby', errorId)
  input.addEventListener('input', () => onInput(input.value))
  wrapper.append(label, input, message)
  return wrapper
}

function statusBadge(status: BookStatus): HTMLSpanElement {
  const badge = element('span', `status-badge status-badge--${status}`, STATUS_LABELS[status])
  badge.dataset.statusBadge = status
  return badge
}

function bookRow(book: Book, view: QueueView, controller: QueueController): HTMLLIElement {
  const row = element('li', 'book-row')
  row.dataset.bookId = book.id
  row.dataset.title = book.title
  row.dataset.testid = 'book-row'

  if (view.editingBookId === book.id) {
    row.classList.add('book-row--editing')
    const editForm = element('form', 'edit-form')
    editForm.dataset.editForm = book.id
    const heading = element('div', 'edit-form__heading')
    heading.append(element('span', 'eyebrow', 'Editing'), element('strong', '', book.title))
    const fields = element('div', 'edit-form__fields')
    fields.append(
      field('book-edit-title', 'Title', view.draftTitle, view.fieldErrors.title, (value) => controller.setDraft('title', value)),
      field('book-edit-author', 'Author', view.draftAuthor, view.fieldErrors.author, (value) => controller.setDraft('author', value)),
    )
    const actions = element('div', 'edit-form__actions')
    const cancel = element('button', 'button button--quiet', 'Cancel')
    cancel.type = 'button'
    cancel.addEventListener('click', () => controller.cancelEdit())
    const save = element('button', 'button button--primary', 'Save changes')
    save.type = 'submit'
    save.dataset.action = 'save-edit'
    actions.append(cancel, save)
    editForm.append(heading, fields, actions)
    editForm.addEventListener('submit', (event) => {
      event.preventDefault()
      controller.submitEdit()
    })
    row.append(editForm)
    return row
  }

  const marker = element('div', 'book-row__marker')
  marker.setAttribute('aria-hidden', 'true')
  marker.textContent = String(view.books.findIndex((item) => item.id === book.id) + 1).padStart(2, '0')

  const details = element('div', 'book-row__details')
  const title = element('h3', 'book-row__title', book.title)
  title.dataset.bookTitle = ''
  const author = element('p', 'book-row__author')
  author.append(document.createTextNode('by '), element('span', '', book.author))
  author.querySelector('span')?.setAttribute('data-book-author', '')
  details.append(title, author)

  const current = element('div', 'book-row__current')
  current.append(element('span', 'book-row__label', 'Current status'), statusBadge(book.status))

  const statusGroup = element('div', 'status-picker')
  statusGroup.setAttribute('role', 'group')
  statusGroup.setAttribute('aria-label', `Move ${book.title}`)
  for (const status of STATUSES) {
    const button = element('button', 'status-picker__button', STATUS_LABELS[status])
    button.type = 'button'
    button.dataset.status = status
    button.setAttribute('aria-pressed', status === book.status ? 'true' : 'false')
    button.disabled = status === book.status
    button.addEventListener('click', () => controller.changeStatus(book.id, status))
    statusGroup.append(button)
  }

  const actions = element('div', 'book-row__actions')
  const edit = element('button', 'icon-button', 'Edit')
  edit.type = 'button'
  edit.dataset.action = 'edit'
  edit.setAttribute('aria-label', `Edit ${book.title}`)
  edit.addEventListener('click', () => controller.beginEdit(book.id))
  const remove = element('button', 'icon-button icon-button--danger', 'Delete')
  remove.type = 'button'
  remove.dataset.action = 'delete'
  remove.setAttribute('aria-label', `Delete ${book.title}`)
  remove.addEventListener('click', () => controller.deleteBook(book.id))
  actions.append(edit, remove)

  row.append(marker, details, current, statusGroup, actions)
  return row
}

function render(root: HTMLElement, view: QueueView, controller: QueueController): void {
  root.replaceChildren()
  const shell = element('main', 'shell')

  const aside = element('aside', 'composer')
  const brand = element('a', 'brand', 'MARGINALIA')
  brand.href = '#queue-heading'
  brand.setAttribute('aria-label', 'Marginalia reading queue')
  const intro = element('div', 'composer__intro')
  intro.append(
    element('p', 'eyebrow', 'Your next chapter'),
    element('h1', 'composer__title', 'Keep the books you mean to read.'),
    element('p', 'composer__copy', 'A quiet, private queue saved only in this browser.'),
  )

  const addForm = element('form', 'add-form')
  addForm.id = 'book-form'
  addForm.noValidate = true
  const formHeading = element('div', 'add-form__heading')
  formHeading.append(element('span', 'add-form__number', '01'), element('h2', '', 'Add a book'))
  addForm.append(
    formHeading,
    field('book-title', 'Title', view.editingBookId ? '' : view.draftTitle, view.editingBookId ? undefined : view.fieldErrors.title, (value) => {
      if (!view.editingBookId) controller.setDraft('title', value)
    }),
    field('book-author', 'Author', view.editingBookId ? '' : view.draftAuthor, view.editingBookId ? undefined : view.fieldErrors.author, (value) => {
      if (!view.editingBookId) controller.setDraft('author', value)
    }),
  )
  const addButton = element('button', 'button button--accent', 'Add to queue')
  addButton.type = 'submit'
  addButton.append(element('span', 'button__arrow', '↗'))
  addForm.append(addButton)
  addForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const titleInput = addForm.querySelector<HTMLInputElement>('#book-title')
    const authorInput = addForm.querySelector<HTMLInputElement>('#book-author')
    controller.submitAdd(titleInput?.value ?? '', authorInput?.value ?? '')
  })

  const privacy = element('p', 'privacy-note')
  privacy.append(element('span', 'privacy-note__dot'), document.createTextNode(' Stored locally. No account, no sync.'))
  aside.append(brand, intro, addForm, privacy)

  const content = element('section', 'content')
  const header = element('header', 'content__header')
  const titleBlock = element('div')
  titleBlock.append(element('p', 'eyebrow', 'The reading desk'), element('h2', 'content__title', 'Your queue'))
  titleBlock.querySelector('h2')!.id = 'queue-heading'
  const total = element('p', 'total')
  const totalCount = element('strong', '', String(view.books.length).padStart(2, '0'))
  totalCount.dataset.totalCount = ''
  total.append(totalCount, document.createTextNode(view.books.length === 1 ? ' book saved' : ' books saved'))
  header.append(titleBlock, total)

  const errors = element('div', 'message-region')
  errors.setAttribute('aria-live', 'polite')
  errors.setAttribute('aria-atomic', 'true')
  for (const message of [view.loadError, view.actionError, view.storageError].filter(Boolean)) {
    errors.append(element('p', 'message-region__error', message ?? ''))
  }

  const counts = element('section', 'counts')
  counts.setAttribute('aria-label', 'Queue counts')
  for (const status of STATUSES) {
    const card = element('article', `count-card count-card--${status}`)
    const number = element('strong', 'count-card__number', String(view.counts[status]).padStart(2, '0'))
    number.id = `count-${status}`
    number.dataset.count = status
    card.append(number, element('span', 'count-card__label', STATUS_LABELS[status]))
    counts.append(card)
  }

  const toolbar = element('div', 'toolbar')
  toolbar.append(element('p', 'toolbar__label', 'Filter the shelves'))
  const filters = element('div', 'filters')
  filters.setAttribute('role', 'group')
  filters.setAttribute('aria-label', 'Filter books by status')
  for (const filter of FILTERS) {
    const button = element('button', 'filter-button', FILTER_LABELS[filter])
    button.type = 'button'
    button.dataset.filter = filter
    button.setAttribute('aria-pressed', filter === view.selectedFilter ? 'true' : 'false')
    if (filter === view.selectedFilter) button.classList.add('filter-button--selected')
    button.addEventListener('click', () => controller.selectFilter(filter))
    filters.append(button)
  }
  toolbar.append(filters)

  const listRegion = element('section', 'list-region')
  listRegion.setAttribute('aria-labelledby', 'queue-heading')
  if (view.visibleBooks.length === 0) {
    const empty = element('div', 'empty-state')
    empty.dataset.emptyState = view.selectedFilter
    empty.append(
      element('div', 'empty-state__mark', view.selectedFilter === 'all' ? '∷' : '—'),
      element('h3', '', view.selectedFilter === 'all' ? 'Your queue is open.' : `No ${FILTER_LABELS[view.selectedFilter].toLowerCase()} books.`),
      element('p', '', view.selectedFilter === 'all' ? 'Add the first book from the desk on the left.' : 'Choose another filter or move a book into this status.'),
    )
    listRegion.append(empty)
  } else {
    const list = element('ol', 'book-list')
    for (const book of view.visibleBooks) list.append(bookRow(book, view, controller))
    listRegion.append(list)
  }

  content.append(header, errors, counts, toolbar, listRegion)
  shell.append(aside, content)
  root.append(shell)
}

export function mountReadingQueue(root: HTMLElement, controller: QueueController): () => void {
  return controller.subscribe((view) => render(root, view, controller))
}
