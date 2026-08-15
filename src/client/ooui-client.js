// Ooui client — TypeScript/Bun port. Ported from Ooui/Client.js (WASM/Mono
// support removed; this port is server-only, there is no in-browser runtime).
// Served as-is at /ooui.js, no build step — see server/UI.ts.

let debug = false

let nodes = {}
let hasText = {}

let socket = null

let lastRootElementPath = ''

function send(json) {
  if (debug) console.log('Send', json)
  if (socket != null) {
    socket.send(json)
  }
}

const mouseEvents = {
  click: true,
  dblclick: true,
  mousedown: true,
  mouseenter: true,
  mouseleave: true,
  mousemove: true,
  mouseout: true,
  mouseover: true,
  mouseup: true,
  wheel: true
}

const inputEvents = {
  input: true,
  change: true,
  keyup: true
}

const elementEvents = {
  load: true
}

function getSize() {
  return {
    height: window.innerHeight,
    width: window.innerWidth
  }
}

function setCookie(name, value, days) {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = '; expires=' + date.toUTCString()
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/'
}

function saveSize(s) {
  setCookie('oouiWindowWidth', s.width, 7)
  setCookie('oouiWindowHeight', s.height, 7)
}

function initializeNavigation() {
  monitorHashChanged()
  const em = {
    m: 'event',
    id: 'window',
    k: 'hashchange',
    v: window.location
  }
  saveSize(getSize())
  send(JSON.stringify(em))
  if (debug) console.log('Event', em)
}

let isWindowLoaded = false
window.addEventListener('load', function () {
  connectWebSocket()
  isWindowLoaded = true
})

// Main entrypoint, called from the rendered HTML template: ooui("/path")
function ooui(rootElementPath) {
  lastRootElementPath = rootElementPath
  if (isWindowLoaded) {
    connectWebSocket()
  }
}

let reloadTryCount = 0
let reloadRequestTime = 0
function reloadSocket() {
  const now = new Date().getTime()
  if (now - reloadRequestTime > 0) {
    reloadRequestTime = now + 100
    reloadTryCount++
    window.setTimeout(function () {
      connectWebSocket()
    }, 10)
  }
}

function connectWebSocket() {
  const rootElementPath = lastRootElementPath
  if (rootElementPath.length === 0) return

  console.log('Initializing Ooui web socket')

  if (reloadTryCount > 0) {
    const $body = getBodyNode()
    while ($body.firstChild) $body.removeChild($body.lastChild)
    nodes = {}
    hasText = {}
  }

  const initialSize = getSize()
  saveSize(initialSize)

  const wsArgs =
    (rootElementPath.indexOf('?') >= 0 ? '&' : '?') +
    'w=' +
    initialSize.width +
    '&h=' +
    initialSize.height

  let proto = 'ws'
  if (location.protocol === 'https:') {
    proto = 'wss'
  }

  socket = new WebSocket(
    proto + '://' + document.location.host + rootElementPath + wsArgs,
    'ooui'
  )

  let socketOpened = false

  socket.addEventListener('open', function () {
    console.log('Web socket opened')
    socketOpened = true
    initializeNavigation()
  })

  socket.addEventListener('error', function (event) {
    console.error('Web socket error', event)
  })

  socket.addEventListener('close', function () {
    if (socketOpened) {
      reloadSocket()
    }
  })

  socket.addEventListener('message', function (event) {
    const messages = JSON.parse(event.data)
    if (debug) console.log('Messages', messages)
    if (Array.isArray(messages)) {
      messages.forEach(function (m) {
        m.v = fixupValue(m.v)
        processMessage(m)
      })
    }
  })

  console.log('Web socket created')

  monitorSizeChanges(1000 / 10)
}

function monitorHashChanged() {
  function hashChangeHandler() {
    const em = {
      m: 'event',
      id: 'window',
      k: 'hashchange',
      v: window.location
    }
    saveSize(getSize())
    send(JSON.stringify(em))
    if (debug) console.log('Event', em)
  }

  window.addEventListener('hashchange', hashChangeHandler, false)
}

function monitorSizeChanges(millis) {
  let resizeTimeout
  function resizeThrottler() {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(function () {
        resizeTimeout = null
        resizeHandler()
      }, millis)
    }
  }

  function resizeHandler() {
    const em = {
      m: 'event',
      id: 'window',
      k: 'resize',
      v: getSize()
    }
    saveSize(getSize())
    send(JSON.stringify(em))
    if (debug) console.log('Event', em)
  }

  window.addEventListener('resize', resizeThrottler, false)
}

function getBodyNode() {
  const bodyNode = document.getElementById('ooui-body')
  return bodyNode || document.body
}

function getNode(id) {
  switch (id) {
    case 'window':
      return window
    case 'document':
      return document
    case 'document.body':
      return getBodyNode()
    default:
      return nodes[id]
  }
}

function getOrCreateElement(id, tagName) {
  const e = document.getElementById(id)
  if (e) {
    if (e.firstChild && e.firstChild.nodeType === Node.TEXT_NODE)
      hasText[e.id] = true
    return e
  }
  return document.createElement(tagName)
}

function msgCreate(m) {
  const id = m.id
  const tagName = m.k
  const node =
    tagName === '#text'
      ? document.createTextNode('')
      : getOrCreateElement(id, tagName)
  if (tagName !== '#text') node.id = id
  nodes[id] = node
  if (debug) console.log('Created node', node)
}

function msgSet(m) {
  const id = m.id
  const node = getNode(id)
  if (!node) {
    console.error('Unknown node id', m)
    return
  }
  const parts = m.k.split('.')
  let o = node
  for (let i = 0; i < parts.length - 1; i++) {
    o = o[parts[i]]
  }
  const lastPart = parts[parts.length - 1]
  const value = lastPart === 'htmlFor' ? m.v.id : m.v
  o[lastPart] = value
  if (debug) console.log('Set', node, parts, value)
}

function msgSetAttr(m) {
  const id = m.id
  const node = getNode(id)
  if (!node) {
    console.error('Unknown node id', m)
    return
  }
  node.setAttribute(m.k, m.v)
  if (debug) console.log('SetAttr', node, m.k, m.v)
}

function msgRemAttr(m) {
  const id = m.id
  const node = getNode(id)
  if (!node) {
    console.error('Unknown node id', m)
    return
  }
  node.removeAttribute(m.k)
  if (debug) console.log('RemAttr', node, m.k)
}

function getCallerProperty(target, accessorStr) {
  const arr = accessorStr.split('.')
  let caller = target
  let property = target
  arr.forEach(function (v) {
    caller = property
    property = caller[v]
  })
  return [caller, property]
}

function msgCall(m) {
  const id = m.id
  const node = getNode(id)
  if (!node) {
    console.error('Unknown node id', m)
    return
  }
  const target = node
  if (
    m.k === 'insertBefore' &&
    m.v[0].nodeType === Node.TEXT_NODE &&
    m.v[1] == null &&
    hasText[id]
  ) {
    // Text is already set so clear it first.
    if (target.firstChild) target.removeChild(target.firstChild)
    delete hasText[id]
  }
  const [caller, fn] = getCallerProperty(target, m.k)
  if (debug) console.log('Call', node, fn, m.v)
  const r = fn.apply(caller, m.v)
  if (typeof m.rid === 'string') {
    nodes[m.rid] = r
  }
}

function msgListen(m) {
  const node = getNode(m.id)
  if (!node) {
    console.error('Unknown node id', m)
    return
  }
  if (debug) console.log('Listen', node, m.k)
  node.addEventListener(m.k, function (e) {
    const em = {
      m: 'event',
      id: m.id,
      k: m.k
    }
    if (inputEvents[m.k]) {
      em.v =
        node.tagName === 'INPUT' && node.type === 'checkbox'
          ? node.checked
          : node.value
    } else if (mouseEvents[m.k]) {
      em.v = {
        offsetX: e.offsetX,
        offsetY: e.offsetY
      }
    } else if (elementEvents[m.k]) {
      em.v = {
        clientHeight: node.clientHeight,
        clientWidth: node.clientWidth
      }
    }
    send(JSON.stringify(em))
    if (debug) console.log('Event', em)
    if (em.k === 'submit') e.preventDefault()
  })
}

function processMessage(m) {
  switch (m.m) {
    case 'nop':
      break
    case 'create':
      msgCreate(m)
      break
    case 'set':
      msgSet(m)
      break
    case 'setAttr':
      msgSetAttr(m)
      break
    case 'remAttr':
      msgRemAttr(m)
      break
    case 'call':
      msgCall(m)
      break
    case 'listen':
      msgListen(m)
      break
    default:
      console.error('Unknown message type', m.m, m)
  }
}

function fixupValue(v) {
  if (Array.isArray(v)) {
    for (let x = 0; x < v.length; x++) {
      v[x] = fixupValue(v[x])
    }
    return v
  } else if (typeof v === 'string') {
    if (v.length > 1 && v[0] === '⦙') {
      return getNode(v)
    }
  } else if (v && typeof v === 'object' && 'id' in v && 'k' in v) {
    return fixupValue(v.id)[v.k]
  }
  return v
}
