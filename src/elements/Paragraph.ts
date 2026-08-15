import { Element } from '../core/Element'

export class Paragraph extends Element {
  constructor(text?: string) {
    super('p')
    if (text !== undefined) this.text = text
  }
}
