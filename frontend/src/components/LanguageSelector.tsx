'use client'

import { useState, useEffect } from 'react'

type Locale = 'en' | 'ko'

export function LanguageSelector() {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kifu-locale')
      if (saved === 'en' || saved === 'ko') {
        setLocale(saved)
      } else {
        const browserLang = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
        setLocale(browserLang)
      }
    }
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('kifu-locale', newLocale)
      window.location.reload()
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLocale('en')}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
          locale === 'en'
            ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
            : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
        }`}
      >
        English
      </button>
      <button
        onClick={() => changeLocale('ko')}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
          locale === 'ko'
            ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
            : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
        }`}
      >
        한국어
      </button>
    </div>
  )
}
