'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/auth'
import { isDemoMode } from '../lib/appMode'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isDemoMode) {
      router.replace('/guest')
      return
    }
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace(`/login?from=${pathname}`)
    }
  }, [isAuthenticated, hasHydrated, router, pathname])

  // During SSR and initial hydration, render children to avoid mismatch
  // Only after mounting, check authentication
  if (!mounted) {
    return <>{children}</>
  }

  if (isDemoMode) {
    return null
  }

  if (!hasHydrated) {
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
