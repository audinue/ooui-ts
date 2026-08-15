import { Element } from '../core/Element'

export class List extends Element {
  constructor(ordered = false) {
    super(ordered ? 'ol' : 'ul')
  }
}
