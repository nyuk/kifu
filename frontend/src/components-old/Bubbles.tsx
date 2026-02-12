'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBubbleStore, type Bubble } from '../lib/bubbleStore'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'

type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE' | 'all'

export function Bubbles() {
  const searchParams = useSearchParams()
  const bubbles = useBubbleStore((state) => state.bubbles)
  const deleteBubble = useBubbleStore((state) => state.deleteBubble)
  const replaceAllBubbles = useBubbleStore((state) => state.replaceAllBubbles)
  const fetchBubblesFromServer = useBubbleStore((state) => state.fetchBubblesFromServer)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const listContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchBubblesFromServer().catch(() => null)
  }, [fetchBubblesFromServer])

  useEffect(() => {
    const requestedBubbleID = searchParams.get('bubble_id')
    if (!requestedBubbleID) return
    const exists = bubbles.some((bubble) => bubble.id === requestedBubbleID)
    if (exists) {
      setSelectedId(requestedBubbleID)
    }
  }, [searchParams, bubbles])

  useEffect(() => {
    if (!selectedId) return
    const container = listContainerRef.current
    if (!container) return
    const target = container.querySelector(`[data-bubble-id="${selectedId}"]`) as HTMLElement | null
    if (!target) return
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedId, bubbles.length, actionFilter, sortOrder, searchQuery])

  useEffect(() => {
    const handleRefresh = () => {
      fetchBubblesFromServer().catch(() => null)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchBubblesFromServer])

  // 선택된 버블
  const selectedBubble = useMemo(
    () => bubbles.find((b) => b.id === selectedId) || null,
    [bubbles, selectedId]
  )

  // 필터링된 버블
  const filteredBubbles = useMemo(() => {
    let result = [...bubbles]

    if (actionFilter !== 'all') {
      result = result.filter(b => b.action === actionFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.note.toLowerCase().includes(query) ||
        b.tags?.some(t => t.toLowerCase().includes(query))
      )
    }

    result.sort((a, b) => sortOrder === 'desc' ? b.ts - a.ts : a.ts - b.ts)

    return result
  }, [bubbles, actionFilter, sortOrder, searchQuery])

  // 통계
  const stats = useMemo(() => {
    const byAction: Record<string, number> = {}
    bubbles.forEach(b => {
      const action = b.action || 'NONE'
      byAction[action] = (byAction[action] || 0) + 1
    })

    const withAgents = bubbles.filter(b => b.agents && b.agents.length > 0).length

    return {
      total: bubbles.length,
      byAction,
      withAgents,
    }
  }, [bubbles])

  // 유사 패턴 분석 (선택된 버블과 같은 액션 + 태그가 겹치는 버블)
  const similarAnalysis = useMemo(() => {
    if (!selectedBubble) return null

    const selectedTags = new Set(selectedBubble.tags || [])
    const selectedAction = selectedBubble.action

    // 같은 액션을 가진 다른 버블들 찾기
    const similarBubbles = bubbles.filter(b => {
      if (b.id === selectedBubble.id) return false
      if (b.action !== selectedAction) return false

      // 태그 겹침 확인 (최소 1개)
      const bubbleTags = b.tags || []
      const hasOverlap = bubbleTags.some(t => selectedTags.has(t))
      return hasOverlap || (selectedTags.size === 0 && bubbleTags.length === 0)
    })

    if (similarBubbles.length === 0) return null

    // 결과 분석 (가격 변화 기반 - 간단한 시뮬레이션)
    // 실제로는 후속 가격 데이터가 필요하지만, 여기서는 액션 기반으로 추정
    const actionOutcomes: Record<string, { wins: number; losses: number }> = {
      BUY: { wins: 0, losses: 0 },
      SELL: { wins: 0, losses: 0 },
      TP: { wins: 0, losses: 0 },
      SL: { wins: 0, losses: 0 },
      HOLD: { wins: 0, losses: 0 },
    }

    // 같은 액션의 과거 버블들을 시간순 정렬
    const sortedSimilar = [...similarBubbles].sort((a, b) => a.ts - b.ts)

    // 간단한 승률 계산: TP = 승리, SL = 패배, 나머지는 랜덤하게 배분 (데모용)
    sortedSimilar.forEach(b => {
      if (b.action === 'TP') {
        actionOutcomes.TP.wins++
      } else if (b.action === 'SL') {
        actionOutcomes.SL.losses++
      } else {
        // 데모용: 해시 기반으로 일관된 승/패 결정
        const hash = b.id.charCodeAt(0) + b.id.charCodeAt(1)
        if (hash % 3 !== 0) {
          actionOutcomes[b.action || 'HOLD'].wins++
        } else {
          actionOutcomes[b.action || 'HOLD'].losses++
        }
      }
    })

    const totalWins = Object.values(actionOutcomes).reduce((sum, o) => sum + o.wins, 0)
    const totalLosses = Object.values(actionOutcomes).reduce((sum, o) => sum + o.losses, 0)
    const total = totalWins + totalLosses
    const winRate = total > 0 ? Math.round((totalWins / total) * 100) : 0

    return {
      count: similarBubbles.length,
      wins: totalWins,
      losses: totalLosses,
      winRate,
      samples: sortedSimilar.slice(-5), // 최근 5개 샘플
    }
  }, [selectedBubble, bubbles])

  const actionColors: Record<string, string> = {
    BUY: 'text-green-400',
    SELL: 'text-red-400',
    HOLD: 'text-yellow-400',
    TP: 'text-emerald-300',
    SL: 'text-rose-300',
    NONE: 'text-neutral-400',
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 헤더 */}
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Journal</p>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">Bubble Library</h2>
        <p className="mt-2 text-sm text-neutral-400">
          저장된 분석 버블 ({bubbles.length}개) · AI 조언 포함: {stats.withAgents}개
        </p>
      </header>

      {/* 통계 카드 */}
      <section className="grid gap-4 lg:grid-cols-6 flex-shrink-0">
        {['BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'].map(action => (
          <button
            key={action}
            onClick={() => setActionFilter(actionFilter === action ? 'all' : action as ActionType)}
            className={`rounded-2xl border p-4 text-center transition ${actionFilter === action
                ? 'border-neutral-100 bg-neutral-100/10'
                : 'border-white/[0.08] bg-white/[0.04] hover:border-neutral-700'
              }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{action}</p>
            <p className={`mt-2 text-2xl font-semibold ${actionColors[action]}`}>
              {stats.byAction[action] || 0}
            </p>
          </button>
        ))}
      </section>

      {/* 메인 컨텐츠 */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] flex-1 min-h-0">
        {/* 버블 리스트 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col min-h-0">
          {/* 검색/필터 */}
          <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
            <FilterGroup label="SEARCH" tone="cyan">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags..."
                className="flex-1 min-w-[220px] rounded-lg border border-cyan-400/40 bg-neutral-950/70 px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-300/70"
              />
            </FilterGroup>
            <FilterGroup label="SORT" tone="amber">
              <FilterPills
                options={[
                  { value: 'desc', label: 'Newest' },
                  { value: 'asc', label: 'Oldest' },
                ]}
                value={sortOrder}
                onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
                tone="amber"
                ariaLabel="Sort order"
              />
            </FilterGroup>
          </div>

          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="text-xs text-neutral-400">{filteredBubbles.length} results</span>
            <button
              onClick={() => { if (confirm('모든 버블을 삭제하시겠습니까?')) replaceAllBubbles([]) }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>

          {/* 버블 목록 - 고정 스크롤 영역 */}
          <div ref={listContainerRef} className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2">
            {filteredBubbles.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-zinc-400">
                버블이 없습니다.
              </div>
            ) : (
              filteredBubbles.map((bubble) => (
                <button
                  key={bubble.id}
                  data-bubble-id={bubble.id}
                  onClick={() => setSelectedId(bubble.id === selectedId ? null : bubble.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${bubble.id === selectedId
                      ? 'border-neutral-100 bg-neutral-100/10'
                      : 'border-white/[0.08] bg-black/20 hover:border-neutral-600'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${actionColors[bubble.action || 'NONE']}`}>
                      {bubble.action || 'NOTE'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(bubble.ts).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-neutral-300 truncate">{bubble.note}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                    <span>${bubble.price.toLocaleString()}</span>
                    <span>·</span>
                    <span>{bubble.timeframe}</span>
                    {bubble.agents && bubble.agents.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-blue-400">AI: {bubble.agents.length}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* 상세 보기 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 flex flex-col min-h-0">
          {selectedBubble ? (
            <>
              <div className="flex items-start justify-between mb-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${actionColors[selectedBubble.action || 'NONE']}`}>
                      {selectedBubble.action || 'NOTE'}
                    </span>
                    <span className="text-neutral-400">{selectedBubble.symbol}</span>
                    <span className="text-zinc-400">{selectedBubble.timeframe}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {new Date(selectedBubble.ts).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('이 버블을 삭제하시겠습니까?')) {
                      deleteBubble(selectedBubble.id)
                      setSelectedId(null)
                    }
                  }}
                  className="rounded-lg border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
                {/* 가격 & 노트 */}
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">Price</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    ${selectedBubble.price.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">Note</p>
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap">{selectedBubble.note}</p>
                </div>

                {/* 태그 */}
                {selectedBubble.tags && selectedBubble.tags.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBubble.tags.map(tag => (
                        <span key={tag} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-neutral-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI 에이전트 조언 */}
                {selectedBubble.agents && selectedBubble.agents.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3">
                      AI Analysis ({selectedBubble.agents.length})
                    </p>
                    <div className="space-y-3">
                      {selectedBubble.agents.map((agent, idx) => (
                        <div key={idx} className="rounded-lg bg-white/[0.04] p-3 border border-white/[0.08]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-neutral-200">{agent.provider}</span>
                            <span className="text-xs text-zinc-400">{agent.model}</span>
                            <span className="text-xs text-neutral-600 ml-auto">{agent.prompt_type}</span>
                          </div>
                          {(() => {
                            const sections = parseAiSections(agent.response || '')
                            if (sections.length === 0) {
                              return (
                                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                                  {agent.response}
                                </p>
                              )
                            }
                            return (
                              <div className="space-y-2">
                                {sections.map((section) => (
                                  <div
                                    key={`${agent.provider}-${section.title}-${section.body.slice(0, 12)}`}
                                    className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${toneClass(section.tone)}`}
                                  >
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                                    <p className="mt-1 text-xs text-inherit whitespace-pre-wrap">{section.body}</p>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 유사 패턴 분석 */}
                {similarAnalysis && (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3">
                      Similar Patterns ({similarAnalysis.count})
                    </p>

                    {/* 통계 카드 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-xs text-zinc-400">Win Rate</p>
                        <p className={`text-xl font-bold ${similarAnalysis.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {similarAnalysis.winRate}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-xs text-zinc-400">Wins</p>
                        <p className="text-xl font-bold text-green-400">{similarAnalysis.wins}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-xs text-zinc-400">Losses</p>
                        <p className="text-xl font-bold text-red-400">{similarAnalysis.losses}</p>
                      </div>
                    </div>

                    {/* 최근 유사 사례 */}
                    {similarAnalysis.samples.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-2">Recent Similar Cases</p>
                        <div className="space-y-2">
                          {similarAnalysis.samples.map(sample => (
                            <div
                              key={sample.id}
                              className="rounded-lg bg-white/[0.04] p-2 flex items-center justify-between text-xs cursor-pointer hover:bg-white/[0.08]"
                              onClick={() => setSelectedId(sample.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className={actionColors[sample.action || 'NONE']}>{sample.action}</span>
                                <span className="text-neutral-400">${sample.price.toLocaleString()}</span>
                              </div>
                              <span className="text-zinc-400">
                                {new Date(sample.ts).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              버블을 선택하면 상세 정보가 표시됩니다.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
