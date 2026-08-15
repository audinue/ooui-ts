import { Element } from '../core/Element'

export class ListItem extends Element {
  constructor(text?: string) {
    super('li')
    if (text !== undefined) this.text = text
  }
}
