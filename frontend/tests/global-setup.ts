async function globalSetup(): Promise<void> {
  const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
  const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080'

  process.env.BACKEND_API_URL = backendUrl
  process.env.FRONTEND_BASE_URL = frontendBaseUrl
}

export default globalSetup
