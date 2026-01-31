'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.replace(`/login?from=${pathname}`)
    }
  }, [isAuthenticated, router, pathname])

  // During SSR and initial hydration, render children to avoid mismatch
  // Only after mounting, check authentication
  if (!mounted) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
