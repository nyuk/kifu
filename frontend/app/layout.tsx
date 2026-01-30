import type { ReactNode } from 'react'
import '../src/index.css'

export const metadata = {
  title: 'Kifu',
  description: 'Trading journal system',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
