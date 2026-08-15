import { Element } from './Element'

/** Mirrors Ooui/Body.cs. Singleton id "document.body". */
export class Body extends Element {
  constructor() {
    super('Body')
    this.id = 'document.body'
  }
}
