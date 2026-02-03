'use client'

type SpeedOption = 1 | 2 | 4 | 8

type Props = {
  isPlaying: boolean
  speed: SpeedOption
  onTogglePlay: () => void
  onSpeedChange: (speed: SpeedOption) => void
  onStepBack: () => void
  onStepForward: () => void
  onStop: () => void
  disabled?: boolean
}

export function ReplayControls({
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onStepBack,
  onStepForward,
  onStop,
  disabled = false,
}: Props) {
  const speeds: SpeedOption[] = [1, 2, 4, 8]

  return (
    <div className="flex items-center gap-3">
      {/* Step Back */}
      <button
        onClick={onStepBack}
        disabled={disabled || isPlaying}
        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="이전 캔들"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        disabled={disabled}
        className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        disabled={disabled || isPlaying}
        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="다음 캔들"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={disabled}
        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="리플레이 종료"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      </button>

      {/* Speed Selector */}
      <div className="flex rounded-lg bg-zinc-800 p-1 ml-2">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            disabled={disabled}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              speed === s
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
