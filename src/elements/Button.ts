import { FormControl } from './FormControl'
import type { TargetEventHandler } from '../core/EventTarget'

export type ButtonType = 'submit' | 'reset' | 'button'

export class Button extends FormControl {
  get type(): ButtonType {
    return this.getAttributeOr<ButtonType>('type', 'submit')
  }
  set type(value: ButtonType) {
    this.setAttributeProperty('type', value, 'type')
  }

  constructor(text?: string, clickHandler?: TargetEventHandler) {
    super('button')
    if (text !== undefined) this.text = text
    if (clickHandler) this.onClick(clickHandler)
  }
}
