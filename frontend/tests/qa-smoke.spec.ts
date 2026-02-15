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

  await api.dispose()

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
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
})
