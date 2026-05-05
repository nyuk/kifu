'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBubbleStore } from '../lib/bubbleStore'
import { parseAiSections, toneClass } from '../lib/aiResponseFormat'
import { FilterGroup, FilterPills } from '../components/ui/FilterPills'
import { PageJumpPager } from '../components/ui/PageJumpPager'

type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE' | 'all'

const PAGE_SIZE = 12
const SEOUL_TIME_ZONE = 'Asia/Seoul'

function usesSeoulTime(symbol: string) {
  return symbol.toUpperCase().includes('KRW')
}

function getDateParts(date: Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value || '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value || '0')
  const day = Number(parts.find((part) => part.type === 'day')?.value || '0')
  return { year, month, day }
}

function getRelativeDateLabel(timestamp: number, symbol: string) {
  const timeZone = usesSeoulTime(symbol) ? SEOUL_TIME_ZONE : undefined
  const target = new Date(timestamp)
  const now = new Date()
  const targetParts = getDateParts(target, timeZone)
  const todayParts = getDateParts(now, timeZone)
  const yesterday = new Date(now.getTime() - 86400000)
  const yesterdayParts = getDateParts(yesterday, timeZone)

  if (
    targetParts.year === todayParts.year &&
    targetParts.month === todayParts.month &&
    targetParts.day === todayParts.day
  ) {
    return '오늘'
  }

  if (
    targetParts.year === yesterdayParts.year &&
    targetParts.month === yesterdayParts.month &&
    targetParts.day === yesterdayParts.day
  ) {
    return '어제'
  }

  return `${targetParts.year}. ${targetParts.month}. ${targetParts.day}.`
}

function formatBubbleDateTime(timestamp: number, symbol: string) {
  const timeZone = usesSeoulTime(symbol) ? SEOUL_TIME_ZONE : undefined
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatBubbleDeleteError(err: any) {
  const detail = err?.response?.data?.message || err?.message
  if (detail) return `말풍선 삭제에 실패했습니다. (${detail})`
  return '말풍선 삭제에 실패했습니다.'
}

export function Bubbles() {
  const searchParams = useSearchParams()
  const bubbles = useBubbleStore((state) => state.bubbles)
  const totalBubbles = useBubbleStore((state) => state.totalBubbles)
  const deleteBubbleRemote = useBubbleStore((state) => state.deleteBubbleRemote)
  const replaceAllBubbles = useBubbleStore((state) => state.replaceAllBubbles)
  const fetchBubblesFromServer = useBubbleStore((state) => state.fetchBubblesFromServer)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [pageInput, setPageInput] = useState('1')
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [deletingBubbleId, setDeletingBubbleId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const listContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth < 1024)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    fetchBubblesFromServer(200, true).catch(() => null)
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
    const handleRefresh = () => {
      fetchBubblesFromServer(200, true).catch(() => null)
    }
    window.addEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('kifu-portfolio-refresh', handleRefresh as EventListener)
    }
  }, [fetchBubblesFromServer])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedId(null)
    setPageInput('1')
  }, [actionFilter, sortOrder, searchQuery])

  useEffect(() => {
    if (!selectedId) return
    const container = listContainerRef.current
    if (!container) return
    const target = container.querySelector(`[data-bubble-id="${selectedId}"]`) as HTMLElement | null
    if (!target) return
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, currentPage])

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const selectedBubble = useMemo(
    () => bubbles.find((b) => b.id === selectedId) || null,
    [bubbles, selectedId]
  )

  const filteredBubbles = useMemo(() => {
    let result = [...bubbles]

    if (actionFilter !== 'all') {
      result = result.filter((b) => b.action === actionFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((b) =>
        b.note.toLowerCase().includes(query) || b.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }

    result.sort((a, b) => (sortOrder === 'desc' ? b.ts - a.ts : a.ts - b.ts))
    return result
  }, [bubbles, actionFilter, sortOrder, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredBubbles.length / PAGE_SIZE))
  const pagedBubbles = filteredBubbles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const jumpToPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (Number.isNaN(parsedPage)) {
      setPageInput(String(currentPage))
      return
    }
    setCurrentPage(Math.min(totalPages, Math.max(1, parsedPage)))
  }

  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      jumpToPage()
    }
  }

  const handleDeleteBubble = async (id: string) => {
    if (!confirm('이 말풍선을 삭제하시겠습니까?')) return

    setDeletingBubbleId(id)
    setDeleteError('')
    try {
      await deleteBubbleRemote(id)
      setSelectedId((current) => (current === id ? null : current))
    } catch (err) {
      setDeleteError(formatBubbleDeleteError(err))
    } finally {
      setDeletingBubbleId(null)
    }
  }

  const stats = useMemo(() => {
    const byAction: Record<string, number> = {}
    bubbles.forEach((b) => {
      const action = b.action || 'NONE'
      byAction[action] = (byAction[action] || 0) + 1
    })

    const withAgents = bubbles.filter((b) => b.agents && b.agents.length > 0).length

    return {
      total: bubbles.length,
      byAction,
      withAgents,
    }
  }, [bubbles])

  const similarAnalysis = useMemo(() => {
    if (!selectedBubble) return null

    const selectedTags = new Set(selectedBubble.tags || [])
    const selectedAction = selectedBubble.action

    const similarBubbles = bubbles.filter((b) => {
      if (b.id === selectedBubble.id) return false
      if (b.action !== selectedAction) return false
      const bubbleTags = b.tags || []
      const hasOverlap = bubbleTags.some((t) => selectedTags.has(t))
      return hasOverlap || (selectedTags.size === 0 && bubbleTags.length === 0)
    })

    if (similarBubbles.length === 0) return null

    const actionOutcomes: Record<string, { wins: number; losses: number }> = {
      BUY: { wins: 0, losses: 0 },
      SELL: { wins: 0, losses: 0 },
      TP: { wins: 0, losses: 0 },
      SL: { wins: 0, losses: 0 },
      HOLD: { wins: 0, losses: 0 },
    }

    similarBubbles
      .sort((a, b) => a.ts - b.ts)
      .forEach((b) => {
        if (b.action === 'TP') actionOutcomes.TP.wins += 1
        else if (b.action === 'SL') actionOutcomes.SL.losses += 1
        else {
          const hash = b.id.charCodeAt(0) + b.id.charCodeAt(1)
          if (hash % 3 !== 0) actionOutcomes[b.action || 'HOLD'].wins += 1
          else actionOutcomes[b.action || 'HOLD'].losses += 1
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
      samples: similarBubbles.slice(-5),
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
    <div className="flex h-full flex-col gap-4 pb-20 md:gap-5 md:pb-0">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 md:p-6 flex-shrink-0">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Journal</p>
        <h2 className="mt-1 text-xl font-semibold text-neutral-100 md:mt-3 md:text-2xl">Bubble Library</h2>
        <p className="mt-1 text-xs text-neutral-400 md:mt-2 md:text-sm">
            저장된 분석 버블 ({totalBubbles.toLocaleString()}개) · AI 조언 포함: {stats.withAgents}개
        </p>
      </header>

      <section className="scrollbar-none flex flex-nowrap gap-2 overflow-x-auto md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-6 flex-shrink-0">
        {['BUY', 'SELL', 'HOLD', 'TP', 'SL', 'NONE'].map((action) => (
          <button
            key={action}
            onClick={() => setActionFilter(actionFilter === action ? 'all' : action as ActionType)}
            className={`min-w-[84px] rounded-2xl border p-2 text-center transition md:min-w-0 md:p-4 ${actionFilter === action
              ? 'border-neutral-100 bg-neutral-100/10'
              : 'border-white/[0.08] bg-white/[0.04] hover:border-neutral-700'}
            `}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{action}</p>
            <p className={`mt-0.5 text-lg font-semibold md:mt-2 md:text-2xl ${actionColors[action]}`}>
              {stats.byAction[action] || 0}
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 pb-6 md:p-5 flex flex-col min-h-0">
        <div className="scrollbar-none mb-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 md:mb-4 md:flex-wrap md:gap-3 flex-shrink-0">
          <FilterGroup label="SEARCH" tone="cyan">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags..."
              className="min-w-[220px] rounded-lg border border-cyan-400/40 bg-neutral-950/70 px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-300/70 md:flex-1"
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

        <div className="mb-3 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs text-neutral-400">{filteredBubbles.length} results</span>
          <button
            onClick={() => {
              if (confirm('모든 버블을 삭제하시겠습니까?')) replaceAllBubbles([])
              setSelectedId(null)
            }}
            className={`text-xs text-red-400 hover:text-red-300 ${isMobileViewport ? 'hidden' : ''}`}
          >
            Clear All
          </button>
        </div>
        {deleteError && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {deleteError}
          </div>
        )}

        <div ref={listContainerRef} className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2 overflow-x-hidden">
          {filteredBubbles.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-400">버블이 없습니다.</div>
          ) : (
            pagedBubbles.map((bubble) => {
              const isSelected = bubble.id === selectedId
              return (
                <div
                  key={bubble.id}
                  data-bubble-id={bubble.id}
                  onClick={() => setSelectedId(isSelected ? null : bubble.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition md:p-4 ${isSelected
                    ? 'border-neutral-100 bg-neutral-100/10'
                    : 'border-white/[0.08] bg-black/20 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${actionColors[bubble.action || 'NONE']}`}>
                          {bubble.action || 'NOTE'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300">{bubble.symbol}</span>
                        <span className="text-xs text-zinc-400">{bubble.timeframe}</span>
                      </div>
                      <p className="mt-1 break-words pr-2 text-neutral-300">{bubble.note}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 whitespace-nowrap">
                      {getRelativeDateLabel(bubble.ts, bubble.symbol)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>${bubble.price.toLocaleString()}</span>
                    <span>·</span>
                    <span>{formatBubbleDateTime(bubble.ts, bubble.symbol)}</span>
                    {bubble.agents && bubble.agents.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-blue-400">AI: {bubble.agents.length}</span>
                      </>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-4 space-y-3 border-t border-white/[0.12] pt-4">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">note</p>
                        <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">{bubble.note}</p>
                      </div>

                      {bubble.tags && bubble.tags.length > 0 && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">tags</p>
                          <div className="flex flex-wrap gap-2">
                            {bubble.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-neutral-300">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {bubble.agents && bubble.agents.length > 0 && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">AI 분석</p>
                          <div className="space-y-2">
                            {bubble.agents.map((agent, index) => {
                              const sections = parseAiSections(agent.response || '')
                          return (
                                <div key={`${bubble.id}-${index}`} className="rounded-md border border-white/10 p-3 break-words">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-neutral-200">{agent.provider}</span>
                                    <span className="text-xs text-zinc-400">{agent.model}</span>
                                    <span className="ml-auto text-xs text-neutral-500">{agent.prompt_type}</span>
                                  </div>
                                  {(sections.length > 0 ? sections : [{ title: '요약', body: agent.response, tone: 'summary' as const }]).map((section) => (
                                    <div key={`${bubble.id}-${index}-${section.title}`} className={`mt-2 rounded-lg border p-3 text-xs ${toneClass(section.tone)} text-current`}>
                                      <p className="font-semibold uppercase tracking-[0.2em] opacity-80">{section.title}</p>
                                      <p className="mt-1 whitespace-pre-wrap leading-relaxed break-words">{section.body}</p>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {selectedBubble?.id === bubble.id && similarAnalysis && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">유사 패턴 분석</p>
                          <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">승률</p>
                              <p className={`text-lg font-bold ${similarAnalysis.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                {similarAnalysis.winRate}%
                              </p>
                            </div>
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">승</p>
                              <p className="text-lg font-bold text-green-400">{similarAnalysis.wins}</p>
                            </div>
                            <div className="rounded-md border border-white/10 p-2">
                              <p className="text-xs text-zinc-400">패</p>
                              <p className="text-lg font-bold text-red-400">{similarAnalysis.losses}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDeleteBubble(bubble.id)
                          }}
                          disabled={deletingBubbleId === bubble.id}
                          className="rounded-lg border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingBubbleId === bubble.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <PageJumpPager
          totalItems={filteredBubbles.length}
          totalPages={totalPages}
          currentPage={currentPage}
          pageInput={pageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={handlePageInputKeyDown}
          onFirst={() => setCurrentPage(1)}
          onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          onLast={() => setCurrentPage(totalPages)}
          onJump={jumpToPage}
          itemLabel="개"
        />
      </section>
    </div>
  )
}
