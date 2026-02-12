import type { Metadata } from 'next'
import '../src/index.css'
import { ToastProvider } from '../src/components/ui/Toast'

export const metadata: Metadata = {
  title: 'KIFU',
  description: 'AI-Powered Crypto Trading Journal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#120e08] text-zinc-100 antialiased selection:bg-green-500/30">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
