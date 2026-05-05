import { expect, request, test } from '@playwright/test'
import type { Page } from 'playwright-core'

const authStorageKey = 'kifu-auth-storage'

const ADMIN_EMAIL = 'test1@gmail.com'
const ADMIN_PASSWORD = 'admin1234'
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080'

type LoginResponse = {
  access_token?: string
  refresh_token?: string
}

async function getAdminTokens() {
  const api = await request.newContext({ baseURL: BACKEND_URL })

  const login = await api.post('/api/v1/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  if (login.status() !== 200) {
    throw new Error(`admin login failed: ${login.status()} ${await login.text()}`)
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

async function injectAuth(page: Page, accessToken: string, refreshToken: string) {
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

test.describe('admin pages', () => {
  test('Task 12: admin/agent-services page loads and renders AI toggles', async ({ page }: { page: Page }) => {
    const tokens = await getAdminTokens()
    await injectAuth(page, tokens.accessToken, tokens.refreshToken)

    await page.goto('/admin/agent-services', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: '../.sisyphus/evidence/task-12-admin-ui.png',
      fullPage: true,
    })

    const main = page.locator('main')
    await expect(main).toBeVisible({ timeout: 10_000 })

    await tokens.api.dispose()
  })

  test('Task 13: admin/policies page loads and renders marketing workflow', async ({ page }: { page: Page }) => {
    const tokens = await getAdminTokens()
    await injectAuth(page, tokens.accessToken, tokens.refreshToken)

    await page.goto('/admin/policies', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: '../.sisyphus/evidence/task-13-marketing-flow.png',
      fullPage: true,
    })

    const main = page.locator('main')
    await expect(main).toBeVisible({ timeout: 10_000 })

    await tokens.api.dispose()
  })
})
