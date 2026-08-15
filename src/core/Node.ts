import { EventTarget } from './EventTarget'
import { Message } from './Message'

/** Mirrors Ooui/Node.cs: adds a child list and insert/remove message plumbing. */
export abstract class Node extends EventTarget {
  private readonly _children: Node[] = []
  private readonly _childMessageHandlers = new WeakMap<
    Node,
    (m: Message) => void
  >()

  /** Overridden by TextNode; lets Node.text avoid creating throwaway TextNodes. */
  protected readonly isTextNode: boolean = false

  get children(): readonly Node[] {
    return this._children.slice()
  }

  get firstChild(): Node | null {
    return this._children.length > 0 ? this._children[0]! : null
  }

  get text(): string {
    return this._children.map(c => c.text).join('')
  }

  set text(value: string) {
    if (this._children.length === 1 && this._children[0]!.isTextNode) {
      this._children[0]!.text = value ?? ''
      return
    }
    this.replaceAll(this.createTextNode(value ?? ''))
  }

  /** Hook so Node doesn't need to import TextNode (would be circular). Set by TextNode module on first load. */
  private createTextNode(text: string): Node {
    return textNodeFactory(text)
  }

  protected constructor(tagName: string) {
    super(tagName)
  }

  override getElementById(id: string): EventTarget | null {
    if (id === this.id) return this
    for (const c of this._children) {
      const r = c.getElementById(id)
      if (r) return r
    }
    return null
  }

  appendChild<T extends Node>(newChild: T): T {
    return this.insertBefore(newChild, null)
  }

  insertBefore<T extends Node>(newChild: T, referenceChild: Node | null): T {
    if (referenceChild == null) {
      this._children.push(newChild)
    } else {
      const index = this._children.indexOf(referenceChild)
      if (index < 0) {
        throw new Error('Reference must be a child of this element')
      }
      this._children.splice(index, 0, newChild)
    }
    const handler = (message: Message) => this.send(message)
    this._childMessageHandlers.set(newChild, handler)
    newChild.onMessageSent(handler)
    this.call('insertBefore', newChild, referenceChild)
    this.onChildInsertedBefore(newChild, referenceChild)
    return newChild
  }

  removeChild<T extends Node>(child: T): T {
    const index = this._children.indexOf(child)
    if (index < 0) {
      throw new Error('Child not contained in this element')
    }
    this._children.splice(index, 1)
    const handler = this._childMessageHandlers.get(child)
    if (handler) child.offMessageSent(handler)
    this.call('removeChild', child)
    this.onChildRemoved(child)
    return child
  }

  protected onChildInsertedBefore(
    _newChild: Node,
    _referenceChild: Node | null
  ): void {}
  protected onChildRemoved(_child: Node): void {}

  protected replaceAll(newNode: Node): void {
    const toRemove = this._children.slice()
    this._children.length = 0
    for (const child of toRemove) {
      const handler = this._childMessageHandlers.get(child)
      if (handler) child.offMessageSent(handler)
      this.call('removeChild', child)
    }
    this.insertBefore(newNode, null)
  }

  protected override saveStateMessageIfNeeded(message: Message): boolean {
    if (message.id === this.id) {
      if (message.m === 'call' && message.k === 'insertBefore') {
        this.addStateMessage(message)
      } else if (
        message.m === 'call' &&
        message.k === 'removeChild' &&
        Array.isArray(message.v) &&
        message.v.length === 1
      ) {
        const mchild = (message.v as unknown[])[0]
        this.updateStateMessages(state => {
          let nextChild: unknown = null
          for (let i = 0; i < state.length;) {
            const x = state[i]!
            if (
              x.k === 'insertBefore' &&
              Array.isArray(x.v) &&
              x.v.length === 2 &&
              x.v[0] === mchild
            ) {
              nextChild = x.v[1]
              state.splice(i, 1)
            } else if (
              x.k === 'insertBefore' &&
              Array.isArray(x.v) &&
              x.v.length === 2 &&
              x.v[1] === mchild
            ) {
              state[i] = Message.call(
                this.id,
                'insertBefore',
                x.v[0],
                nextChild
              )
              i++
            } else {
              i++
            }
          }
        })
      } else {
        super.saveStateMessageIfNeeded(message)
      }
      return true
    } else {
      for (const c of this._children) {
        if (c.saveStateMessageIfNeeded(message)) return true
      }
      return false
    }
  }

  protected override triggerEventFromMessage(message: Message): boolean {
    if (message.id === this.id) {
      if (super.triggerEventFromMessage(message)) return true
    } else {
      for (const c of this._children) {
        if (c.triggerEventFromMessage(message)) return true
      }
    }
    return false
  }
}

// TextNode registers itself here to avoid a circular import at module-load time.
let _textNodeFactory: ((text: string) => Node) | null = null
export function registerTextNodeFactory(factory: (text: string) => Node): void {
  _textNodeFactory = factory
}
function textNodeFactory(text: string): Node {
  if (!_textNodeFactory) throw new Error('TextNode module not loaded')
  return _textNodeFactory(text)
}
