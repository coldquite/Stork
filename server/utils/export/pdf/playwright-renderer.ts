import { chromium, type Browser } from 'playwright'

let sharedBrowserPromise: Promise<Browser> | null = null

function launchSharedBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      // Without this, headless Chromium on Linux uses subpixel glyph positioning (HINTING_FULL),
      // which causes uneven letter spacing — pairs like "ra" visually merge together.
      // See: https://chromium.googlesource.com/chromium/src/+/e1b855d4545dc4fff19cee500d7ce105126f3bd2
      '--font-render-hinting=none'
    ]
  })
}

function createSharedBrowserPromise(): Promise<Browser> {
  const browserPromise = launchSharedBrowser()

  browserPromise
    .then((browser) => {
      browser.on('disconnected', () => {
        if (sharedBrowserPromise === browserPromise) {
          sharedBrowserPromise = null
        }
      })
    })
    .catch(() => {
      if (sharedBrowserPromise === browserPromise) {
        sharedBrowserPromise = null
      }
    })

  return browserPromise
}

async function getSharedBrowserLease(): Promise<{ browser: Browser; browserPromise: Promise<Browser> }> {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = createSharedBrowserPromise()
  }

  const browserPromise = sharedBrowserPromise
  const browser = await browserPromise
  return {
    browser,
    browserPromise
  }
}

function isBrowserClosedLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('browser has been closed') ||
    message.includes('target page, context or browser has been closed') ||
    message.includes('target closed')
  )
}

async function renderPdfFromHtmlWithBrowser(browser: Browser, html: string): Promise<Buffer> {
  const context = await browser.newContext({
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague'
  })

  try {
    const page = await context.newPage()
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30_000
    })
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(async () => {
      // `fonts.ready` resolves when layout no longer waits for pending font loads.
      const documentLike = (globalThis as { document?: { fonts?: { ready?: Promise<unknown> } } }).document
      await documentLike?.fonts?.ready
    })

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    })
  } finally {
    await context.close()
  }
}

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { browser, browserPromise } = await getSharedBrowserLease()

    try {
      return await renderPdfFromHtmlWithBrowser(browser, html)
    } catch (error: unknown) {
      const isLastAttempt = attempt === 1
      if (isLastAttempt || !isBrowserClosedLikeError(error)) {
        throw error
      }

      // Force creating a fresh browser for the retry when existing one was closed.
      if (sharedBrowserPromise === browserPromise) {
        sharedBrowserPromise = null
      }
    }
  }

  throw new Error('Unexpected PDF render retry loop completion')
}
