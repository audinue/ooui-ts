import { Element } from '../core/Element'

export class Image extends Element {
  get source(): string {
    return this.getStringAttribute('src', '')
  }
  set source(value: string) {
    this.setAttributeProperty('src', value, 'source')
  }

  constructor(source?: string) {
    super('img')
    if (source !== undefined) this.source = source
  }
}
