'use client'

import { useCallback, useEffect, useRef } from 'react'

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
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
        <span>{formatTime(startTime)}</span>
        <span className="text-zinc-300 font-medium">{formatTime(currentTime)}</span>
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
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:hover:bg-blue-400
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-blue-500
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #3f3f46 ${progress}%, #3f3f46 100%)`,
          }}
        />
      </div>
    </div>
  )
}
