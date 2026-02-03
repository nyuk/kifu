'use client'

import { useState } from 'react'
import { api } from '../../lib/api'

type ExportType = 'stats' | 'accuracy' | 'bubbles'

type ExportButtonsProps = {
  period?: string
  outcomePeriod?: string
}

export function ExportButtons({ period = '30d', outcomePeriod = '1h' }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<ExportType | null>(null)

  const handleExport = async (type: ExportType) => {
    setIsExporting(type)
    try {
      const params = new URLSearchParams({ period })
      if (type === 'accuracy') {
        params.set('outcome_period', outcomePeriod)
      }

      const response = await api.get(`/v1/export/${type}?${params}`, {
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Get filename from response header or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `kifu_${type}_${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/)
        if (match) {
          filename = match[1]
        }
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('내보내기에 실패했습니다')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">데이터 내보내기</h3>
      <p className="text-gray-400 text-sm mb-4">
        복기 데이터를 CSV 파일로 내보내 외부에서 분석할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleExport('stats')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'stats' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-white font-medium">통계 내보내기</div>
            <div className="text-gray-400 text-xs">승률, PnL 통계</div>
          </div>
        </button>

        <button
          onClick={() => handleExport('accuracy')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'accuracy' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-white font-medium">AI 정확도</div>
            <div className="text-gray-400 text-xs">AI 예측 성과</div>
          </div>
        </button>

        <button
          onClick={() => handleExport('bubbles')}
          disabled={isExporting !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting === 'bubbles' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          )}
          <div className="text-left">
            <div className="text-white font-medium">버블 데이터</div>
            <div className="text-gray-400 text-xs">전체 버블 목록</div>
          </div>
        </button>
      </div>
    </div>
  )
}
