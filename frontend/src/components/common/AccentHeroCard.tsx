'use client'

import type { ReactNode } from 'react'

type AccentHeroCardProps = {
  eyebrow: string
  title: string
  description: ReactNode
  aside?: ReactNode
  children?: ReactNode
  compact?: boolean
}

export function AccentHeroCard({
  eyebrow,
  title,
  description,
  aside,
  children,
  compact = false,
}: AccentHeroCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,_rgba(241,113,33,0.18),_transparent_32%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(10,10,10,0.92))] shadow-2xl shadow-black/30 ${
        compact ? 'p-5' : 'p-6'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2.5">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/70">{eyebrow}</p>
          <h1 className={`${compact ? 'text-2xl md:text-[2rem]' : 'text-3xl'} font-semibold tracking-tight text-white`}>
            {title}
          </h1>
          <div className="text-sm leading-relaxed text-neutral-300">{description}</div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  )
}
