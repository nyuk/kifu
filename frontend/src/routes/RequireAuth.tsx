'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace(`/login?from=${pathname}`)
    }
  }, [isAuthenticated, hasHydrated, router, pathname])

  if (!mounted) {
    return isDemoMode ? null : <>{children}</>
  }

  if (!hasHydrated) {
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
