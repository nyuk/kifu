'use client'

import { useCallback, useRef } from 'react'

type Props = {
  startTime: number  // epoch ms
  endTime: number    // epoch ms
  currentTime: number
  onTimeChange: (time: number) => void
  disabled?: boolean
}

export function TimeSlider({
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  disabled = false,
}: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    onTimeChange(value)
  }

  // Calculate progress percentage
  const progress = endTime > startTime
    ? ((currentTime - startTime) / (endTime - startTime)) * 100
    : 0

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
        <span>{formatTime(startTime)}</span>
        <span className="font-medium text-neutral-300">{formatTime(currentTime)}</span>
        <span>{formatTime(endTime)}</span>
      </div>
      <div className="relative">
        <input
          ref={sliderRef}
          type="range"
          min={startTime}
          max={endTime}
          value={currentTime}
          onChange={handleChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) ${progress}%, rgba(255,255,255,0.05) ${progress}%, rgba(255,255,255,0.05) 100%)`,
          }}
        />
      </div>
    </div>
  )
}
