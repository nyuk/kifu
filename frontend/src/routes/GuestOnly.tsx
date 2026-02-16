'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isAuthenticated) {
      const target = searchParams?.get('next') || searchParams?.get('from')
      const candidate = (target || '').trim()
      const destination = candidate && candidate.startsWith('/') && !candidate.startsWith('/guest')
        ? candidate
        : '/home'
      router.replace(destination)
    }
  }, [isAuthenticated, router, searchParams])

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}
