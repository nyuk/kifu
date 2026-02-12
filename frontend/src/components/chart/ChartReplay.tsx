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
      <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-3 backdrop-blur-md">
        <button
          onClick={() => {
            if (klines.length > 0) {
              const initialTime = startTime + (endTime - startTime) * 0.7
              startReplay(startTime, endTime)
              setReplayTime(initialTime)
            }
          }}
          className="flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          리플레이 시작
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-neutral-900/50 p-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">리플레이 모드</span>
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            {replay.isPlaying ? '재생 중' : '일시정지'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          <span>표시 {visibleCandles}개</span>
          <span>숨김 {hiddenCandles}개</span>
        </div>
      </div>

      <TimeSlider
        startTime={startTime}
        endTime={endTime}
        currentTime={replay.currentTime}
        onTimeChange={setReplayTime}
        disabled={replay.isPlaying}
      />

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
