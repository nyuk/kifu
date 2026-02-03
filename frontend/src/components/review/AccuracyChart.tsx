'use client'

import type { AccuracyResponse } from '../../types/review'

type Props = {
  accuracy: AccuracyResponse | null
  isLoading: boolean
}

const providerIcons: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
}

const rankMedals = ['', '', '']

export function AccuracyChart({ accuracy, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="h-5 bg-zinc-700 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-zinc-700 rounded w-20" />
                <div className="h-4 bg-zinc-700 rounded w-12" />
              </div>
              <div className="h-2 bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!accuracy || !accuracy.ranking || accuracy.ranking.length === 0) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">AI Provider 정확도</h3>
        <div className="text-center py-4 text-zinc-500">
          데이터가 없습니다
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-400">AI Provider 정확도</h3>
        <span className="text-xs text-zinc-500">
          {accuracy.evaluated_opinions}/{accuracy.total_opinions} 평가됨
        </span>
      </div>

      <div className="space-y-4">
        {accuracy.ranking.map((item) => {
          const stats = accuracy.by_provider[item.provider]
          const barWidth = Math.max(item.accuracy, 0)

          return (
            <div key={item.provider}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{rankMedals[item.rank - 1] || `${item.rank}.`}</span>
                  <span className="text-sm font-medium">
                    {providerIcons[item.provider] || item.provider}
                  </span>
                </div>
                <span className={`text-sm font-bold ${item.accuracy >= 55 ? 'text-green-400' : item.accuracy >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {item.accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    item.accuracy >= 55
                      ? 'bg-green-500'
                      : item.accuracy >= 45
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {stats && (
                <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                  <span>평가: {stats.evaluated}</span>
                  <span>적중: {stats.correct}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
