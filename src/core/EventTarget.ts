import { Message } from './Message'

export const ID_PREFIX = '⦙'

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `${ID_PREFIX}${idCounter}`
}

export interface TargetEventArgs {
  offsetX?: number
  offsetY?: number
  clientHeight?: number
  clientWidth?: number
}

export type TargetEventHandler = (
  sender: EventTarget,
  e: TargetEventArgs
) => void
export type MessageSentHandler = (message: Message) => void
export type PropertyChangedHandler = (propertyName: string) => void

/**
 * Base of the server-side DOM mirror. Mirrors Ooui/EventTarget.cs.
 * Every mutation is turned into a Message and broadcast to `messageSent`
 * listeners, which bubble up to whatever Session is watching the root.
 */
export abstract class EventTarget {
  id: string = generateId()
  readonly tagName: string

  private readonly stateMessages: Message[] = []
  private readonly eventListeners = new Map<string, TargetEventHandler[]>()
  private readonly messageSentHandlers: MessageSentHandler[] = []
  private readonly propertyChangedHandlers: PropertyChangedHandler[] = []

  protected constructor(tagName: string) {
    this.tagName = tagName
    this.send(Message.create(this.id, this.tagName))
  }

  toString(): string {
    return `<${this.tagName} id="${this.id}" />`
  }

  /** Collapses to its id when embedded in a Message's `v` during JSON.stringify. */
  toJSON(): string {
    return this.id
  }

  getElementById(id: string): EventTarget | null {
    return id === this.id ? this : null
  }

  onMessageSent(handler: MessageSentHandler): void {
    this.messageSentHandlers.push(handler)
  }

  offMessageSent(handler: MessageSentHandler): void {
    const i = this.messageSentHandlers.indexOf(handler)
    if (i >= 0) this.messageSentHandlers.splice(i, 1)
  }

  onPropertyChanged(handler: PropertyChangedHandler): void {
    this.propertyChangedHandlers.push(handler)
  }

  get stateMessagesSnapshot(): readonly Message[] {
    return this.stateMessages.slice()
  }

  addEventListener(
    eventType: string | null,
    handler: TargetEventHandler | null
  ): void {
    if (eventType == null || handler == null) return
    let handlers = this.eventListeners.get(eventType)
    let sendListen = false
    if (!handlers) {
      handlers = []
      this.eventListeners.set(eventType, handlers)
      sendListen = true
    }
    handlers.push(handler)
    if (sendListen) this.send(Message.listen(this.id, eventType))
  }

  removeEventListener(
    eventType: string | null,
    handler: TargetEventHandler | null
  ): void {
    if (eventType == null || handler == null) return
    const handlers = this.eventListeners.get(eventType)
    if (!handlers) return
    const i = handlers.indexOf(handler)
    if (i >= 0) handlers.splice(i, 1)
  }

  protected setProperty<T>(
    getCurrent: () => T,
    setBacking: (v: T) => void,
    newValue: T,
    jsPropertyName: string,
    propertyName: string
  ): boolean {
    if (getCurrent() === newValue) return false
    setBacking(newValue)
    this.sendSet(jsPropertyName, newValue)
    this.firePropertyChanged(propertyName)
    return true
  }

  protected firePropertyChanged(propertyName: string): void {
    for (const h of this.propertyChangedHandlers) h(propertyName)
  }

  static readonly IdPrefix: string = ID_PREFIX

  send(message: Message | null): void {
    if (message == null) return
    if (message.id === this.id) this.saveStateMessageIfNeeded(message)
    for (const h of this.messageSentHandlers) h(message)
  }

  call(methodName: string, ...args: unknown[]): void {
    this.send(Message.call(this.id, methodName, ...args))
  }

  protected sendSet(jsPropertyName: string, value: unknown): void {
    this.send(Message.set(this.id, jsPropertyName, value))
  }

  receive(message: Message | null): void {
    if (message == null) return
    this.saveStateMessageIfNeeded(message)
    this.triggerEventFromMessage(message)
  }

  protected addStateMessage(message: Message): void {
    this.stateMessages.push(message)
  }

  protected updateStateMessages(updater: (state: Message[]) => void): void {
    updater(this.stateMessages)
  }

  protected saveStateMessageIfNeeded(message: Message): boolean {
    if (message.id !== this.id) return false

    switch (message.m) {
      case 'create':
        this.addStateMessage(message)
        break
      case 'set':
        this.updateStateMessages(state => {
          for (let i = state.length - 1; i >= 0; i--) {
            if (state[i]!.m === 'set' && state[i]!.k === message.k)
              state.splice(i, 1)
          }
          state.push(message)
        })
        break
      case 'setAttr':
        this.updateStateMessages(state => {
          for (let i = state.length - 1; i >= 0; i--) {
            if (state[i]!.m === 'setAttr' && state[i]!.k === message.k)
              state.splice(i, 1)
          }
          state.push(message)
        })
        break
      case 'remAttr':
        this.updateStateMessages(state => {
          for (let i = state.length - 1; i >= 0; i--) {
            if (state[i]!.m === 'setAttr' && state[i]!.k === message.k)
              state.splice(i, 1)
          }
        })
        return true
      case 'listen':
        this.addStateMessage(message)
        break
    }

    return true
  }

  protected triggerEvent(name: string): boolean {
    const handlers = this.eventListeners.get(name)
    if (handlers && handlers.length > 0) {
      const args: TargetEventArgs = {}
      for (const h of handlers.slice()) h(this, args)
    }
    return true
  }

  protected triggerEventFromMessage(message: Message): boolean {
    if (message.id !== this.id) return false

    const handlers = this.eventListeners.get(message.k)
    if (handlers && handlers.length > 0) {
      const args: TargetEventArgs = {}
      const v = message.v as Record<string, unknown> | undefined
      if (v && typeof v === 'object') {
        if (typeof v.offsetX === 'number') {
          args.offsetX = v.offsetX
          args.offsetY = v.offsetY as number
        }
        if (typeof v.clientHeight === 'number') {
          args.clientHeight = v.clientHeight
          args.clientWidth = v.clientWidth as number
        }
      }
      for (const h of handlers.slice()) h(this, args)
    }
    return true
  }
}
