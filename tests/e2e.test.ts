import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { UI } from '../src/index'
import { registerRoutes } from '../examples/app'

/**
 * End-to-end verification that a real browser DOM stays in sync with the
 * server-side element tree over the Ooui websocket protocol. Covers the
 * same flows that were manually checked with the Playwright MCP tool during
 * development: add/toggle/clear on the todo sample, and the button counter.
 *
 * Uses plain `playwright` (not the @playwright/test runner), so assertions
 * wait explicitly for the round trip instead of relying on `expect(locator)`
 * auto-retry matchers.
 */

let browser: Browser
let page: Page
let baseUrl: string

beforeAll(async () => {
  UI.setHost('localhost')
  UI.setPort(0) // let the OS pick a free port so tests don't collide with `bun run example`
  registerRoutes()
  const server = await UI.start()
  baseUrl = `http://localhost:${server.port}`

  browser = await chromium.launch()
  page = await browser.newPage()
})

afterAll(async () => {
  await browser?.close()
})

describe('todo sample', () => {
  test('renders the initial server-side element tree', async () => {
    await page.goto(`${baseUrl}/todo`)
    expect(await page.locator('h1').textContent()).toBe('Todo List')
    expect(await page.getByRole('listitem').count()).toBe(0)
  })

  test('adding an item round-trips through the server', async () => {
    await page.getByRole('textbox').fill('Buy milk')
    await page.getByRole('button', { name: 'Add' }).click()

    const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
    await item.waitFor({ state: 'visible' })
    expect(await item.count()).toBe(1)
    expect(await page.getByRole('textbox').inputValue()).toBe('')
  })

  test('clicking an item toggles its done style via the server', async () => {
    const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
    const label = item.locator('div')

    expect(
      await label.evaluate(el => getComputedStyle(el).textDecorationLine)
    ).toBe('none')

    await item.click()
    await page.waitForFunction(() => {
      const el = document.querySelector('li div')
      return (
        el != null && getComputedStyle(el).textDecorationLine === 'line-through'
      )
    })

    expect(await label.evaluate(el => getComputedStyle(el).color)).toBe(
      'rgb(153, 153, 153)'
    )
    expect(await label.evaluate(el => getComputedStyle(el).fontWeight)).toBe(
      '400'
    )
  })

  test('clear completed removes done items via the server', async () => {
    await page.getByRole('button', { name: 'Clear Completed' }).click()
    await page.waitForFunction(
      () => document.querySelectorAll('li').length === 0
    )
    expect(await page.getByRole('listitem').count()).toBe(0)
  })
})

describe('button counter sample', () => {
  test('click count is tracked server-side and pushed back to the DOM', async () => {
    await page.goto(`${baseUrl}/button`)
    const button = page.getByRole('button', { name: 'Click me!' })
    await button.waitFor({ state: 'visible' })

    await button.click()
    await page.waitForFunction(
      () => document.querySelector('button')?.textContent === 'Clicked 1 times'
    )

    await page.getByRole('button', { name: 'Clicked 1 times' }).click()
    await page.waitForFunction(
      () => document.querySelector('button')?.textContent === 'Clicked 2 times'
    )
  })
})

describe('index page', () => {
  test('links to the other samples', async () => {
    await page.goto(`${baseUrl}/`)
    expect(
      await page
        .getByRole('link', { name: 'Button Counter' })
        .getAttribute('href')
    ).toBe('/button')
    expect(
      await page.getByRole('link', { name: 'Todo List' }).getAttribute('href')
    ).toBe('/todo')
  })
})
