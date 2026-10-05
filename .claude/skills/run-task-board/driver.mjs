#!/usr/bin/env node
// Zero-dependency headless-Chrome driver for the task board (CDP over the
// WebSocket built into Node 22+). Reads one command per line from stdin,
// stops at the first failure and exits non-zero.
//
//   node .claude/skills/run-task-board/driver.mjs <<'EOF'
//   nav http://localhost:5173
//   wait Командная доска
//   ss board
//   EOF
//
// Env: CHROME_PATH (browser binary), SHOTS_DIR (screenshot directory),
//      TIMEOUT_MS (per-command wait, default 10000).

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 10000)
const SHOTS_DIR = resolve(process.env.SHOTS_DIR ?? join(tmpdir(), 'task-board-shots'))
const STORAGE_KEY = 'redev-task-board:v1'

const HELP = `commands:
  nav <url>               open url and wait for load
  wait <text>             wait until the page text contains <text>
  gone <text>             wait until the page text no longer contains <text>
  click <name>            real mouse click on the button whose aria-label or text is <name>
  fill <label> = <value>  set the input/textarea/select under <label> (select: option text; date: YYYY-MM-DD)
  press <key>             Enter | Escape | Tab
  text [css]              print innerText of the page (or of the first match of css)
  eval <js>               evaluate an expression in the page, print the JSON result
  storage                 print the tasks saved in localStorage
  theme <dark|light>      emulate prefers-color-scheme
  size <width> <height>   set the viewport (default 1280x800)
  ss [name]               full-page screenshot -> $SHOTS_DIR/<name>.png
  errors                  fail if the page logged console errors or threw
  help                    this list`

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  const found = candidates.find((path) => path && existsSync(path))
  if (!found) throw new Error('Chrome not found: set CHROME_PATH to a Chrome/Chromium binary')
  return found
}

const profileDir = mkdtempSync(join(tmpdir(), 'task-board-chrome-'))
const chrome = spawn(findChrome(), [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1280,800',
  ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })

function shutdown(code) {
  chrome.kill()
  try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* Chrome may still hold files */ }
  process.exit(code)
}

const port = await new Promise((done, fail) => {
  let stderr = ''
  const timer = setTimeout(() => fail(new Error(`Chrome did not start:\n${stderr}`)), 20000)
  chrome.stderr.on('data', (chunk) => {
    stderr += chunk
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)
    if (match) { clearTimeout(timer); done(match[1]) }
  })
  chrome.on('exit', (code) => fail(new Error(`Chrome exited with ${code}:\n${stderr}`)))
})

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail })

let lastId = 0
const pending = new Map()
const listeners = new Set()
const pageErrors = []

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const { done, fail } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) fail(new Error(message.error.message))
    else done(message.result)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails
    pageErrors.push(details.exception?.description ?? details.text)
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    pageErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '))
  }
  for (const listener of listeners) listener(message)
}

function send(method, params = {}) {
  const id = ++lastId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((done, fail) => pending.set(id, { done, fail }))
}

function once(method) {
  return new Promise((done, fail) => {
    const timer = setTimeout(() => { listeners.delete(listener); fail(new Error(`timed out waiting for ${method}`)) }, TIMEOUT_MS)
    function listener(message) {
      if (message.method !== method) return
      clearTimeout(timer)
      listeners.delete(listener)
      done(message.params)
    }
    listeners.add(listener)
  })
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
  return result.value
}

async function poll(expression, failure) {
  const deadline = Date.now() + TIMEOUT_MS
  for (;;) {
    const value = await evaluate(expression)
    if (value) return value
    if (Date.now() > deadline) throw new Error(failure)
    await new Promise((done) => setTimeout(done, 100))
  }
}

// An open modal <dialog> makes the rest of the page inert, so look inside it first.
const SCOPE = `(document.querySelector('dialog[open]') ?? document)`

const commands = {
  async nav(url) {
    const loaded = once('Page.loadEventFired')
    const { errorText } = await send('Page.navigate', { url })
    if (errorText) throw new Error(`${errorText} (is the dev server running?)`)
    await loaded
  },

  async wait(text) {
    await poll(`document.body.innerText.includes(${JSON.stringify(text)})`, `text not found: ${text}`)
  },

  async gone(text) {
    await poll(`!document.body.innerText.includes(${JSON.stringify(text)})`, `text still present: ${text}`)
  },

  async click(name) {
    const point = await poll(`(() => {
      const name = ${JSON.stringify(name)}
      const normalize = (value) => (value ?? '').replace(/\\s+/g, ' ').trim()
      const button = [...${SCOPE}.querySelectorAll('button')].find((item) =>
        item.getAttribute('aria-label') === name || normalize(item.textContent) === name)
      if (!button || button.disabled) return null
      button.scrollIntoView({ block: 'center' })
      const box = button.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })()`, `button not found: ${name}`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 })
    }
  },

  async fill(rest) {
    const separator = rest.indexOf('=')
    if (separator === -1) throw new Error('usage: fill <label> = <value>')
    const label = rest.slice(0, separator).trim()
    const value = rest.slice(separator + 1).trim()
    // Assigning el.value directly is invisible to React; go through the prototype setter and fire events.
    await poll(`(() => {
      const label = [...${SCOPE}.querySelectorAll('label')].find((item) => item.firstChild?.textContent.trim() === ${JSON.stringify(label)})
      const control = label?.querySelector('input, textarea, select')
      if (!control) return false
      let value = ${JSON.stringify(value)}
      if (control instanceof HTMLSelectElement) {
        const option = [...control.options].find((item) => item.textContent === value || item.value === value)
        if (!option) throw new Error('no such option: ' + value)
        value = option.value
      }
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), 'value').set.call(control, value)
      control.dispatchEvent(new Event('input', { bubbles: true }))
      control.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`, `field not found: ${label}`)
  },

  async press(key) {
    const codes = { Enter: 13, Escape: 27, Tab: 9 }
    if (!codes[key]) throw new Error(`unsupported key: ${key}`)
    const event = { key, code: key, windowsVirtualKeyCode: codes[key], ...(key === 'Enter' ? { text: '\r' } : {}) }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...event })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
  },

  async text(selector) {
    const target = selector ? `document.querySelector(${JSON.stringify(selector)})` : 'document.body'
    console.log(await evaluate(`${target}?.innerText ?? '(no match)'`))
  },

  async eval(expression) {
    console.log(JSON.stringify(await evaluate(expression), null, 2))
  },

  async storage() {
    console.log(JSON.stringify(JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`)), null, 2))
  },

  async theme(value) {
    if (value !== 'dark' && value !== 'light') throw new Error('usage: theme <dark|light>')
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })
  },

  async size(rest) {
    const [width, height] = rest.split(/\s+/).map(Number)
    if (!width || !height) throw new Error('usage: size <width> <height>')
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  },

  async ss(name) {
    mkdirSync(SHOTS_DIR, { recursive: true })
    const file = join(SHOTS_DIR, `${name || `shot-${Date.now()}`}.png`)
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(`screenshot: ${file}`)
  },

  async errors() {
    if (pageErrors.length) throw new Error(`page errors:\n${pageErrors.join('\n')}`)
    console.log('no page errors')
  },

  async help() {
    console.log(HELP)
  },
}

await send('Page.enable')
await send('Runtime.enable')

let exitCode = 0
for await (const raw of createInterface({ input: process.stdin })) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue
  const [, name, rest = ''] = line.match(/^(\S+)\s*(.*)$/)
  console.log(`> ${line}`)
  try {
    if (!commands[name]) throw new Error(`unknown command: ${name} (try: help)`)
    await commands[name](rest)
  } catch (error) {
    console.error(`FAILED: ${line}\n${error.message}`)
    exitCode = 1
    break
  }
}
shutdown(exitCode)
