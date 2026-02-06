'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LandingPage } from '../src/components/landing/LandingPage'
import { useAuthStore } from '../src/stores/auth'

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home')
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null
  }

  return <LandingPage />
}
