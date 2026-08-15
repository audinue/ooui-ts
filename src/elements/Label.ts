import { Element } from '../core/Element'

export class Label extends Element {
  get for(): Element | null {
    return this.getAttributeOr<Element | null>('for', null)
  }
  set for(value: Element | null) {
    this.setAttributeProperty('for', value, 'for')
  }

  constructor(text?: string) {
    super('label')
    if (text !== undefined) this.text = text
  }
}
