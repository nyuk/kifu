import { expect, request, test } from '@playwright/test'

const authStorageKey = 'kifu-auth-storage'

type LoginResponse = {
  access_token?: string
  refresh_token?: string
}

async function createAuthedUser() {
  const timestamp = Date.now()
  const email = `checkpoint_${timestamp}@kifu.local`
  const password = 'TestPass123!'
  const name = 'Checkpoint QA User'

  const api = await request.newContext({
    baseURL: process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1',
  })

  const register = await api.post('/api/v1/auth/register', {
    data: { email, password, name },
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
  }
}

async function injectAuth(page: any, accessToken: string, refreshToken: string) {
  await page.addInitScript(
    (payload: { storageKey: string; accessToken: string; refreshToken: string }) => {
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
    { storageKey: authStorageKey, accessToken, refreshToken },
  )
}

test('checkpoint: home readability and checklist labels', async ({ page }) => {
  const tokens = await createAuthedUser()
  await injectAuth(page, tokens.accessToken, tokens.refreshToken)

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })

  await expect(page.getByText('오늘의 3가지 질문')).toBeVisible()
  await expect(page.getByText('오늘의 마감')).toBeVisible()
  await expect(page.getByText('실거래')).toBeVisible()
  await expect(page.getByText('주요 거래소')).toBeVisible()
  await expect(page.getByText('주요 심볼')).toBeVisible()

  await page.screenshot({
    path: '../.sisyphus/evidence/checkpoint-home-desktop.png',
    fullPage: true,
  })

  await tokens.api.dispose()
})

test('checkpoint: narrow screen layout on key pages (390, 430)', async ({ page }) => {
  const tokens = await createAuthedUser()
  await injectAuth(page, tokens.accessToken, tokens.refreshToken)

  const targets = ['/home', '/chart/BTCUSDT', '/review']
  const viewports = [
    { width: 390, height: 844, suffix: '390x844' },
    { width: 430, height: 932, suffix: '430x932' },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const route of targets) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: `../.sisyphus/evidence/checkpoint-${route.replace('/', '') || 'home'}-${viewport.suffix}.png`,
        fullPage: true,
      })
    }
  }

  await tokens.api.dispose()
})

test('checkpoint: pagination boundary behavior on portfolio', async ({ page }) => {
  const tokens = await createAuthedUser()
  await injectAuth(page, tokens.accessToken, tokens.refreshToken)

  await page.goto('/portfolio', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })

  const quickSummary = page.locator('text=/items\\s*·\\s*\\d+\\s*\\/\\s*\\d+\\s*페이지/')
  const jumpLabel = page.getByText('바로가기')

  if (await jumpLabel.count()) {
    await expect(page.getByRole('button', { name: '처음' })).toBeVisible()
    await expect(page.getByRole('button', { name: '이전' })).toBeVisible()
    await expect(page.getByRole('button', { name: '다음' })).toBeVisible()
    await expect(page.getByRole('button', { name: '끝' })).toBeVisible()
  } else {
    await expect(quickSummary.first()).toBeVisible()
  }

  await page.screenshot({
    path: '../.sisyphus/evidence/checkpoint-portfolio-pagination.png',
    fullPage: true,
  })

  await tokens.api.dispose()
})
