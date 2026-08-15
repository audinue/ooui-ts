import { EventTarget } from './EventTarget'
import { Message } from './Message'

/** Mirrors Ooui/Window.cs. Singleton id "window". */
export class Window extends EventTarget {
  private _location = ''

  get location(): string {
    return this._location
  }
  set location(value: string) {
    if (!value || this._location === value) return
    this._location = value
    this.send(Message.set('window', 'location', value))
    this.firePropertyChanged('location')
  }

  constructor() {
    super('window')
    this.id = 'window'
  }
}
