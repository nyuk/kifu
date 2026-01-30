import { GuestOnly } from '../../src/routes/GuestOnly'
import type { ReactNode } from 'react'

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return <GuestOnly>{children}</GuestOnly>
}
