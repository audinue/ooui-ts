import { Element } from '../core/Element'

export class Anchor extends Element {
  get href(): string {
    return this.getStringAttribute('href', '')
  }
  set href(value: string) {
    this.setAttributeProperty('href', value, 'href')
  }

  get target(): string {
    return this.getStringAttribute('target', '')
  }
  set target(value: string) {
    this.setAttributeProperty('target', value, 'target')
  }

  constructor(href?: string, text?: string) {
    super('a')
    if (href !== undefined) this.href = href
    if (text !== undefined) this.text = text
  }
}
