'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/login?from=${pathname}`)
    }
  }, [isAuthenticated, router, pathname])

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
