import { Element } from '../core/Element'

export class Heading extends Element {
  constructor(levelOrText: number | string = 1, text?: string) {
    if (typeof levelOrText === 'string') {
      super('h1')
      this.text = levelOrText
    } else {
      super(`h${levelOrText}`)
      if (text !== undefined) this.text = text
    }
  }
}
