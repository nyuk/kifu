/** @type {import('next').NextConfig} */
const configuredApiURL = process.env.NEXT_PUBLIC_API_BASE_URL
  || process.env.BACKEND_API_BASE_URL
  || ''

const normalizeConfiguredApiURL = (raw) => {
  const value = (raw || '').trim()
  if (!value || !/^https?:\/\//.test(value)) {
    return value
  }

  try {
    const parsed = new URL(value)

    // 방어적으로 공용 도메인의 8080 직접 접속을 제거해서
    // 404/SSL 오류를 줄입니다.
    if (parsed.hostname === 'kifu.moneyvessel.kr' && parsed.port === '8080') {
      parsed.port = ''
    }

    const pathname = parsed.pathname.replace(/\/+$/, '')
    if (!pathname.endsWith('/api')) {
      parsed.pathname = `${pathname}/api`
    }

    return parsed.toString()
  } catch {
    return raw
  }
}

const rewrittenApiURL = normalizeConfiguredApiURL(configuredApiURL)

const shouldRewriteToBackend =
  rewrittenApiURL.startsWith('http://') || rewrittenApiURL.startsWith('https://')

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!shouldRewriteToBackend) return []

    return [
      {
        source: '/api/:path*',
        destination: `${rewrittenApiURL.replace(/\/+$/, '')}/:path*`, // Proxy to backend (preserve /api prefix)
      },
    ]
  },
}

export default nextConfig
