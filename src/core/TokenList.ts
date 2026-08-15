export type TokenListChangeHandler = (value: string) => void

function splitTokens(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const t of value.split(/\s+/)) {
    if (t && !seen.has(t)) {
      seen.add(t)
      result.push(t)
    }
  }
  return result
}

function validateToken(token: string): void {
  if (token === '') throw new Error('TokenList token must not be empty')
  if (/\s/.test(token))
    throw new Error('TokenList token must not contain whitespace')
}

/**
 * DOMTokenList-alike (classList). Mirrors browser semantics (dedupes,
 * rejects empty/whitespace tokens) and fires onChange with the recomputed
 * space-separated value, so an owner (Element.classList) can push that back
 * out as a normal `class` attribute — see Element.ts. That's also why a
 * mutation doesn't get its own wire message type: it rides the existing
 * setAttr/class sync path, which is already reconnect-safe.
 */
export class TokenList {
  private tokens: string[]
  private readonly changeHandlers: TokenListChangeHandler[] = []

  constructor(initial = '') {
    this.tokens = splitTokens(initial)
  }

  onChange(handler: TokenListChangeHandler): void {
    this.changeHandlers.push(handler)
  }

  get length(): number {
    return this.tokens.length
  }

  get value(): string {
    return this.tokens.join(' ')
  }
  set value(v: string) {
    const newValue = v ?? ''
    if (newValue === this.value) return
    this.tokens = splitTokens(newValue)
    this.fireChange()
  }

  item(index: number): string | null {
    return this.tokens[index] ?? null
  }

  contains(token: string): boolean {
    return this.tokens.includes(token)
  }

  add(...tokensToAdd: string[]): void {
    let changed = false
    for (const t of tokensToAdd) {
      validateToken(t)
      if (!this.tokens.includes(t)) {
        this.tokens.push(t)
        changed = true
      }
    }
    if (changed) this.fireChange()
  }

  remove(...tokensToRemove: string[]): void {
    let changed = false
    for (const t of tokensToRemove) {
      validateToken(t)
      const i = this.tokens.indexOf(t)
      if (i >= 0) {
        this.tokens.splice(i, 1)
        changed = true
      }
    }
    if (changed) this.fireChange()
  }

  toggle(token: string, force?: boolean): boolean {
    validateToken(token)
    const has = this.tokens.includes(token)
    const shouldHave = force === undefined ? !has : force
    if (shouldHave === has) return shouldHave
    if (shouldHave) this.tokens.push(token)
    else this.tokens.splice(this.tokens.indexOf(token), 1)
    this.fireChange()
    return shouldHave
  }

  replace(oldToken: string, newToken: string): boolean {
    validateToken(oldToken)
    validateToken(newToken)
    const i = this.tokens.indexOf(oldToken)
    if (i < 0) return false
    if (this.tokens.includes(newToken)) {
      this.tokens.splice(i, 1)
    } else {
      this.tokens[i] = newToken
    }
    this.fireChange()
    return true
  }

  toString(): string {
    return this.value
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.tokens[Symbol.iterator]()
  }

  private fireChange(): void {
    const v = this.value
    for (const h of this.changeHandlers) h(v)
  }
}
