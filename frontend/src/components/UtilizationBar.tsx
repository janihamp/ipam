interface UtilizationBarProps {
  percent: number
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
  showInlinePercent?: boolean
}

export default function UtilizationBar({ percent, showLabel = false, height = 'md', showInlinePercent = true }: UtilizationBarProps) {
  const getColor = (p: number) => {
    if (p >= 80) return 'bg-red-500'
    if (p >= 50) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const heightClass = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-7',
  }[height]

  const textSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[height]

  // Determine if we have enough width to show the percentage inside
  const showInsideLabel = showInlinePercent && percent >= 15
  const showOutsideLabel = showInlinePercent && percent < 15 && percent > 0

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${heightClass} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative`}>
        <div
          className={`h-full ${getColor(percent)} rounded-full transition-all duration-500 flex items-center justify-center relative`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        >
          {showInsideLabel && (
            <span className={`${textSize} font-bold text-white drop-shadow-sm absolute inset-0 flex items-center justify-center`}>
              {percent.toFixed(0)}%
            </span>
          )}
        </div>
        {showOutsideLabel && (
          <span className={`${textSize} font-semibold text-gray-600 dark:text-gray-400 absolute inset-0 flex items-center justify-center`}>
            {percent.toFixed(0)}%
          </span>
        )}
        {showInlinePercent && percent === 0 && (
          <span className={`${textSize} font-semibold text-gray-400 dark:text-gray-500 absolute inset-0 flex items-center justify-center`}>
            0%
          </span>
        )}
      </div>
      {showLabel && (
        <div className="flex items-center gap-1 min-w-[50px] justify-end">
          <span className={`text-sm font-semibold ${
            percent >= 80 ? 'text-red-600 dark:text-red-400' : 
            percent >= 50 ? 'text-amber-600 dark:text-amber-400' : 
            'text-green-600 dark:text-green-400'
          }`}>
            {percent.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}
