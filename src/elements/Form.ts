import { Element } from '../core/Element'
import type { TargetEventHandler } from '../core/EventTarget'

export class Form extends Element {
  get action(): string {
    return this.getStringAttribute('action', '')
  }
  set action(value: string) {
    this.setAttributeProperty('action', value, 'action')
  }

  get method(): string {
    return this.getStringAttribute('method', 'GET')
  }
  set method(value: string) {
    this.setAttributeProperty('method', value, 'method')
  }

  get encodingType(): string {
    return this.getStringAttribute(
      'enctype',
      'application/x-www-form-urlencoded'
    )
  }
  set encodingType(value: string) {
    this.setAttributeProperty('enctype', value, 'encodingType')
  }

  onSubmit(handler: TargetEventHandler): void {
    this.addEventListener('submit', handler)
  }
  onReset(handler: TargetEventHandler): void {
    this.addEventListener('reset', handler)
  }

  constructor() {
    super('form')
  }
}
