import { type KeyboardEvent } from 'react'

type PageJumpPagerProps = {
  totalItems: number
  totalPages: number
  currentPage: number
  pageInput: string
  onPageInputChange: (value: string) => void
  onPageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onFirst: () => void
  onPrevious: () => void
  onNext: () => void
  onLast: () => void
  onJump: () => void
  disabled?: boolean
  itemLabel?: string
}

export function PageJumpPager({
  totalItems,
  totalPages,
  currentPage,
  pageInput,
  onPageInputChange,
  onPageInputKeyDown,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onJump,
  disabled = false,
  itemLabel = '개',
}: PageJumpPagerProps) {
  if (totalPages <= 1) {
    return (
      <div className="mt-3 flex items-center justify-end text-xs text-zinc-400">
        {totalItems.toLocaleString()} {itemLabel}
      </div>
    )
  }

  const isFirstDisabled = disabled || currentPage <= 1
  const isLastDisabled = disabled || currentPage >= totalPages

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-xs text-zinc-400">
        {totalItems.toLocaleString()} {itemLabel} · {currentPage} / {totalPages} 페이지
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFirst}
          disabled={isFirstDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          처음
        </button>
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span>바로가기</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(event) => onPageInputChange(event.target.value)}
            onKeyDown={onPageInputKeyDown}
            disabled={disabled}
            className="w-20 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-zinc-100"
          />
          <span>/ {totalPages}</span>
        </label>
        <button
          type="button"
          onClick={onJump}
          disabled={disabled}
          className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이동
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLastDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={isLastDisabled}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          끝
        </button>
      </div>
    </div>
  )
}

