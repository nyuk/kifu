'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth'

type AccuracyData = {
  provider: string
  period: string
  predictedDirection: string
  actualDirection: string
  isCorrect: boolean
  createdAt: string
}

type Props = {
  bubbleId: string
  compact?: boolean
}

export function BubbleAccuracy({ bubbleId, compact = false }: Props) {
  const [data, setData] = useState<AccuracyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    const fetchAccuracy = async () => {
      if (!bubbleId || !accessToken) return

      try {
        setLoading(true)
        const res = await fetch(`/api/v1/bubbles/${bubbleId}/accuracy`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          throw new Error('Failed to fetch accuracy data')
        }

        const json = await res.json()
        setData(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAccuracy()
  }, [bubbleId, accessToken])

  if (loading) {
    return (
      <div className="animate-pulse bg-zinc-800/50 rounded-lg p-3">
        <div className="h-4 bg-zinc-700 rounded w-24 mb-2" />
        <div className="h-3 bg-zinc-700 rounded w-32" />
      </div>
    )
  }

  if (error || data.length === 0) {
    return null
  }

  const correctCount = data.filter((d) => d.isCorrect).length
  const totalCount = data.length
  const accuracyRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const directionLabel = (dir: string) => {
    const labels: Record<string, string> = {
      BUY: '매수',
      SELL: '매도',
      HOLD: '보류',
      UP: '상승',
      DOWN: '하락',
      NEUTRAL: '중립',
    }
    return labels[dir] || dir
  }

  const directionColor = (dir: string) => {
    if (['BUY', 'UP'].includes(dir)) return 'text-green-400'
    if (['SELL', 'DOWN'].includes(dir)) return 'text-red-400'
    return 'text-zinc-400'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">AI 정확도:</span>
        <span
          className={`font-medium ${
            accuracyRate >= 70
              ? 'text-green-400'
              : accuracyRate >= 50
                ? 'text-yellow-400'
                : 'text-red-400'
          }`}
        >
          {accuracyRate}%
        </span>
        <span className="text-zinc-600">({correctCount}/{totalCount})</span>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300">AI 예측 정확도</h4>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-bold ${
              accuracyRate >= 70
                ? 'text-green-400'
                : accuracyRate >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }`}
          >
            {accuracyRate}%
          </span>
          <span className="text-xs text-zinc-500">({correctCount}/{totalCount})</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-xs bg-white/[0.04] rounded px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">{item.provider}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{item.period}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">예측:</span>
                <span className={directionColor(item.predictedDirection)}>
                  {directionLabel(item.predictedDirection)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">실제:</span>
                <span className={directionColor(item.actualDirection)}>
                  {directionLabel(item.actualDirection)}
                </span>
              </div>
              {item.isCorrect ? (
                <span className="text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              ) : (
                <span className="text-red-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
