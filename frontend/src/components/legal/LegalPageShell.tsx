import Link from 'next/link'
import type { ReactNode } from 'react'
import { LegalFooter } from './LegalFooter'
import { LEGAL_BETA_NOTICE } from '../../content/legal'

export function LegalPageShell({
  eyebrow,
  title,
  effectiveDate,
  children,
}: {
  eyebrow: string
  title: string
  effectiveDate: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-bold tracking-wider text-neutral-900">
            KIFU
          </Link>
          <span className="text-xs text-neutral-500">무료 베타 운영 문서</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{LEGAL_BETA_NOTICE}</p>
          <p className="mt-2 text-xs text-neutral-500">시행일: {effectiveDate}</p>
        </div>
        <div className="prose prose-neutral mt-8 max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-p:text-neutral-700 prose-li:text-neutral-700">
          {children}
        </div>
      </main>
      <LegalFooter variant="light" />
    </div>
  )
}
