import { Element } from '../core/Element'

export class Option extends Element {
  get value(): string {
    return this.getStringAttribute('value', '')
  }
  set value(v: string) {
    this.setAttributeProperty('value', v ?? '', 'value')
  }

  get label(): string {
    return this.getStringAttribute('label', '')
  }
  set label(v: string) {
    this.setAttributeProperty('label', v ?? '', 'label')
  }

  get defaultSelected(): boolean {
    return this.getBooleanAttribute('selected')
  }
  set defaultSelected(v: boolean) {
    this.setBooleanAttributeProperty('selected', v, 'defaultSelected')
  }

  constructor() {
    super('option')
  }
}
