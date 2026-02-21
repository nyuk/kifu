'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'
import { isGuestSession } from '../lib/guestSession'
import { useAuthStore } from '../stores/auth'

type MeResponse = {
  email?: string
  is_admin?: boolean
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (isGuestSession()) {
      router.replace('/home')
      return
    }

    let active = true
    const verifyAdmin = async () => {
      try {
        const response = await api.get<MeResponse>('/v1/users/me')
        if (!active) return
        const isAdmin = Boolean(response.data?.is_admin)
        setAllowed(isAdmin)
        setChecked(true)
        if (!isAdmin) {
          router.replace('/home')
        }
      } catch {
        if (!active) return
        setAllowed(false)
        setChecked(true)
        router.replace('/home')
      }
    }

    verifyAdmin()

    return () => {
      active = false
    }
  }, [hasHydrated, isAuthenticated, router])

  if (!hasHydrated || !isAuthenticated || !checked || !allowed) {
    return null
  }

  return <>{children}</>
}
