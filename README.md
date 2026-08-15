# ooui-ts

TypeScript/Bun port of [Ooui](https://github.com/praeclarum/ooui): build a UI as
a server-side DOM tree, and Ooui keeps a real browser DOM in sync with it over
a WebSocket. All app logic and state live on the server; the client is a thin
~250-line script that applies patch messages and reports back events.

Ported: the core element model (`Node`/`Element`/`Document`/`Window`/`Body`),
the full message protocol (`create`/`set`/`setAttr`/`remAttr`/`call`/`listen`/`event`),
inline styles, and the common HTML elements (`Div`, `Span`, `Paragraph`,
`Heading`, `Anchor`, `Label`, `Image`, `List`/`ListItem`, `Form`, `Button`,
`Input`, `TextArea`, `Select`/`Option`). Not ported: `Ooui.Forms` (Xamarin.Forms
renderers) and `Ooui.Wasm` (Mono/WebAssembly client) — neither has a TS/browser
equivalent.

## Run the example

```sh
bun install
bun run example
```

Then open:

- `http://localhost:8080/` — index
- `http://localhost:8080/button` — shared click counter
- `http://localhost:8080/todo` — shared todo list

## Usage

```ts
import { UI, Div, Button } from './src/index'

function makeApp() {
  const button = new Button('Click me!')
  let count = 0
  button.onClick(() => {
    count++
    button.text = `Clicked ${count} times`
  })
  return button
}

UI.publish('/button', makeApp)
await UI.start()
```

Every connected browser tab gets its own `WebSocketSession`; if you publish a
shared element instance (like the C# sample's `UI.Publish(path, element)`
overload) rather than a factory, all tabs share the same state.
