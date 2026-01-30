import { RequireAuth } from '../../src/routes/RequireAuth'
import { Shell } from '../../src/components/Shell'
import type { ReactNode } from 'react'

export default function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  )
}
