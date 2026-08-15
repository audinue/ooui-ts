export type StyleValue = string | number | null
export type PropertyChangedHandler = (propertyName: string) => void

function addNumberUnits(val: StyleValue, units: string): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') return val
  return `${val}${units}`
}

function addUrl(val: StyleValue): string | null {
  if (val === null || val === undefined) return null
  return `url('${val}')`
}

/** camelCase CSS property name -> [css-name, unit] (unit === "" means no auto unit) */
const UNIT_PROPS: Record<string, string> = {
  borderTopWidth: 'px',
  borderRightWidth: 'px',
  borderBottomWidth: 'px',
  borderLeftWidth: 'px',
  borderRadius: 'px',
  borderWidth: 'px',
  bottom: 'px',
  fontSize: 'px',
  height: 'px',
  left: 'px',
  marginTop: 'px',
  marginRight: 'px',
  marginBottom: 'px',
  marginLeft: 'px',
  margin: 'px',
  top: 'px',
  width: 'px'
}

const URL_PROPS = new Set(['backgroundImage'])

/** camelCase -> kebab-case css name */
const PLAIN_PROPS = [
  'alignSelf',
  'backfaceVisibility',
  'backgroundColor',
  'backgroundPosition',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderColor',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderStyle',
  'clear',
  'color',
  'cursor',
  'display',
  'flexFlow',
  'flexGrow',
  'flexShrink',
  'float',
  'fontFamily',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'lineHeight',
  'opacity',
  'order',
  'overflow',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'padding',
  'perspective',
  'position',
  'right',
  'textAlign',
  'textDecoration',
  'transform',
  'transformOrigin',
  'transformStyle',
  'transition',
  'verticalAlign',
  'visibility',
  'zIndex'
]

function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
}

/** camelCase JS property name for a kebab-case CSS property, e.g. "text-decoration" -> "textDecoration" */
export function getJsName(cssName: string): string {
  return cssName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

const SHORTHAND_EXPANSIONS: Record<string, string[]> = {
  borderColor: [
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color'
  ],
  borderStyle: [
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style'
  ],
  borderWidth: [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width'
  ],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']
}

/** Inline style bag for an Element. Mirrors Ooui/Style.cs. Changes fire onChange(cssName, value). */
export class Style {
  private readonly properties = new Map<string, StyleValue>()
  private changeHandlers: PropertyChangedHandler[] = []

  onPropertyChanged(handler: PropertyChangedHandler): void {
    this.changeHandlers.push(handler)
  }

  get(cssName: string): StyleValue {
    return this.properties.has(cssName)
      ? this.properties.get(cssName)!
      : 'inherit'
  }

  set(cssName: string, value: StyleValue): void {
    const safeValue = value ?? 'inherit'
    if (value === null || value === undefined) {
      if (!this.properties.delete(cssName)) return
    } else {
      const old = this.properties.get(cssName)
      if (old !== undefined && old === safeValue) return
      this.properties.set(cssName, safeValue)
    }
    for (const h of this.changeHandlers) h(cssName)
  }

  toString(): string {
    const parts: string[] = []
    for (const [k, v] of this.properties) {
      parts.push(`${k}:${v}`)
    }
    return parts.join(';')
  }

  getNumberWithUnits(key: string, baseValue = 0): number {
    const v = this.get(key)
    if (v === null) return 0
    if (typeof v === 'string') {
      const m = v.match(/^-?[\d.]+/)
      return m ? parseFloat(m[0]) : 0
    }
    return typeof v === 'number' ? v : baseValue
  }
}

// Attach named accessors (style.width = 10, style.color = "red", ...) as getter/setters on the prototype.
for (const camel of PLAIN_PROPS) {
  const kebab = camelToKebab(camel)
  const shorthand = SHORTHAND_EXPANSIONS[camel]
  Object.defineProperty(Style.prototype, camel, {
    get(this: Style) {
      return this.get(kebab)
    },
    set(this: Style, value: StyleValue) {
      if (shorthand) {
        for (const k of shorthand) this.set(k, value)
      } else {
        this.set(kebab, value)
      }
    },
    enumerable: true,
    configurable: true
  })
}

for (const [camel, unit] of Object.entries(UNIT_PROPS)) {
  const kebab = camelToKebab(camel)
  const shorthand = SHORTHAND_EXPANSIONS[camel]
  Object.defineProperty(Style.prototype, camel, {
    get(this: Style) {
      return this.get(kebab)
    },
    set(this: Style, value: StyleValue) {
      const withUnits = addNumberUnits(value, unit)
      if (shorthand) {
        for (const k of shorthand) this.set(k, withUnits)
      } else {
        this.set(kebab, withUnits)
      }
    },
    enumerable: true,
    configurable: true
  })
}

for (const camel of URL_PROPS) {
  const kebab = camelToKebab(camel)
  Object.defineProperty(Style.prototype, camel, {
    get(this: Style) {
      return this.get(kebab)
    },
    set(this: Style, value: StyleValue) {
      this.set(kebab, addUrl(value))
    },
    enumerable: true,
    configurable: true
  })
}

export interface Style {
  alignSelf: StyleValue
  backfaceVisibility: StyleValue
  backgroundColor: StyleValue
  backgroundImage: StyleValue
  backgroundPosition: StyleValue
  borderTopColor: StyleValue
  borderRightColor: StyleValue
  borderBottomColor: StyleValue
  borderLeftColor: StyleValue
  borderColor: StyleValue
  borderTopStyle: StyleValue
  borderRightStyle: StyleValue
  borderBottomStyle: StyleValue
  borderLeftStyle: StyleValue
  borderStyle: StyleValue
  borderTopWidth: StyleValue
  borderRightWidth: StyleValue
  borderBottomWidth: StyleValue
  borderLeftWidth: StyleValue
  borderRadius: StyleValue
  borderWidth: StyleValue
  bottom: StyleValue
  clear: StyleValue
  color: StyleValue
  cursor: StyleValue
  display: StyleValue
  flexFlow: StyleValue
  flexGrow: StyleValue
  flexShrink: StyleValue
  float: StyleValue
  fontFamily: StyleValue
  fontSize: StyleValue
  fontStyle: StyleValue
  fontVariant: StyleValue
  fontWeight: StyleValue
  height: StyleValue
  left: StyleValue
  lineHeight: StyleValue
  marginTop: StyleValue
  marginRight: StyleValue
  marginBottom: StyleValue
  marginLeft: StyleValue
  margin: StyleValue
  opacity: StyleValue
  order: StyleValue
  overflow: StyleValue
  paddingTop: StyleValue
  paddingRight: StyleValue
  paddingBottom: StyleValue
  paddingLeft: StyleValue
  padding: StyleValue
  perspective: StyleValue
  position: StyleValue
  right: StyleValue
  textAlign: StyleValue
  textDecoration: StyleValue
  top: StyleValue
  transform: StyleValue
  transformOrigin: StyleValue
  transformStyle: StyleValue
  transition: StyleValue
  verticalAlign: StyleValue
  visibility: StyleValue
  width: StyleValue
  zIndex: StyleValue
}
