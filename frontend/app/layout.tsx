import type { Metadata } from 'next'
import '../src/index.css'
import { ToastProvider } from '../src/components/ui/Toast'

export const metadata: Metadata = {
  metadataBase: new URL('https://kifu.moneyvessel.kr'),
  title: 'KIFU — 매매 복기를 자동화하세요',
  description: '텔레그램에서 버튼 3번, 15초면 거래 복기 완료. AI가 매매 패턴을 분석하고 실제 거래와 자동 비교합니다.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'KIFU — 매매 복기를 자동화하세요',
    description: '텔레그램에서 버튼 3번, 15초면 거래 복기 완료. AI가 매매 패턴을 분석합니다.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIFU — 매매 복기를 자동화하세요',
    description: '텔레그램에서 버튼 3번, 15초면 거래 복기 완료.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0c0f13] text-zinc-200 antialiased selection:bg-green-500/30">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
