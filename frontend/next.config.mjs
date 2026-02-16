/** @type {import('next').NextConfig} */
const configuredApiURL = process.env.NEXT_PUBLIC_API_BASE_URL
  || process.env.BACKEND_API_BASE_URL
  || ''

const shouldRewriteToBackend = configuredApiURL.startsWith('http://') || configuredApiURL.startsWith('https://')

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!shouldRewriteToBackend) return []

    return [
      {
        source: '/api/:path*',
        destination: `${configuredApiURL.replace(/\/+$/, '')}/:path*`, // Proxy to backend (preserve /api prefix)
      },
    ]
  },
}

export default nextConfig
