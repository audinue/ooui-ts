export type MessageType =
  'nop' | 'create' | 'set' | 'setAttr' | 'remAttr' | 'call' | 'listen' | 'event'

/**
 * Wire message exchanged with the browser client. Mirrors Ooui/Message.cs.
 * `v` may contain nested EventTarget references — EventTarget#toJSON()
 * collapses those to their id string during JSON.stringify.
 */
export class Message {
  m: MessageType = 'nop'
  id: string = ''
  k: string = ''
  v: unknown = undefined
  rid?: string

  static call(targetId: string, method: string, ...args: unknown[]): Message {
    const msg = new Message()
    msg.m = 'call'
    msg.id = targetId
    msg.k = method
    msg.v = args
    return msg
  }

  static set(targetId: string, property: string, value: unknown): Message {
    const msg = new Message()
    msg.m = 'set'
    msg.id = targetId
    msg.k = property
    msg.v = value
    return msg
  }

  static event(targetId: string, eventType: string, value?: unknown): Message {
    const msg = new Message()
    msg.m = 'event'
    msg.id = targetId
    msg.k = eventType
    msg.v = value
    return msg
  }

  static setAttribute(targetId: string, name: string, value: unknown): Message {
    const msg = new Message()
    msg.m = 'setAttr'
    msg.id = targetId
    msg.k = name
    msg.v = value
    return msg
  }

  static removeAttribute(targetId: string, name: string): Message {
    const msg = new Message()
    msg.m = 'remAttr'
    msg.id = targetId
    msg.k = name
    return msg
  }

  static create(targetId: string, tagName: string): Message {
    const msg = new Message()
    msg.m = 'create'
    msg.id = targetId
    msg.k = tagName
    return msg
  }

  static listen(targetId: string, eventType: string): Message {
    const msg = new Message()
    msg.m = 'listen'
    msg.id = targetId
    msg.k = eventType
    return msg
  }

  toJSON(): object {
    const o: Record<string, unknown> = { m: this.m, id: this.id, k: this.k }
    if (this.v !== undefined) o.v = this.v
    if (this.rid !== undefined) o.rid = this.rid
    return o
  }

  static fromJson(json: string): Message {
    const raw = JSON.parse(json) as {
      m?: MessageType
      id?: string
      k?: string
      v?: unknown
    }
    const msg = new Message()
    msg.m = raw.m ?? 'nop'
    msg.id = raw.id ?? ''
    msg.k = raw.k ?? ''
    msg.v = raw.v
    return msg
  }
}
