import { Node, registerTextNodeFactory } from '../core/Node'

/** Mirrors Ooui/TextNode.cs. */
export class TextNode extends Node {
  protected override readonly isTextNode = true
  private _text = ''

  override get text(): string {
    return this._text
  }
  override set text(value: string) {
    const v = value ?? ''
    if (this._text === v) return
    this._text = v
    // "data" is the DOM property name for a text node's content.
    this.sendSet('data', v)
    this.firePropertyChanged('text')
  }

  constructor(text = '') {
    super('#text')
    this.text = text
  }
}

registerTextNodeFactory(text => new TextNode(text))
