import { expect, request, test } from '@playwright/test'

const authStorageKey = 'kifu-auth-storage'

type LoginResponse = {
  access_token?: string
  refresh_token?: string
}

const authPayload = (email: string, password: string, name: string) => ({
  email,
  password,
  name,
})

async function createAuthedUser() {
  const timestamp = Date.now()
  const email = `e2e_smoke_${timestamp}@kifu.local`
  const password = 'TestPass123!'
  const name = 'Kifu QA User'

  const api = await request.newContext({
    baseURL: process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1',
  })

  const register = await api.post('/api/v1/auth/register', {
    data: authPayload(email, password, name),
  })
  if (![200, 201, 409].includes(register.status())) {
    throw new Error(`register failed: ${register.status()} ${await register.text()}`)
  }

  const login = await api.post('/api/v1/auth/login', {
    data: { email, password },
  })
  if (login.status() !== 200) {
    throw new Error(`login failed: ${login.status()} ${await login.text()}`)
  }

  const body = (await login.json()) as LoginResponse
  if (!body.access_token || !body.refresh_token) {
    throw new Error('missing tokens in login response')
  }

  return {
    api,
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    email,
  }
}

async function verifyAuthenticatedPages(page: any, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  expect(page.url()).toContain(route)
  if (page.url().includes('/login')) {
    throw new Error(`unexpected redirect to login on route ${route}`)
  }

  const main = page.locator('main')
  await expect(main).toBeVisible({ timeout: 10_000 })
}

async function importTodayTradeCsv(api: any, accessToken: string, exchange: string, symbol: string) {
  const tradeTime = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const csv = [
    'exchange,symbol,side,quantity,price,trade_time',
    `${exchange},${symbol},BUY,0.01,1000,${tradeTime}`,
  ].join('\n')

  const response = await api.post('/api/v1/trades/import', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    multipart: {
      file: {
        name: 'trades.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8'),
      },
    },
  })

  if (response.status() !== 200) {
    throw new Error(`trade import failed: ${response.status()} ${await response.text()}`)
  }
}

async function waitForTodayTradeInApi(api: any, accessToken: string, symbol: string) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const summary = await api.get('/api/v1/trades/summary', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (summary.status() !== 200) {
      throw new Error(`trades summary failed: ${summary.status()} ${await summary.text()}`)
    }
    const summaryBody = await summary.json()
    const totalTrades = Number(summaryBody?.totals?.total_trades ?? 0)
    const bySymbol = Array.isArray(summaryBody?.by_symbol) ? summaryBody.by_symbol : []
    const hasSymbol = bySymbol.some((row: any) => String(row?.symbol || '').toUpperCase() === symbol)
    if (totalTrades > 0 && hasSymbol) {
      return
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500)
    })
  }

  throw new Error(`timed out waiting for ${symbol} in trades summary`)
}

test('kifu core routes smoke', async ({ page }: { page: any }) => {
  const tokens = await createAuthedUser()

  await page.addInitScript(
    (payload: any) => {
      window.localStorage.setItem(
        payload.storageKey,
        JSON.stringify({
          state: {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    },
    { storageKey: authStorageKey, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  )

  const routes = [
    '/home',
    '/chart/BTCUSDT',
    '/trades',
    '/review',
    '/portfolio',
    '/bubbles',
    '/alerts',
    '/alert',
    '/settings',
  ]

  for (const route of routes) {
    await verifyAuthenticatedPages(page, route)
    // ensure shell/nav renders after auth
    await expect(page.getByRole('link', { name: /Home|홈/ })).toBeVisible()
  }

  await tokens.api.dispose()
})

test('home reflects today trade after user-like import flow', async ({ page }: { page: any }) => {
  const tokens = await createAuthedUser()

  await importTodayTradeCsv(tokens.api, tokens.accessToken, 'binance_futures', 'ETHUSDT')
  await waitForTodayTradeInApi(tokens.api, tokens.accessToken, 'ETHUSDT')

  await page.addInitScript(
    (payload: any) => {
      window.localStorage.setItem(
        payload.storageKey,
        JSON.stringify({
          state: {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    },
    { storageKey: authStorageKey, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  )

  const summaryResponsePromise = page.waitForResponse(
    (response: any) =>
      response.url().includes('/api/v1/trades/summary') &&
      response.request().method() === 'GET' &&
      response.status() === 200,
    { timeout: 15_000 },
  )
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
  const summaryResponse = await summaryResponsePromise
  const summaryJson = await summaryResponse.json()
  const totalTrades = Number(summaryJson?.totals?.total_trades ?? 0)
  expect(totalTrades).toBeGreaterThan(0)

  await tokens.api.dispose()
})
