'use client'

import { useMemo } from 'react'
import type { CalendarResponse } from '../../types/review'

type Props = {
  calendar: CalendarResponse | null
  isLoading: boolean
}

export function CalendarView({ calendar, isLoading }: Props) {
  const { weeks, month, year } = useMemo(() => {
    if (!calendar) {
      const now = new Date()
      return { weeks: [], month: now.getMonth(), year: now.getFullYear() }
    }

    const from = new Date(calendar.from)
    const to = new Date(calendar.to)

    // Get the first day of the month containing 'from'
    const firstDay = new Date(from.getFullYear(), from.getMonth(), 1)
    const lastDay = new Date(to.getFullYear(), to.getMonth() + 1, 0)

    // Pad to start on Monday
    const startPadding = (firstDay.getDay() + 6) % 7
    const start = new Date(firstDay)
    start.setDate(start.getDate() - startPadding)

    // Generate weeks
    const weeks: Date[][] = []
    let current = new Date(start)

    while (current <= lastDay || weeks[weeks.length - 1]?.length < 7) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
      if (weeks.length > 6) break
    }

    return { weeks, month: from.getMonth(), year: from.getFullYear() }
  }, [calendar])

  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="h-5 bg-zinc-700 rounded w-32 mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const dayNames = ['월', '화', '수', '목', '금', '토', '일']
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  const getDayData = (date: Date) => {
    if (!calendar) return null
    const key = date.toISOString().split('T')[0]
    return calendar.days[key]
  }

  const getDayColor = (data: { win_count: number; loss_count: number; total_pnl: string } | null) => {
    if (!data || data.win_count + data.loss_count === 0) return 'bg-zinc-700/30'
    const pnl = parseFloat(data.total_pnl)
    if (pnl > 0) return 'bg-green-500/40 hover:bg-green-500/60'
    if (pnl < 0) return 'bg-red-500/40 hover:bg-red-500/60'
    return 'bg-zinc-600/50 hover:bg-zinc-600/70'
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">
        {year}년 {monthNames[month]}
      </h3>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs text-zinc-500 py-1">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, i) => {
          const isCurrentMonth = date.getMonth() === month
          const data = getDayData(date)

          return (
            <div
              key={i}
              className={`
                relative h-8 rounded text-center text-xs flex items-center justify-center
                transition-colors cursor-pointer
                ${isCurrentMonth ? getDayColor(data) : 'bg-zinc-800/50 text-zinc-600'}
              `}
              title={
                data
                  ? `${date.getDate()}일: ${data.bubble_count}개 버블, ${data.win_count}승 ${data.loss_count}패, PnL: ${parseFloat(data.total_pnl).toFixed(2)}%`
                  : `${date.getDate()}일`
              }
            >
              <span className={isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600'}>
                {date.getDate()}
              </span>
              {data && data.bubble_count > 0 && isCurrentMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/40" />
          <span>수익</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/40" />
          <span>손실</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-zinc-700/30" />
          <span>거래 없음</span>
        </div>
      </div>
    </div>
  )
}
