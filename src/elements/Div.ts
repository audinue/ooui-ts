import { Element } from '../core/Element'
import type { Node } from '../core/Node'

export class Div extends Element {
  constructor(children: Node[] = []) {
    super('div')
    for (const c of children) this.appendChild(c)
  }
}
