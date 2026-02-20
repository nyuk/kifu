import type { ReactNode } from 'react'
import { RequireAdmin } from '../../../src/routes/RequireAdmin'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>
}
