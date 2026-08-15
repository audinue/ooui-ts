# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this is

`@audinue/ooui` is a TypeScript/Bun port of [Ooui](https://github.com/praeclarum/ooui)
(the original C#/.NET library by praeclarum). The idea: build your UI as a
server-side tree of `Element` objects; Ooui keeps a real browser DOM in sync
with that tree over a WebSocket. All application state and logic live on the
server — the browser only runs a ~250-line client that applies patch messages
and reports events back. There is no client-side framework, no virtual DOM
diffing, no build step for the app itself.

The original C# repo (`Ooui`, `Ooui.Forms`, `Ooui.Wasm`, `Ooui.AspNetCore`,
samples) was cloned as reference material into a sibling directory,
`../ooui-main`, during the port. Only the **core** `Ooui` library was ported —
`Ooui.Forms` (Xamarin.Forms renderers) and `Ooui.Wasm` (Mono/WebAssembly
client) have no TypeScript/browser equivalent and were intentionally left out.
When in doubt about what a piece of code is _supposed_ to do, the matching
file in `../ooui-main/Ooui/*.cs` is the reference — this port mirrors its
class names, method names, and message protocol closely by design.

## Architecture

```
src/
  core/         EventTarget -> Node -> Element base classes, Document/Window/Body,
                the wire Message type, inline Style, and TokenList (classList).
  elements/     Concrete HTML elements (Div, Button, Input, Form, Select, ...).
  server/       Session (message-queueing), WebSocketSession (Bun websocket glue),
                UI (Bun.serve, route publishing, HTML template, client bundling).
  client/       ooui-client.js — the browser-side script, plain JS on purpose
                (no build step, dev or prod). UI.ts imports it as raw text
                (Bun's `with { type: "text" }` loader) and serves it as-is at
                /ooui.js. ooui-client.d.ts is a hand-written sibling type
                (not generated) so tsc can type the text import — see Build.
  index.ts      Public barrel export.
examples/
  app.ts        Runnable sample app (button counter + todo list), also the
                route source tests/e2e.test.ts imports and drives.
tests/
  e2e.test.ts   bun:test + playwright (library, not the @playwright/test
                runner) driving a real headless Chromium against a live
                server. This is the primary correctness check — it proves the
                browser DOM actually stays in sync with server-side state.
dist/           Build output (git-ignored, published to npm). See "Build".
```

### The message protocol

Every mutation to an `Element` (set a property, set/remove an attribute, call
a DOM method, insert/remove a child, listen for an event) turns into a
`Message` (`src/core/Message.ts`): `{ m, id, k, v?, rid? }`. Messages bubble up
through parent `onMessageSent` listeners to whichever `Session` owns the root
element, get batched and throttled (~30fps, see `MAX_FPS` in
`WebSocketSession.ts`), and are sent to the browser as a JSON array. The
browser client (`ooui-client.js`) applies them by id lookup into a `nodes` map
built as `create` messages arrive. Events flow the other way as plain
`{m:"event", id, k, v}` messages sent by the client.

`EventTarget.id` values are generated with a `⦙` (⦙) prefix
(`src/core/EventTarget.ts`, `ID_PREFIX`). The client uses that prefix to tell
"this string is actually a reference to another node" apart from an ordinary
string value (see `fixupValue` in `ooui-client.js`). Don't change this prefix
without checking both sides — it's duplicated as a literal in the client
since that file intentionally doesn't import from `src/core`.

`Session` (`src/server/Session.ts`) replays a target's `stateMessages` history
before referencing it in an outgoing message, so a freshly-connected or
reconnecting client always gets a self-consistent stream — mirrors
`Ooui/Session.cs` exactly; if you're touching this file, read the C# original
first, the ordering logic is subtle.

### `classList` (`TokenList`)

Not in the original C# (`Ooui/Element.cs` only ever had a plain-string
`ClassName`) — this is new in the port, added because `className = "a b c"`
string-building gets old fast once you're actually styling things (see the
Tailwind swap below). `TokenList` (`src/core/TokenList.ts`) is a
DOMTokenList-alike with no wire awareness of its own: `Element` wires it up
in its constructor by seeding it from the current `class` attribute and
routing its `onChange` back through the _existing_ `className` setter
(`Element.ts`). That's deliberate — it means `classList.add()`/`.toggle()`/
etc. produce ordinary `setAttr` messages for `class`, so they're
automatically reconnect-safe (state-message dedup already handles `setAttr`,
see above) with zero new protocol surface. Don't add a dedicated
`classList.add`/`.remove` wire message type to make this "more efficient" —
it would have to duplicate the reconnect-replay handling that `setAttr`
already gets for free.

### Circular-import workarounds

`Element` needs `Document` (for `element.document`), and `Document` owns a
`Body` which extends `Element` — a genuine cycle. `Node.text` needs to create
a `TextNode`, which extends `Node`. Both are broken with a small
registration pattern instead of a direct import: the dependent module
declares a `register*Factory()` hook, and the owning module calls it as a
side effect at load time (see the bottom of `Document.ts` and `TextNode.ts`,
and `registerDocumentFactory`/`registerTextNodeFactory` in `Element.ts`/
`Node.ts`). If you add a new circular dependency, follow the same pattern
rather than restructuring the class hierarchy — don't fight it with `import
type` tricks that just move the problem to runtime.

### Bun-only, on purpose

This library uses `Bun.serve` (websocket server), the `with { type: "text" }`
import attribute (embeds the client script), and `Bun.CryptoHasher` directly —
there's no Node.js fallback. Consumers run this under Bun. Don't add
Node-specific polyfills or an abstraction layer for this unless explicitly
asked.

## Commands

```sh
bun install
bun run example      # start the sample app on :8080 (/, /button, /todo)
bun run test         # bun:test + playwright e2e, headless Chromium
bun run typecheck    # tsc --noEmit across two tsconfigs, see below
bun run format       # prettier --write .
bun run build        # emit dist/ (bundled JS + bundled .d.ts), see below
```

### Two tsconfigs, on purpose

- `tsconfig.json` — `src/**` + `examples/**`. No DOM lib: this is server
  code, and the absence of `window`/`document` globals is a deliberate
  guardrail against accidentally writing browser code here.
  `src/client/ooui-client.js` is plain JS (see below) so it isn't part of
  this program at all — nothing to carve out an exception for.
- `tsconfig.tests.json` — `tests/**`. Has DOM (for `page.evaluate`/
  `page.waitForFunction` callback bodies, which execute in the browser) and
  `bun-types` (for `bun:test`).

`bun run typecheck` runs both. If you add a file, make sure it's picked up by
the config matching its runtime environment.

### Build (`bun run build`)

`bun run build` just runs [`bunup`](https://bunup.dev) (config:
`bunup.config.ts`), which bundles `src/index.ts` — core + elements + server,
everything it transitively pulls in — into a single `dist/index.js`, **and**
rolls up every referenced type into one flat, bundled `dist/index.d.ts` (its
declaration bundler, distinct from plain `tsc` output, which would mirror
`src/**` into a `.d.ts` per file). `target: "bun"` in `bunup.config.ts`
matters — this library uses Bun-only APIs, so `node`/`browser` targets would
be wrong. Bunup's declaration generation uses TypeScript's "isolated
declarations" mode by default: it infers each file's exported types
independently instead of running a full-program `tsc` pass, which is why
every class field with a non-obvious inferred type needs an explicit
annotation (e.g. `readonly window: Window = new Window()`, not `readonly
window = new Window()`) — bunup warns at build time if one's missing, don't
ignore that warning by leaving the type off.

We tried a plain `bun build` + `tsc --emitDeclarationOnly` two-step before
this (mirrors `src/**` into per-file `.d.ts`, still correct, just not
bundled) — if `bunup` ever becomes a blocker, that's the fallback, not a
hand-rolled declaration bundler.

**How the client script gets to the browser, and why there's no build step
for it, dev or prod:** `src/client/ooui-client.js` is plain, untyped
JavaScript — deliberately reverted from an earlier TypeScript version of
this file (don't re-introduce `.ts` here without being asked; it dragged in
a `Bun.Transpiler` call on every server startup and DOM-lib/tsconfig
friction for no real benefit, since the file has no imports and needs no
type safety beyond "does this run in a browser"). `UI.ts` imports it as
_text_, not as code — `import clientJsSource from "../client/ooui-client.js"
with { type: "text" }` (Bun's text-loader import attribute, see
[bun.sh/docs/runtime/file-types](https://bun.sh/docs/runtime/file-types)).
This works identically unbundled (`bun run examples/app.ts`, reads the file
off disk) and bundled (`bunup`/`bun build` inlines the file's contents as a
plain JS string literal into `dist/index.js` at build time) — no runtime
filesystem lookup, no path-depth bookkeeping between `src/` and `dist/`
layouts. `UI.loadClientJs()` just UTF-8-encodes that string and hashes it
for the `/ooui.js` ETag — nothing to transpile, since it's already the
exact bytes served to the browser.

One TypeScript wrinkle, already handled — don't remove without re-deriving
why it's there: `tsc` can't resolve a `.js` specifier without `allowJs`
(which this project doesn't set), so on its own it'd report "could not find
a declaration file" on that import. Fixed with a **sibling declaration
file**, `src/client/ooui-client.d.ts` (`const content: string; export
default content`) — TypeScript automatically pairs a `.d.ts` with a
same-named `.js`/`.jsx` file during resolution, no `allowJs` required, no
suppression comment needed on the import itself. Two things that _look_
like cleaner fixes were tried first and rejected — don't reintroduce either:

- `@ts-expect-error` on the import line: works, but silently stops catching
  a real typo in the import path (the diagnostic it suppresses is generic
  enough to mask other mistakes too).
- An ambient `declare module "*.js" { const content: string }`: produced
  flaky pass/fail across otherwise-identical `tsc` invocations in this repo
  (same TypeScript 7.0.2, same tsconfig, same files — failed via `bun run
typecheck` / `sh -c`, passed invoked directly), almost certainly a bug in
  that TS version's ambient-wildcard resolution for import-attributed
  specifiers.

The sibling-`.d.ts` approach sidesteps both problems: it's targeted (only
applies to this one file, not every `.js` import project-wide) and doesn't
depend on the wildcard-matching code path that was flaky.

`prepublishOnly` runs typecheck + test + build, so `npm publish` (run under
Bun) won't ship a broken or stale `dist/`.

## Conventions worth preserving

- **No comments explaining what code does.** Comments here explain _why_
  something non-obvious is the way it is (protocol quirks, circular-import
  workarounds, Bun API choices) — see the existing files for the level of
  terseness expected.
- **Mirror the C# names.** Method/property names follow the original C#
  API (camelCase instead of PascalCase, otherwise unchanged) so the
  `../ooui-main` reference stays a useful side-by-side guide. Don't rename
  things to be "more idiomatic TS" unless the C# name genuinely doesn't
  translate (e.g. `HRef` → `href`, not `hRef`).
- **New HTML elements** go in `src/elements/`, extend `Element` or
  `FormControl`, and get exported from `src/index.ts`. Check the matching
  `../ooui-main/Ooui/*.cs` file first — most elements are a direct,
  mechanical translation.
- **Prettier owns formatting** (Standard.js-ish: no semicolons, single
  quotes, no trailing commas). Run `bun run format` before considering a
  change done; don't hand-format to a different style.
- **Styling defaults to Tailwind, zero-build.** `UI.headHtml`
  (`src/server/UI.ts`) defaults to the Tailwind
  [Play CDN](https://tailwindcss.com/docs/installation/play-cdn) script tag
  (was Bootstrap's CSS link before) — matches the "no build step" philosophy
  of the rest of this project, and it JIT-compiles classes added at runtime
  (e.g. via `classList.add` after a click), which a static stylesheet
  couldn't. It logs a "should not be used in production" console warning by
  design — that's Tailwind's, not a bug, and expected in
  `tests/e2e.test.ts`'s console output. `examples/app.ts` uses Tailwind
  utility classes via `.classList.add(...)` throughout — prefer that over
  hand-rolled inline `style.*` for anything expressible as a utility class,
  it's more idiomatic here now and it's what the e2e test asserts against.
