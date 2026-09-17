import './styles.css'
import { mountReadingQueue } from './app'
import { QueueController } from './controller'
import { createBrowserIdGenerator } from './id'
import { createQueueStorage } from './storage'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Reading queue root was not found.')

const controller = new QueueController(
  createQueueStorage(window.localStorage),
  createBrowserIdGenerator(),
)

mountReadingQueue(root, controller)
