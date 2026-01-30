'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/auth'

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chart')
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}
