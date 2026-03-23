'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isGuestSession } from '../../../src/lib/guestSession'
import { useAuthStore } from '../../../src/stores/auth'
import { buildOnboardingProfile, readOnboardingDraft, readOnboardingProfile, saveOnboardingDraft, saveOnboardingProfile } from '../../../src/lib/onboardingProfile'

type Choice = 'long' | 'short' | 'hold'
type Confidence = 1 | 2 | 3 | 4 | 5
type Reason = 'trend' | 'reversal' | 'risk' | 'event' | 'volatility'
type Response = { choice: Choice; confidence: Confidence; reasons: Reason[] }
type Scenario = {
  id: number
  pair: string
  market: 'crypto' | 'stock'
  note: string
  signal: string
  context: string
}

const scenarios: Scenario[] = [
  { id: 1, pair: 'BTCUSDT', market: 'crypto', note: '급락 직후 첫 반등 캔들 출현', signal: 'RSI 30 하회', context: '거시 이벤트 2시간 전' },
  { id: 2, pair: 'ETHUSDT', market: 'crypto', note: '횡보 상단 재테스트', signal: '거래량 점진 증가', context: '3번째 저항 시도' },
  { id: 3, pair: 'TSLA', market: 'stock', note: '고점 부근 윗꼬리 연속', signal: '변동성 확대', context: '옵션 만기 주간' },
  { id: 4, pair: 'NVDA', market: 'stock', note: '강한 추세 중 첫 깊은 눌림', signal: 'VWAP 하향 이탈', context: '섹터 동반 조정' },
  { id: 5, pair: 'KRW-BTC', market: 'crypto', note: '국내 가격 괴리 급증', signal: '스프레드 확대', context: '단기 과열/과매수 구간' },
]

const reasonOptions: Array<{ key: Reason; label: string }> = [
  { key: 'trend', label: '추세 추종' },
  { key: 'reversal', label: '반전 기대' },
  { key: 'risk', label: '리스크 회피' },
  { key: 'event', label: '이벤트 대응' },
  { key: 'volatility', label: '변동성 매매' },
]

export default function OnboardingTestPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const guestMode = isGuestSession()
  const [answers, setAnswers] = useState<Record<number, Response>>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  const completed = Object.values(answers).filter((item) => Boolean(item?.choice)).length
  const longCount = Object.values(answers).filter((item) => item.choice === 'long').length
  const shortCount = Object.values(answers).filter((item) => item.choice === 'short').length
  const holdCount = Object.values(answers).filter((item) => item.choice === 'hold').length
  const isComplete = completed >= scenarios.length
  const current = scenarios[currentIndex]
  const currentAnswer = answers[current.id]
  const progress = Math.round((completed / scenarios.length) * 100)
  const confidenceAverage = useMemo(() => {
    const values = Object.values(answers).map((item) => item.confidence || 3)
    if (values.length === 0) return 0
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
  }, [answers])

  const tendency = useMemo(() => {
    if (!isComplete) return '진단 중'
    const profile = buildOnboardingProfile(answers, scenarios.length)
    return profile.tendency
  }, [answers, isComplete])

  const nextStepLinks = useMemo(() => {
    if (isAuthenticated) {
      return {
        primaryHref: '/settings',
        primaryLabel: 'Settings에서 거래 연결',
        secondaryHref: '/home',
        secondaryLabel: '서재로 돌아가기',
        helper: '이제 실제 거래를 불러오면 홈, 차트, 복기 흐름이 실제 데이터로 채워집니다.',
      }
    }

    return {
      primaryHref: '/register?next=%2Fsettings',
      primaryLabel: '회원가입 후 Settings로 이동',
      secondaryHref: '/guest?mode=preview',
      secondaryLabel: '게스트 미리보기 보기',
      helper: '진단은 저장됐지만, 실제 데이터 저장과 연결은 웹 계정 + Settings에서 시작됩니다.',
    }
  }, [isAuthenticated])

  useEffect(() => {
    const draft = readOnboardingDraft<Record<number, Response>>()
    if (draft?.answers && Object.keys(draft.answers).length > 0) {
      setAnswers(draft.answers)
      if (Number.isInteger(draft.current_index)) {
        setCurrentIndex(Math.max(0, Math.min(scenarios.length - 1, draft.current_index)))
      }
    }
    const current = readOnboardingProfile()
    if (current?.completed_at) {
      setSavedAt(current.completed_at)
    }
  }, [])

  useEffect(() => {
    saveOnboardingDraft({
      updated_at: new Date().toISOString(),
      answers,
      current_index: currentIndex,
    })
  }, [answers, currentIndex])

  useEffect(() => {
    if (!isComplete) return
    const profile = buildOnboardingProfile(answers, scenarios.length)
    saveOnboardingProfile(profile)
    setSavedAt(profile.completed_at)
    setSaveFeedback('진단이 자동 저장되었습니다.')
  }, [answers, isComplete])

  const handleSave = () => {
    if (guestMode) {
      setSaveFeedback('게스트 모드에서는 성향 테스트를 저장할 수 없습니다. 웹 계정을 만들면 이용할 수 있습니다.')
      return
    }
    const profile = buildOnboardingProfile(answers, scenarios.length)
    saveOnboardingProfile(profile)
    setSavedAt(profile.completed_at)
    if (isAuthenticated) {
      router.push('/home')
      return
    }
    setSaveFeedback('진단 저장 완료. 아래 다음 단계에서 계정 생성 또는 미리보기를 선택할 수 있어요.')
  }

  const updateChoice = (choice: Choice) => {
    setAnswers((prev) => {
      const before = prev[current.id]
      return {
        ...prev,
        [current.id]: {
          choice,
          confidence: before?.confidence || 3,
          reasons: before?.reasons || [],
        },
      }
    })
  }

  const updateConfidence = (confidence: Confidence) => {
    setAnswers((prev) => {
      const before = prev[current.id]
      return {
        ...prev,
        [current.id]: {
          choice: before?.choice || 'hold',
          confidence,
          reasons: before?.reasons || [],
        },
      }
    })
  }

  const toggleReason = (reason: Reason) => {
    setAnswers((prev) => {
      const before = prev[current.id] || { choice: 'hold' as Choice, confidence: 3 as Confidence, reasons: [] as Reason[] }
      const has = before.reasons.includes(reason)
      const reasons = has ? before.reasons.filter((item) => item !== reason) : [...before.reasons, reason]
      return {
        ...prev,
        [current.id]: {
          ...before,
          reasons,
        },
      }
    })
  }

  if (guestMode) {
    return (
      <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Members Only</p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-100">성향 테스트는 회원 전용입니다</h1>
            <p className="mt-3 text-sm text-amber-100/80">
              게스트 모드는 읽기 전용 미리보기입니다. 성향 테스트 결과 저장과 이후 연결 흐름은 웹 계정에서만 사용할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/register?next=%2Fonboarding%2Ftest"
                className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950"
              >
                회원가입 후 테스트 시작
              </Link>
              <Link
                href="/guest?mode=preview"
                className="rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100"
              >
                게스트 미리보기로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <div className="w-full space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Onboarding Test</p>
            <h1 className="mt-2 text-3xl font-semibold">초기 성향 테스트 (5문항 · 약 3분)</h1>
            <p className="mt-2 text-sm text-neutral-400">
              실제 매매와 비슷한 핵심 상황만 빠르게 통과해 초기 루틴 보정 정확도를 높입니다.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              진행률 {progress}% · 완료 {completed}/{scenarios.length} · 평균 확신도 {confidenceAverage || '-'}
            </p>
          </header>

          <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Scenario {currentIndex + 1} · {current.market.toUpperCase()}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-sky-300">{current.pair}</h2>
            <p className="mt-2 text-sm text-neutral-300">{current.note}</p>
            <p className="mt-1 text-xs text-zinc-400">신호: {current.signal}</p>
            <p className="mt-1 text-xs text-zinc-400">맥락: {current.context}</p>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">포지션 선택</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { key: 'long' as const, label: '롱 진입' },
                  { key: 'short' as const, label: '숏 진입' },
                  { key: 'hold' as const, label: '관망' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updateChoice(option.key)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${currentAnswer?.choice === option.key
                        ? 'border-neutral-100 bg-neutral-100 text-neutral-950'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">확신도</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateConfidence(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${(currentAnswer?.confidence || 3) === value
                        ? 'border-cyan-300 bg-cyan-300/20 text-cyan-200'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">판단 근거(복수 선택)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {reasonOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleReason(option.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${currentAnswer?.reasons?.includes(option.key)
                        ? 'border-emerald-300 bg-emerald-300/15 text-emerald-200'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 disabled:opacity-40"
              >
                이전
              </button>
              {currentIndex < scenarios.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(scenarios.length - 1, prev + 1))}
                  disabled={!currentAnswer?.choice}
                  className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-40"
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!currentAnswer?.choice}
                  className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-40"
                >
                  {isAuthenticated ? '진단 저장 후 서재 이동' : '진단 저장'}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800/60 bg-neutral-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">임시 진단</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">{tendency}</p>
            <p className="mt-1 text-sm text-neutral-400">
              완료 {completed}/{scenarios.length} · LONG {longCount} · SHORT {shortCount} · HOLD {holdCount}
            </p>
            <p className="mt-1 text-sm text-neutral-400">평균 확신도 {confidenceAverage || '-'}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {savedAt ? `저장됨: ${new Date(savedAt).toLocaleString('ko-KR')}` : '완료 시 자동 저장됩니다.'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">선택한 포지션/근거는 문항마다 자동 저장됩니다.</p>
            {saveFeedback && (
              <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {saveFeedback}
              </p>
            )}
            {!isAuthenticated && (
              <p className="mt-3 text-xs text-zinc-400">
                완료 후 회원가입하면 결과를 이어서 사용할 수 있습니다.
              </p>
            )}
          </section>

          {isComplete && (
            <section className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">다음 단계</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-100">
                진단은 끝났습니다. 이제 실제 사용 흐름으로 넘어가면 됩니다.
              </h2>
              <p className="mt-2 text-sm text-zinc-300">{nextStepLinks.helper}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push(nextStepLinks.primaryHref)}
                  className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950"
                >
                  {nextStepLinks.primaryLabel}
                </button>
                <Link
                  href={nextStepLinks.secondaryHref}
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
                >
                  {nextStepLinks.secondaryLabel}
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">1</p>
                  <p className="mt-2 text-sm font-medium text-zinc-100">거래 연결 또는 CSV 업로드</p>
                  <p className="mt-1 text-xs text-zinc-400">Settings에서 실제 데이터를 붙입니다.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">2</p>
                  <p className="mt-2 text-sm font-medium text-zinc-100">홈과 차트 확인</p>
                  <p className="mt-1 text-xs text-zinc-400">가져온 거래가 서재와 차트에 채워집니다.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">3</p>
                  <p className="mt-2 text-sm font-medium text-zinc-100">첫 복기 완료</p>
                  <p className="mt-1 text-xs text-zinc-400">그때부터 KIFU가 실제 패턴을 쌓기 시작합니다.</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
