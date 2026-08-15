import { FormControl } from './FormControl'
import { Option } from './Option'
import type { Message } from '../core/Message'
import type { TargetEventHandler } from '../core/EventTarget'

export class Select extends FormControl {
  private gotValue = false

  get value(): string {
    if (this.gotValue) return this.getStringAttribute('value', '')
    return this.getDefaultValue()
  }
  set value(v: string) {
    this.gotValue = true
    this.setAttributeProperty('value', v ?? '', 'value')
  }

  onChange(handler: TargetEventHandler): void {
    this.addEventListener('change', handler)
  }
  onInput(handler: TargetEventHandler): void {
    this.addEventListener('input', handler)
  }

  constructor() {
    super('select')
    this.onChange(() => {
      this.gotValue = true
    })
  }

  addOption(label: string, value: string): void {
    const o = new Option()
    o.text = label
    o.value = value
    this.appendChild(o)
  }

  private getDefaultValue(): string {
    const options = this.children.filter(
      (c): c is Option => c instanceof Option
    )
    const selected = options.find(o => o.defaultSelected)
    if (selected) return selected.value
    return options[0]?.value ?? ''
  }

  protected override triggerEventFromMessage(message: Message): boolean {
    if (
      message.id === this.id &&
      message.m === 'event' &&
      (message.k === 'change' || message.k === 'input' || message.k === 'keyup')
    ) {
      this.gotValue = true
      this.updateAttributeProperty(
        'value',
        message.v != null ? String(message.v) : '',
        'value'
      )
    }
    return super.triggerEventFromMessage(message)
  }
}
