'use client'

import { useEffect, useRef, useCallback } from 'react'
import { TimeSlider } from './TimeSlider'
import { ReplayControls } from './ReplayControls'
import { useReviewStore } from '../../stores/reviewStore'

type KlineItem = {
  time: number  // Unix seconds
  open: string
  high: string
  low: string
  close: string
  volume: string
}

type Props = {
  klines: KlineItem[]
  onFilteredKlines: (klines: KlineItem[]) => void
  timeframeSeconds: number
}

export function ChartReplay({ klines, onFilteredKlines, timeframeSeconds }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    replay,
    setReplayTime,
    togglePlay,
    setSpeed,
    startReplay,
    stopReplay,
  } = useReviewStore()

  // Get time range from klines
  const startTime = klines.length > 0 ? klines[0].time * 1000 : 0
  const endTime = klines.length > 0 ? klines[klines.length - 1].time * 1000 : 0

  // Initialize replay when component mounts with klines
  useEffect(() => {
    if (klines.length > 0 && !replay.isActive) {
      // Start at 70% of the timeline by default
      const initialTime = startTime + (endTime - startTime) * 0.7
      startReplay(startTime, endTime)
      setReplayTime(initialTime)
    }
  }, [klines.length, startTime, endTime, replay.isActive, startReplay, setReplayTime])

  // Filter klines based on current replay time
  useEffect(() => {
    if (!replay.isActive || klines.length === 0) {
      onFilteredKlines(klines)
      return
    }

    const currentTimeSeconds = replay.currentTime / 1000
    const filtered = klines.filter((k) => k.time <= currentTimeSeconds)
    onFilteredKlines(filtered)
  }, [replay.isActive, replay.currentTime, klines, onFilteredKlines])

  // Auto-play interval
  useEffect(() => {
    if (replay.isPlaying && replay.isActive) {
      const stepMs = timeframeSeconds * 1000 // One candle worth of time
      const intervalMs = 1000 / replay.speed // Interval based on speed

      intervalRef.current = setInterval(() => {
        const newTime = replay.currentTime + stepMs
        if (newTime >= replay.endTime) {
          // Stop at the end
          setReplayTime(replay.endTime)
          togglePlay()
        } else {
          setReplayTime(newTime)
        }
      }, intervalMs)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [replay.isPlaying, replay.isActive, replay.speed, replay.currentTime, replay.endTime, timeframeSeconds, setReplayTime, togglePlay])

  const handleStepBack = useCallback(() => {
    const stepMs = timeframeSeconds * 1000
    const newTime = Math.max(replay.currentTime - stepMs, startTime)
    setReplayTime(newTime)
  }, [timeframeSeconds, replay.currentTime, startTime, setReplayTime])

  const handleStepForward = useCallback(() => {
    const stepMs = timeframeSeconds * 1000
    const newTime = Math.min(replay.currentTime + stepMs, endTime)
    setReplayTime(newTime)
  }, [timeframeSeconds, replay.currentTime, endTime, setReplayTime])

  const handleStop = useCallback(() => {
    stopReplay()
    onFilteredKlines(klines) // Reset to full klines
  }, [stopReplay, onFilteredKlines, klines])

  // Calculate visible candles info
  const currentTimeSeconds = replay.currentTime / 1000
  const visibleCandles = klines.filter((k) => k.time <= currentTimeSeconds).length
  const hiddenCandles = klines.length - visibleCandles

  if (!replay.isActive || klines.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <button
          onClick={() => {
            if (klines.length > 0) {
              const initialTime = startTime + (endTime - startTime) * 0.7
              startReplay(startTime, endTime)
              setReplayTime(initialTime)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          리플레이 시작
        </button>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">리플레이 모드</span>
          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
            {replay.isPlaying ? '재생 중' : '일시정지'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>표시: {visibleCandles}개</span>
          <span>숨김: {hiddenCandles}개</span>
        </div>
      </div>

      {/* Time Slider */}
      <TimeSlider
        startTime={startTime}
        endTime={endTime}
        currentTime={replay.currentTime}
        onTimeChange={setReplayTime}
        disabled={replay.isPlaying}
      />

      {/* Controls */}
      <div className="flex items-center justify-center">
        <ReplayControls
          isPlaying={replay.isPlaying}
          speed={replay.speed}
          onTogglePlay={togglePlay}
          onSpeedChange={setSpeed}
          onStepBack={handleStepBack}
          onStepForward={handleStepForward}
          onStop={handleStop}
        />
      </div>
    </div>
  )
}
