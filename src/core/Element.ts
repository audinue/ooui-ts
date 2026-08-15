import { Node } from './Node'
import { Message } from './Message'
import { Style } from './Style'
import type { TargetEventHandler, MessageSentHandler } from './EventTarget'

/** Minimal shape Element needs from Document, to avoid a circular import (Document -> Body -> Element). */
interface DocumentLike {
  onMessageSent(handler: MessageSentHandler): void
}
let _documentFactory: (() => DocumentLike) | null = null
export function registerDocumentFactory(factory: () => DocumentLike): void {
  _documentFactory = factory
}

/** Base of every HTML element wrapper. Mirrors Ooui/Element.cs. */
export abstract class Element extends Node {
  private readonly attributes = new Map<string, unknown>()
  private _style = new Style()
  private _document: DocumentLike | null = null

  get style(): Style {
    return this._style
  }

  get className(): string {
    return this.getStringAttribute('class', '')
  }
  set className(value: string) {
    this.setAttributeProperty('class', value, 'className')
  }

  get title(): string {
    return this.getStringAttribute('title', '')
  }
  set title(value: string) {
    this.setAttributeProperty('title', value, 'title')
  }

  get isHidden(): boolean {
    return this.getBooleanAttribute('hidden')
  }
  set isHidden(value: boolean) {
    this.setBooleanAttributeProperty('hidden', value, 'isHidden')
  }

  get document(): DocumentLike {
    if (!this._document) {
      if (!_documentFactory) throw new Error('Document module not loaded')
      this._document = _documentFactory()
      this._document.onMessageSent(m => this.send(m))
    }
    return this._document
  }

  /** Signals to the server that this element should take up the entire browser window. */
  get wantsFullScreen(): boolean {
    return false
  }

  protected constructor(tagName: string) {
    super(tagName)
    this.style.onPropertyChanged(cssName => {
      this.sendSet(`style.${jsStyleName(cssName)}`, this.style.get(cssName))
    })
  }

  protected setAttributeProperty(
    attributeName: string,
    newValue: unknown,
    propertyName: string
  ): boolean {
    const old = this.getAttribute(attributeName)
    if (old !== null && old === newValue) return false
    this.setAttribute(attributeName, newValue)
    this.firePropertyChanged(propertyName)
    return true
  }

  protected setBooleanAttributeProperty(
    attributeName: string,
    newValue: boolean,
    propertyName: string
  ): boolean {
    const old = this.getAttribute(attributeName) !== null
    if (old === newValue) return false
    if (newValue) this.setAttribute(attributeName, '')
    else this.removeAttribute(attributeName)
    this.firePropertyChanged(propertyName)
    return true
  }

  protected updateAttributeProperty(
    attributeName: string,
    newValue: unknown,
    propertyName: string
  ): boolean {
    const oldValue = this.attributes.get(attributeName)
    if (
      this.attributes.has(attributeName) &&
      newValue !== null &&
      newValue === oldValue
    )
      return false
    this.attributes.set(attributeName, newValue)
    this.firePropertyChanged(propertyName)
    return true
  }

  protected updateBooleanAttributeProperty(
    attributeName: string,
    newValue: boolean,
    propertyName: string
  ): boolean {
    const oldValue = this.attributes.has(attributeName)
    if (newValue === oldValue) return false
    if (newValue) this.attributes.set(attributeName, '')
    else this.attributes.delete(attributeName)
    this.firePropertyChanged(propertyName)
    return true
  }

  setAttribute(attributeName: string, value: unknown): void {
    this.attributes.set(attributeName, value)
    this.send(Message.setAttribute(this.id, attributeName, value))
  }

  getAttribute(attributeName: string): unknown {
    return this.attributes.has(attributeName)
      ? this.attributes.get(attributeName)
      : null
  }

  getAttributeOr<T>(attributeName: string, defaultValue: T): T {
    const v = this.attributes.get(attributeName)
    return v === undefined ? defaultValue : (v as T)
  }

  getBooleanAttribute(attributeName: string): boolean {
    return this.attributes.has(attributeName)
  }

  getStringAttribute(attributeName: string, defaultValue: string): string {
    if (!this.attributes.has(attributeName)) return defaultValue
    const v = this.attributes.get(attributeName)
    return v === null || v === undefined ? 'null' : String(v)
  }

  removeAttribute(attributeName: string): void {
    const removed = this.attributes.delete(attributeName)
    if (removed) this.send(Message.removeAttribute(this.id, attributeName))
  }

  setCapture(retargetToElement: boolean): void {
    this.call('setCapture', retargetToElement)
  }

  focus(): void {
    this.call('focus')
  }

  // -- events --
  addClickListener(handler: TargetEventHandler): void {
    this.addEventListener('click', handler)
  }
  removeClickListener(handler: TargetEventHandler): void {
    this.removeEventListener('click', handler)
  }
  onClick(handler: TargetEventHandler): void {
    this.addEventListener('click', handler)
  }
  onDoubleClick(handler: TargetEventHandler): void {
    this.addEventListener('dblclick', handler)
  }
  onKeyDown(handler: TargetEventHandler): void {
    this.addEventListener('keydown', handler)
  }
  onKeyPress(handler: TargetEventHandler): void {
    this.addEventListener('keypress', handler)
  }
  onKeyUp(handler: TargetEventHandler): void {
    this.addEventListener('keyup', handler)
  }
  onLoaded(handler: TargetEventHandler): void {
    this.addEventListener('load', handler)
  }
  onMouseDown(handler: TargetEventHandler): void {
    this.addEventListener('mousedown', handler)
  }
  onMouseEnter(handler: TargetEventHandler): void {
    this.addEventListener('mouseenter', handler)
  }
  onMouseLeave(handler: TargetEventHandler): void {
    this.addEventListener('mouseleave', handler)
  }
  onMouseMove(handler: TargetEventHandler): void {
    this.addEventListener('mousemove', handler)
  }
  onMouseOut(handler: TargetEventHandler): void {
    this.addEventListener('mouseout', handler)
  }
  onMouseOver(handler: TargetEventHandler): void {
    this.addEventListener('mouseover', handler)
  }
  onMouseUp(handler: TargetEventHandler): void {
    this.addEventListener('mouseup', handler)
  }
  onWheel(handler: TargetEventHandler): void {
    this.addEventListener('wheel', handler)
  }
}

function jsStyleName(cssName: string): string {
  return cssName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}
