import type { ReactNode } from 'react'
import { LegalFooter } from '../../src/components/legal/LegalFooter'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <LegalFooter variant="dark" />
    </div>
  )
}
