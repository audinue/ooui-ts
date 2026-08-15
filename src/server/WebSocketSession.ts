import type { ServerWebSocket } from 'bun'
import { Element } from '../core/Element'
import { Message } from '../core/Message'
import { Session, type ErrorLogger } from './Session'

export const MAX_FPS = 30
const THROTTLE_MS = 1000 / MAX_FPS

/**
 * One live browser connection. Mirrors Ooui/WebSocketSession.cs: watches the
 * element tree for outgoing messages, throttles them into batched frames,
 * and applies incoming client messages (events, mostly) to the element tree.
 */
export class WebSocketSession extends Session {
  private ws: ServerWebSocket<unknown> | null = null
  private readonly handleElementMessageSent = (m: Message) =>
    this.queueMessage(m)
  private sendTimer: ReturnType<typeof setTimeout> | null = null
  private lastTransmitTime = 0
  private closed = false

  constructor(
    element: Element,
    initialWidth: number,
    initialHeight: number,
    errorLogger?: ErrorLogger
  ) {
    super(element, initialWidth, initialHeight, errorLogger)
  }

  start(ws: ServerWebSocket<unknown>): void {
    this.ws = ws
    this.element.onMessageSent(this.handleElementMessageSent)

    if (this.element.wantsFullScreen) {
      this.element.style.width = this.initialWidth
      this.element.style.height = this.initialHeight
    }
    this.queueMessage(
      Message.call('document.body', 'appendChild', this.element)
    )
  }

  receive(raw: string): void {
    try {
      const message = Message.fromJson(raw)
      this.element.receive(message)
    } catch (ex) {
      this.error('Failed to process received message', ex)
    }
  }

  stop(): void {
    if (this.closed) return
    this.closed = true
    this.element.offMessageSent(this.handleElementMessageSent)
    if (this.sendTimer) {
      clearTimeout(this.sendTimer)
      this.sendTimer = null
    }
  }

  protected override queueMessage(message: Message): void {
    super.queueMessage(message)
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.closed || this.sendTimer) return
    const now = Date.now()
    const elapsed = now - this.lastTransmitTime
    const delay = Math.max(0, THROTTLE_MS - elapsed)
    this.sendTimer = setTimeout(() => {
      this.sendTimer = null
      this.lastTransmitTime = Date.now()
      this.transmitQueuedMessages()
    }, delay)
  }

  private transmitQueuedMessages(): void {
    if (this.closed || !this.ws) return
    if (this.queuedMessages.length === 0) return
    const toSend = this.queuedMessages.splice(0, this.queuedMessages.length)
    try {
      this.ws.send(JSON.stringify(toSend))
    } catch (ex) {
      this.error('Failed to send queued messages, aborting session', ex)
      this.stop()
    }
  }
}
