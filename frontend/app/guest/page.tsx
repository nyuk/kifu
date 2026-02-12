'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../src/lib/api'
import { startGuestSession } from '../../src/lib/guestSession'
import { useAuthStore } from '../../src/stores/auth'

type GuestTab = 'home' | 'chart' | 'review' | 'portfolio'

const demoCards = [
  { title: '오늘의 스냅샷', value: '+$1,284', desc: '실거래 28건 · 매수 16 / 매도 12' },
  { title: '판단 정확도', value: '74.1%', desc: '최근 30일 AI 의견 매칭률' },
  { title: '긴급 알림', value: 'BTC RSI<30', desc: '유사상황 5건 자동 브리핑' },
  { title: '복기 데이터', value: '182 bubbles', desc: '성과/실수 패턴 자동 분류' },
]

const tabMeta: Record<GuestTab, { label: string; title: string; summary: string; bullets: string[] }> = {
  home: {
    label: '홈',
    title: '오늘 스냅샷',
    summary: '핵심 PnL · 거래수 · AI 합의도를 한 화면에서 확인',
    bullets: ['핵심 PnL 숫자 강조', '매수/매도 즉시 요약', '오늘 루틴 1개 제시'],
  },
  chart: {
    label: '차트',
    title: '말풍선 + 거래 오버레이',
    summary: '캔들 클릭 후 말풍선 저장, 실거래와 함께 비교',
    bullets: ['버블/트레이드 동시 표시', '밀도 모드로 가독성 조절', '선택 캔들 상세 패널'],
  },
  review: {
    label: '복기',
    title: '유사 상황 복원',
    summary: '예전 비슷한 판단과 결과를 자동 매칭해서 비교',
    bullets: ['심볼별 성과 랭킹', '실수 패턴 추적', 'AI 코멘트 정확도 비교'],
  },
  portfolio: {
    label: '포트폴리오',
    title: '통합 자산 흐름',
    summary: '거래소/자산군별 흐름을 타임라인으로 통합',
    bullets: ['CEX + DEX + 주식 통합', '자산군 필터 지원', '포지션 요약 연동'],
  },
}

export default function GuestPage() {
  const router = useRouter()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [tab, setTab] = useState<GuestTab>('home')
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const scenario = useMemo(
    () =>
      [
        '새벽 알림 발생 -> 앱 진입 -> AI 긴급 브리핑 확인',
        '차트에서 말풍선 기록 -> 근거/확신도 저장',
        '퇴근 후 복기 탭에서 오늘 판단 결과 확인',
      ][scenarioIndex],
    [scenarioIndex],
  )

  const handleGuestStart = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const guestEmail = process.env.NEXT_PUBLIC_GUEST_EMAIL || 'guest.preview@kifu.local'
      const guestPassword = process.env.NEXT_PUBLIC_GUEST_PASSWORD || 'guest1234'
      const response = await api.post('/v1/auth/login', { email: guestEmail, password: guestPassword })
      setTokens(response.data.access_token, response.data.refresh_token)
      startGuestSession()
      router.push('/home')
    } catch (err: any) {
      const message = err?.response?.data?.message || '게스트 시작에 실패했습니다. 잠시 후 다시 시도해주세요.'
      setStartError(message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Guest Mode</p>
          <h1 className="text-3xl font-semibold">게스트 대시보드 미리보기</h1>
          <p className="text-sm text-zinc-400">
            더미 데이터로 전체 탭 흐름을 체험하고, 서비스가 어떤 느낌으로 돌아가는지 빠르게 확인할 수 있습니다.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {demoCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{card.desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(tabMeta) as GuestTab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${tab === key
                  ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
              >
                {tabMeta[key].label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{tabMeta[tab].title}</p>
              <p className="mt-1 text-sm text-zinc-300">{tabMeta[tab].summary}</p>

              {tab === 'chart' && (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="flex h-20 items-end gap-1">
                    {[10, 26, 18, 34, 22, 45, 30, 38, 24, 41].map((h, idx) => (
                      <span
                        key={`${h}-${idx}`}
                        className={`w-3 rounded-sm ${idx % 2 === 0 ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200">💬 롱 근거 버블</span>
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-200">💬 숏 근거 버블</span>
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-200">↑↓ 실거래 오버레이</span>
                  </div>
                </div>
              )}

              {tab !== 'chart' && (
                <div className="mt-4 space-y-2 text-xs text-zinc-300">
                  {tabMeta[tab].bullets.map((item) => (
                    <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">체험 시나리오</p>
              <p className="mt-2 text-sm text-amber-200">{scenario}</p>
              <div className="mt-4 flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setScenarioIndex(idx)}
                    className={`rounded-md border px-2 py-1 text-xs ${scenarioIndex === idx
                      ? 'border-amber-300 bg-amber-300/15 text-amber-200'
                      : 'border-zinc-700 text-zinc-300'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                게스트 체험은 저장되지 않지만, 실제 사용자 흐름과 같은 화면 구조를 사용합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold">다음 단계</h2>
          <p className="mt-2 text-sm text-zinc-400">
            실제 사용을 시작하려면 회원가입 후 거래내역 불러오기 또는 초기 성향 테스트를 진행하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGuestStart}
              disabled={starting}
              className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              {starting ? '게스트 세션 시작 중...' : '게스트 세션 시작'}
            </button>
            <Link href="/onboarding/start" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950">
              처음부터 시작
            </Link>
          </div>
          {startError && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {startError}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            게스트 세션에서는 API/CSV/AI 설정 기능이 비활성화됩니다.
          </p>
        </section>
      </div>
    </div>
  )
}
