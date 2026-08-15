import { FormControl } from './FormControl'
import type { Message } from '../core/Message'
import type { TargetEventHandler } from '../core/EventTarget'

export type InputType =
  | 'text'
  | 'date'
  | 'week'
  | 'datetime'
  | 'datetimelocal'
  | 'time'
  | 'month'
  | 'range'
  | 'number'
  | 'hidden'
  | 'search'
  | 'email'
  | 'tel'
  | 'url'
  | 'password'
  | 'color'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'submit'
  | 'reset'
  | 'image'
  | 'button'

export class Input extends FormControl {
  get type(): InputType {
    return this.getAttributeOr<InputType>('type', 'text')
  }
  set type(value: InputType) {
    this.setAttributeProperty('type', value, 'type')
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

  get numberValue(): number {
    const n = parseFloat(this.value)
    return Number.isNaN(n) ? 0 : n
  }
  set numberValue(v: number) {
    this.value = String(v)
  }

  onChange(handler: TargetEventHandler): void {
    this.addEventListener('change', handler)
  }

  get placeholder(): string {
    return this.getStringAttribute('placeholder', '')
  }
  set placeholder(value: string) {
    this.setAttributeProperty('placeholder', value ?? '', 'placeholder')
  }

  get isChecked(): boolean {
    return this.getBooleanAttribute('checked')
  }
  set isChecked(value: boolean) {
    if (this.setBooleanAttributeProperty('checked', value, 'isChecked')) {
      this.triggerEvent('change')
    }
  }

  get minimum(): number {
    return this.getAttributeOr('min', 0)
  }
  set minimum(value: number) {
    this.setAttributeProperty('min', value, 'minimum')
  }

  get maximum(): number {
    return this.getAttributeOr('max', 100)
  }
  set maximum(value: number) {
    this.setAttributeProperty('max', value, 'maximum')
  }

  get step(): number {
    return this.getAttributeOr('step', 1)
  }
  set step(value: number) {
    this.setAttributeProperty('step', value, 'step')
  }

  constructor(type?: InputType) {
    super('input')
    // Subscribe to the change event so we always get up-to-date values.
    this.onChange(() => {})
    if (type !== undefined) this.type = type
  }

  protected override triggerEventFromMessage(message: Message): boolean {
    if (
      message.id === this.id &&
      message.m === 'event' &&
      (message.k === 'change' || message.k === 'input' || message.k === 'keyup')
    ) {
      if (this.type === 'checkbox') {
        this.updateBooleanAttributeProperty(
          'checked',
          message.v != null ? Boolean(message.v) : false,
          'isChecked'
        )
      } else {
        const v = message.v != null ? String(message.v) : ''
        if (this.val !== v) {
          this.val = v
          this.firePropertyChanged('value')
        }
      }
    }
    return super.triggerEventFromMessage(message)
  }
}
