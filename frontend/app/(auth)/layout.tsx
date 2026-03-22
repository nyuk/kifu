import { GuestOnly } from '../../src/routes/GuestOnly'
import type { ReactNode } from 'react'
import { LegalFooter } from '../../src/components/legal/LegalFooter'

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <GuestOnly>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <LegalFooter variant="light" />
      </div>
    </GuestOnly>
  )
}
