'use client'

import { useCallback, useState } from 'react'
import { useGuidedReviewStore } from '../../stores/guidedReviewStore'
import {
  INTENT_OPTIONS,
  EMOTION_OPTIONS,
  PATTERN_OPTIONS,
  NO_TRADE_INTENT_OPTIONS,
  NO_TRADE_PATTERN_OPTIONS,
  NO_TRADE_SYMBOL,
} from '../../types/guidedReview'
import type { GuidedReviewItem } from '../../types/guidedReview'

type Layer = 'intent' | 'emotions' | 'pattern' | 'memo'

const LAYERS: Layer[] = ['intent', 'emotions', 'pattern', 'memo']

const layerTitle: Record<Layer, string> = {
  intent: '이 거래의 진입 이유는?',
  emotions: '거래 시 감정은? (복수 선택)',
  pattern: '다시 한다면?',
  memo: '한 줄 메모',
}

const noTradeLayerTitle: Record<Layer, string> = {
  intent: '오늘 거래를 하지 않은 가장 큰 이유는?',
  emotions: '오늘 시장을 보며 느낀 감정은? (복수 선택)',
  pattern: '내일은 어떤 기준으로 움직일까요?',
  memo: '비거래일 메모',
}

const pnlTone = (pnl?: number | null) => {
  if (pnl === null || pnl === undefined) return 'text-neutral-300'
  if (pnl > 0) return 'text-lime-300'
  if (pnl < 0) return 'text-rose-300'
  return 'text-neutral-300'
}

const formatPnl = (pnl?: number | null) => {
  if (pnl === null || pnl === undefined) return '-'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

type ItemFlowProps = {
  item: GuidedReviewItem
  index: number
  total: number
  onSubmitted: () => void
}

function ItemFlow({ item, index, total, onSubmitted }: ItemFlowProps) {
  const { submitItem } = useGuidedReviewStore()
  const [currentLayer, setCurrentLayer] = useState(0)
  const [intent, setIntent] = useState(item.intent || '')
  const [emotions, setEmotions] = useState<string[]>(item.emotions || [])
  const [pattern, setPattern] = useState(item.pattern_match || '')
  const [memo, setMemo] = useState(item.memo || '')
  const [submitting, setSubmitting] = useState(false)

  const layer = LAYERS[currentLayer]
  const isNoTradeDayItem = item.symbol === NO_TRADE_SYMBOL || item.trade_count === 0
  const isSupplementItem = (item.bundle_key || '').startsWith('SUPPLEMENT:')
  const isRolloverItem = (item.bundle_key || '').startsWith('ROLLOVER:')
  const intentOptions = isNoTradeDayItem ? NO_TRADE_INTENT_OPTIONS : INTENT_OPTIONS
  const patternOptions = isNoTradeDayItem ? NO_TRADE_PATTERN_OPTIONS : PATTERN_OPTIONS
  const resolvedLayerTitle = isNoTradeDayItem ? noTradeLayerTitle[layer] : layerTitle[layer]

  const toggleEmotion = useCallback((value: string) => {
    setEmotions((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    )
  }, [])

  const canAdvance = () => {
    if (layer === 'intent') return intent !== ''
    if (layer === 'emotions') return emotions.length > 0
    if (layer === 'pattern') return pattern !== ''
    return true
  }

  const handleNext = async () => {
    if (currentLayer < LAYERS.length - 1) {
      setCurrentLayer(currentLayer + 1)
      return
    }
    // Submit
    setSubmitting(true)
    const ok = await submitItem(item.id, {
      intent,
      emotions,
      pattern_match: pattern,
      memo,
    })
    setSubmitting(false)
    if (ok) onSubmitted()
  }

  const handleBack = () => {
    if (currentLayer > 0) setCurrentLayer(currentLayer - 1)
  }

  const isAlreadyAnswered = Boolean(item.intent)

  return (
    <div className="space-y-5">
      {/* Item header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-neutral-100">
            {isNoTradeDayItem ? '비거래일 복기' : item.symbol}
          </p>
          <p className="text-xs text-neutral-500">
            {isNoTradeDayItem
              ? '오늘은 거래 없이 루틴을 이어갑니다'
              : `${item.side ? item.side.toUpperCase() : '-'} · ${item.trade_count}건`}
          </p>
          {(isSupplementItem || isRolloverItem) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isSupplementItem && (
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  보강
                </span>
              )}
              {isRolloverItem && (
                <span className="rounded-full border border-violet-300/40 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">
                  이월
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className={`text-xl font-semibold ${pnlTone(item.pnl)}`}>{formatPnl(item.pnl)}</p>
          <p className="text-[10px] text-neutral-500">{index + 1} / {total}</p>
        </div>
      </div>

      {/* Layer progress */}
      <div className="flex gap-1">
        {LAYERS.map((l, i) => (
          <div
            key={l}
            className={`h-1 flex-1 rounded-full transition ${
              i <= currentLayer ? 'bg-sky-400' : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {isAlreadyAnswered && currentLayer === 0 ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-200">답변 완료</p>
          <p className="mt-1 text-xs text-emerald-200/70">
            {intentOptions.find((o) => o.value === item.intent)?.label}
            {item.emotions && item.emotions.length > 0 && (
              <> · {item.emotions.map((e) => EMOTION_OPTIONS.find((o) => o.value === e)?.label).filter(Boolean).join(', ')}</>
            )}
          </p>
          <button
            type="button"
            onClick={onSubmitted}
            className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-900"
          >
            다음
          </button>
        </div>
      ) : (
        <>
          {/* Layer title */}
          <p className="text-sm font-semibold text-neutral-200">{resolvedLayerTitle}</p>

          {/* Layer content */}
          {layer === 'intent' && (
            <div className="flex flex-wrap gap-2">
              {intentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIntent(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    intent === option.value
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-neutral-700/60 bg-neutral-900/60 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'emotions' && (
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmotion(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    emotions.includes(option.value)
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : 'border-neutral-700/60 bg-neutral-900/60 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'pattern' && (
            <div className="flex flex-wrap gap-2">
              {patternOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPattern(option.value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    pattern === option.value
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-neutral-700/60 bg-neutral-900/60 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {layer === 'memo' && (
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={isNoTradeDayItem ? '오늘 비거래 선택이 맞았는지, 내일 체크할 조건을 남기기 (선택)' : '오늘 이 거래에 대해 한 줄 남기기 (선택)'}
              rows={3}
              className="w-full rounded-xl border border-neutral-700/60 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentLayer === 0}
              className="rounded-lg border border-neutral-700/60 px-4 py-2 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className="rounded-lg bg-neutral-100 px-6 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? '저장 중...'
                : currentLayer === LAYERS.length - 1
                  ? '제출'
                  : '다음'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function GuidedReviewFlow({ onClose }: { onClose: () => void }) {
  const { review, items, currentStep, streak, completeReview, nextStep, setStep } =
    useGuidedReviewStore()
  const [completing, setCompleting] = useState(false)

  const answeredCount = items.filter((i) => i.intent).length
  const totalCount = items.length
  const allAnswered = answeredCount === totalCount && totalCount > 0
  const isCompleted = review?.status === 'completed' && allAnswered

  const handleItemSubmitted = () => {
    if (currentStep < items.length - 1) {
      nextStep()
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    await completeReview()
    setCompleting(false)
  }

  if (isCompleted) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">&#127881;</div>
        <p className="text-xl font-semibold text-neutral-100">오늘의 복기 완료!</p>
        {streak && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2">
            <span className="text-lg">&#128293;</span>
            <span className="text-sm font-semibold text-amber-200">{streak.current_streak}일 연속</span>
          </div>
        )}
        <p className="text-xs text-neutral-500">
          최고 기록: {streak?.longest_streak ?? 0}일
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-100 px-6 py-2.5 text-sm font-semibold text-neutral-900"
        >
          닫기
        </button>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-neutral-400">오늘 거래 기록이 없습니다.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {answeredCount} / {totalCount} 완료
        </p>
        <div className="flex gap-1">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 w-6 rounded-full transition ${
                i === currentStep
                  ? 'bg-sky-400'
                  : item.intent
                    ? 'bg-emerald-500'
                    : 'bg-neutral-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current item */}
      {items[currentStep] && (
        <ItemFlow
          key={items[currentStep].id}
          item={items[currentStep]}
          index={currentStep}
          total={totalCount}
          onSubmitted={handleItemSubmitted}
        />
      )}

      {/* Complete button */}
      {allAnswered && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {completing ? '완료 처리 중...' : '복기 완료하기'}
          </button>
        </div>
      )}
    </div>
  )
}
