import { FormControl } from './FormControl'
import type { Message } from '../core/Message'
import type { TargetEventHandler } from '../core/EventTarget'

export class TextArea extends FormControl {
  onChange(handler: TargetEventHandler): void {
    this.addEventListener('change', handler)
  }
  onInput(handler: TargetEventHandler): void {
    this.addEventListener('input', handler)
  }

  private val = ''
  get value(): string {
    return this.val
  }
  set value(v: string) {
    this.setProperty(
      () => this.val,
      x => (this.val = x),
      v ?? '',
      'value',
      'value'
    )
  }

  get rows(): number {
    return this.getAttributeOr('rows', 2)
  }
  set rows(value: number) {
    this.setAttributeProperty('rows', value, 'rows')
  }

  get columns(): number {
    return this.getAttributeOr('cols', 20)
  }
  set columns(value: number) {
    this.setAttributeProperty('cols', value, 'columns')
  }

  constructor(text?: string) {
    super('textarea')
    this.onChange(() => {})
    if (text !== undefined) this.value = text
  }

  protected override triggerEventFromMessage(message: Message): boolean {
    if (
      message.id === this.id &&
      message.m === 'event' &&
      (message.k === 'change' || message.k === 'input' || message.k === 'keyup')
    ) {
      const v = message.v != null ? String(message.v) : ''
      if (this.val !== v) {
        this.val = v
        this.firePropertyChanged('value')
      }
    }
    return super.triggerEventFromMessage(message)
  }
}
