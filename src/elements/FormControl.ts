import { Element } from '../core/Element'

export abstract class FormControl extends Element {
  get name(): string {
    return this.getStringAttribute('name', '')
  }
  set name(value: string) {
    this.setAttributeProperty('name', value, 'name')
  }

  get isDisabled(): boolean {
    return this.getBooleanAttribute('disabled')
  }
  set isDisabled(value: boolean) {
    this.setBooleanAttributeProperty('disabled', value, 'isDisabled')
  }

  protected constructor(tagName: string) {
    super(tagName)
  }
}
