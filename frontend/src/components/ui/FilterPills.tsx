'use client'

import type { ReactNode } from 'react'

type Tone = 'amber' | 'sky' | 'lime' | 'fuchsia' | 'rose' | 'cyan' | 'emerald'

const toneText: Record<Tone, string> = {
  amber: 'text-amber-300',
  sky: 'text-sky-300',
  lime: 'text-lime-300',
  fuchsia: 'text-fuchsia-300',
  rose: 'text-rose-300',
  cyan: 'text-cyan-300',
  emerald: 'text-emerald-300',
}

const toneActive: Record<Tone, string> = {
  amber: 'bg-amber-300 text-neutral-950 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
  sky: 'bg-sky-300 text-neutral-950 shadow-[0_0_16px_rgba(56,189,248,0.35)]',
  lime: 'bg-lime-300 text-neutral-950 shadow-[0_0_16px_rgba(190,242,100,0.35)]',
  fuchsia: 'bg-fuchsia-300 text-neutral-950 shadow-[0_0_16px_rgba(244,114,182,0.35)]',
  rose: 'bg-rose-300 text-neutral-950 shadow-[0_0_16px_rgba(251,113,133,0.35)]',
  cyan: 'bg-cyan-300 text-neutral-950 shadow-[0_0_16px_rgba(103,232,249,0.35)]',
  emerald: 'bg-emerald-300 text-neutral-950 shadow-[0_0_16px_rgba(110,231,183,0.35)]',
}

const toneHover: Record<Tone, string> = {
  amber: 'hover:text-amber-200',
  sky: 'hover:text-sky-200',
  lime: 'hover:text-lime-200',
  fuchsia: 'hover:text-fuchsia-200',
  rose: 'hover:text-rose-200',
  cyan: 'hover:text-cyan-200',
  emerald: 'hover:text-emerald-200',
}

type Variant = 'default' | 'paper'

type FilterGroupProps = {
  label: string
  tone?: Tone
  variant?: Variant
  children: ReactNode
}

export function FilterGroup({ label, tone = 'amber', variant = 'default', children }: FilterGroupProps) {
  const labelClass = variant === 'paper'
    ? 'text-neutral-500'
    : toneText[tone]
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${labelClass}`}>
        {label}
      </span>
      {children}
    </div>
  )
}

type FilterPillOption = {
  value: string
  label: string
}

type FilterPillsProps = {
  options: FilterPillOption[]
  value: string
  onChange: (value: string) => void
  tone?: Tone
  variant?: Variant
  ariaLabel?: string
}

export function FilterPills({
  options,
  value,
  onChange,
  tone = 'amber',
  variant = 'default',
  ariaLabel,
}: FilterPillsProps) {
  const isPaper = variant === 'paper'
  const wrapClass = isPaper
    ? 'flex rounded-full border border-neutral-200 bg-neutral-50 p-1'
    : 'flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm'
  return (
    <div className={wrapClass} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = value === option.value
        const activeClass = isPaper
          ? 'bg-neutral-800 text-white shadow-sm'
          : toneActive[tone]
        const inactiveClass = isPaper
          ? 'text-neutral-500 hover:text-neutral-700'
          : `text-neutral-300 ${toneHover[tone]}`
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${isActive ? activeClass : inactiveClass}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
