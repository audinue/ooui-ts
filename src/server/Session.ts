import type { Element } from '../core/Element'
import type { EventTarget } from '../core/EventTarget'
import { Message } from '../core/Message'

export type ErrorLogger = (message: string, err: unknown) => void

/**
 * Message-queueing half of a live connection. Mirrors Ooui/Session.cs:
 * before a message referencing some target/value goes out, make sure the
 * client already knows that target exists (by replaying its create/listen
 * history first).
 */
export class Session {
  protected readonly element: Element
  protected readonly initialWidth: number
  protected readonly initialHeight: number
  protected readonly createdIds: Set<string>
  protected readonly queuedMessages: Message[] = []
  private readonly errorLogger?: ErrorLogger

  constructor(
    element: Element,
    initialWidth: number,
    initialHeight: number,
    errorLogger?: ErrorLogger
  ) {
    this.element = element
    this.initialWidth = initialWidth
    this.initialHeight = initialHeight
    this.errorLogger = errorLogger

    this.createdIds = new Set(['window', 'document', 'document.body'])
  }

  private queueStateMessages(target: EventTarget | null): void {
    if (target == null) return
    let created = false
    for (const m of target.stateMessagesSnapshot) {
      if (m.m === 'create') {
        this.createdIds.add(m.id)
        created = true
      }
      if (created) {
        this.queueMessageInner(m)
      }
    }
  }

  private queueMessageInner(message: Message): void {
    if (!this.createdIds.has(message.id)) {
      this.queueStateMessages(this.element.getElementById(message.id))
    }

    const v = message.v
    if (isEventTarget(v)) {
      if (!this.createdIds.has(v.id)) this.queueStateMessages(v)
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (isEventTarget(item) && !this.createdIds.has(item.id)) {
          this.queueStateMessages(item)
        }
      }
    }

    this.queuedMessages.push(message)
  }

  protected queueMessage(message: Message): void {
    this.queueMessageInner(message)
  }

  protected error(message: string, err: unknown): void {
    this.errorLogger?.(message, err)
  }
}

function isEventTarget(v: unknown): v is EventTarget {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as EventTarget).id === 'string' &&
    typeof (v as EventTarget).getElementById === 'function'
  )
}
