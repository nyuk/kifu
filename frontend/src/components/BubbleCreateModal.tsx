import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type BubbleCreateModalProps = {
  open: boolean
  symbol: string
  defaultTimeframe: string
  defaultPrice?: string
  onClose: () => void
  onCreated?: () => void
}

const timeframes = ['1m', '15m', '1h', '4h', '1d']

export function BubbleCreateModal({
  open,
  symbol,
  defaultTimeframe,
  defaultPrice,
  onClose,
  onCreated,
}: BubbleCreateModalProps) {
  const [timeframe, setTimeframe] = useState(defaultTimeframe)
  const [candleTime, setCandleTime] = useState('')
  const [price, setPrice] = useState(defaultPrice || '')
  const [memo, setMemo] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTimeframe(timeframes.includes(defaultTimeframe) ? defaultTimeframe : '1h')
    setPrice(defaultPrice || '')
    setMemo('')
    setTagsInput('')
    setError('')
    setCandleTime(formatLocalDateTime(new Date()))
  }, [open, defaultPrice, defaultTimeframe])

  const tags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsInput])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!symbol) {
      setError('심볼이 선택되지 않았습니다.')
      return
    }
    if (!candleTime) {
      setError('캔들 시간을 입력해주세요.')
      return
    }
    if (!price.trim()) {
      setError('가격을 입력해주세요.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const candleISO = new Date(candleTime).toISOString()
      await api.post('/v1/bubbles', {
        symbol,
        timeframe,
        candle_time: candleISO,
        price: price.trim(),
        memo: memo.trim() ? memo.trim() : undefined,
        tags,
      })
      onCreated?.()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || '버블 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-xl">
        <div className="border-b border-neutral-800 px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Bubble</p>
          <h3 className="mt-2 text-xl font-semibold">새 말풍선 기록</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {symbol} · {timeframe}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              Timeframe
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              >
                {timeframes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Candle Time
              <input
                type="datetime-local"
                value={candleTime}
                onChange={(event) => setCandleTime(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <label className="text-sm text-neutral-300">
            Price
            <input
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="예: 104800"
            />
          </label>
          <label className="text-sm text-neutral-300">
            Memo
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="진입 근거, 심리 상태 등을 기록하세요."
            />
          </label>
          <label className="text-sm text-neutral-300">
            Tags (comma separated)
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100"
              placeholder="breakout, fomo"
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-neutral-700 px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </label>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '저장 중...' : '버블 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
