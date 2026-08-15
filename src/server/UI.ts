import type { Server } from 'bun'
import { Element } from '../core/Element'
import { WebSocketSession, MAX_FPS } from './WebSocketSession'
// Inlined as a string at both dev-run and build time (bun.sh/docs/runtime/file-types).
// Already plain JS, so it's served as-is — no runtime build/transpile step.
// Typed via the sibling ooui-client.d.ts (tsc pairs same-named .d.ts/.js
// files automatically, no `allowJs` needed) — don't delete that file.
import clientJsSource from '../client/ooui-client.js' with { type: 'text' }

export { MAX_FPS }

export interface UIContext {
  requestUrl: URL
  params: Record<string, string>
}

type ElementCtor = (context: UIContext) => Element

interface PublishedPath {
  path: string
  regex: RegExp
  ctor: ElementCtor
}

interface WSData {
  session: WebSocketSession
}

const publishedPaths = new Map<string, PublishedPath>()
let server: Server<WSData> | null = null

export let host = 'localhost'
export let port = 8080
export let headHtml = `<script src="https://cdn.tailwindcss.com"></script>`
export let bodyHeaderHtml = ''
export let bodyFooterHtml = ''

export function setHost(value: string): void {
  host = value
}
export function setPort(value: number): void {
  port = value
}
export function setHeadHtml(value: string): void {
  headHtml = value
}
export function setBodyHeaderHtml(value: string): void {
  bodyHeaderHtml = value
}
export function setBodyFooterHtml(value: string): void {
  bodyFooterHtml = value
}

let clientJsBytes: Uint8Array | null = null
let clientJsEtag = ''

function loadClientJs(): void {
  if (clientJsBytes) return
  clientJsBytes = new TextEncoder().encode(clientJsSource)
  const hash = new Bun.CryptoHasher('sha256')
    .update(clientJsBytes)
    .digest('hex')
  clientJsEtag = `"${hash}"`
}

export function publish(path: string, ctor: ElementCtor | Element): void {
  const fn: ElementCtor = ctor instanceof Element ? () => ctor : ctor
  publishedPaths.set(path, { path, regex: new RegExp(`^${path}$`), ctor: fn })
}

function findPublishedPath(
  pathname: string
): { pp: PublishedPath; params: Record<string, string> } | null {
  const exact = publishedPaths.get(pathname)
  if (exact) return { pp: exact, params: {} }
  for (const pp of publishedPaths.values()) {
    const m = pp.regex.exec(pathname)
    if (m) {
      const params: Record<string, string> = { ...m.groups }
      return { pp, params }
    }
  }
  return null
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

export function renderTemplate(
  webSocketPath: string,
  title = '',
  initialHtml = ''
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${headHtml}
</head>
<body>
${bodyHeaderHtml}
<div id="ooui-body">
${initialHtml}
</div>

<script src="/ooui.js"></script>
<script>ooui("${webSocketPath}");</script>
${bodyFooterHtml}
</body>
</html>`
}

export function getWebSocketUrl(path: string): string {
  return `ws://${host}:${port}${path}`
}

export async function start(): Promise<Server<WSData>> {
  if (server) return server
  loadClientJs()

  server = Bun.serve<WSData>({
    hostname: host,
    port,
    fetch(req, srv) {
      return handleFetch(req, srv)
    },
    websocket: {
      open(ws) {
        ws.data.session.start(ws)
      },
      message(ws, message) {
        if (typeof message === 'string') ws.data.session.receive(message)
      },
      close(ws) {
        ws.data.session.stop()
      }
    }
  })

  console.log(`Listening at http://${server.hostname}:${server.port}/ ...`)
  return server
}

function handleFetch(req: Request, srv: Server<WSData>): Response | undefined {
  const url = new URL(req.url)
  const pathname = url.pathname

  if (pathname === '/ooui.js') {
    const inm = req.headers.get('if-none-match')
    if (inm && inm === clientJsEtag) {
      return new Response(null, { status: 304 })
    }
    return new Response(Buffer.from(clientJsBytes!), {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=60',
        Etag: clientJsEtag
      }
    })
  }

  const found = findPublishedPath(pathname)
  if (!found) {
    return new Response('Not Found', { status: 404 })
  }

  const isWebSocket = req.headers.get('upgrade')?.toLowerCase() === 'websocket'
  const context: UIContext = { requestUrl: url, params: found.params }

  if (isWebSocket) {
    let element: Element
    try {
      element = found.pp.ctor(context)
    } catch (ex) {
      logError('Failed to create element', ex)
      return new Response('Internal Server Error', { status: 500 })
    }

    const w = parseFloat(url.searchParams.get('w') ?? '') || 640
    const h = parseFloat(url.searchParams.get('h') ?? '') || 480

    const session = new WebSocketSession(element, w, h, logError)
    const ok = srv.upgrade(req, { data: { session } })
    if (!ok) {
      return new Response('WebSocket upgrade failed', { status: 400 })
    }
    return undefined
  }

  console.log(`${req.method} ${pathname}`)
  const html = renderTemplate(pathname)
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}

function logError(message: string, ex: unknown): void {
  console.error(`${message}:`, ex)
}
