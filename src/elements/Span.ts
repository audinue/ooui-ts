import { Element } from '../core/Element'

export class Span extends Element {
  constructor(text?: string) {
    super('span')
    if (text !== undefined) this.text = text
  }
}
