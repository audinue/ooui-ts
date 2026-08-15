import { EventTarget } from './EventTarget'
import { Window } from './Window'
import { Body } from './Body'
import { registerDocumentFactory } from './Element'

/** Mirrors Ooui/Document.cs. Singleton id "document". */
export class Document extends EventTarget {
  readonly window: Window = new Window()
  readonly body: Body = new Body()

  constructor() {
    super('document')
    this.id = 'document'
    this.window.onMessageSent(m => this.send(m))
    this.body.onMessageSent(m => this.send(m))
  }

  releaseCapture(): void {
    this.call('releaseCapture')
  }

  execCommand(
    commandName: string,
    showDefaultUI: boolean,
    valueArgument?: string
  ): void {
    this.call('execCommand', commandName, showDefaultUI, valueArgument ?? null)
  }
}

registerDocumentFactory(() => new Document())
