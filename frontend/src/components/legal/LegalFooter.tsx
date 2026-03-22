import Link from 'next/link'
import {
  LEGAL_BETA_NOTICE,
  LEGAL_CONTACT_NOTE,
  LEGAL_CONTACT_PLACEHOLDER,
  LEGAL_OPERATOR_LABEL,
  LEGAL_SERVICE_NAME,
} from '../../content/legal'

type LegalFooterVariant = 'dark' | 'light' | 'app'

const variantClass: Record<LegalFooterVariant, string> = {
  dark: 'border-white/8 bg-neutral-950 text-neutral-400',
  light: 'border-neutral-200 bg-white text-neutral-500',
  app: 'border-white/8 bg-transparent text-zinc-500',
}

const linkClass: Record<LegalFooterVariant, string> = {
  dark: 'text-neutral-300 hover:text-white',
  light: 'text-neutral-700 hover:text-neutral-950',
  app: 'text-zinc-300 hover:text-white',
}

export function LegalFooter({ variant = 'light' }: { variant?: LegalFooterVariant }) {
  return (
    <footer className={`border-t ${variantClass[variant]}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-6 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold">{LEGAL_SERVICE_NAME}</span>
          <span>운영자: {LEGAL_OPERATOR_LABEL}</span>
          <span>문의: {LEGAL_CONTACT_PLACEHOLDER}</span>
        </div>
        <p className="leading-relaxed">{LEGAL_BETA_NOTICE}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/privacy" className={`transition-colors ${linkClass[variant]}`}>
            개인정보 처리방침
          </Link>
          <Link href="/terms" className={`transition-colors ${linkClass[variant]}`}>
            이용약관
          </Link>
        </div>
        <p className="leading-relaxed opacity-80">{LEGAL_CONTACT_NOTE}</p>
      </div>
    </footer>
  )
}
