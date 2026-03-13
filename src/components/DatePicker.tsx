'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// Russian day names
const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

interface DatePickerProps {
  className?: string
  showTodayButton?: boolean
  variant?: 'default' | 'compact'
}

export function DatePicker({ 
  className, 
  showTodayButton = true,
  variant = 'default' 
}: DatePickerProps) {
  const { 
    selectedDate, 
    selectedDateObj, 
    goToPrevDay, 
    goToNextDay, 
    goToToday, 
    isToday 
  } = useAppStore()

  // Format date for display: "Пт, 7 марта"
  const formatDate = (date: Date) => {
    const dayOfWeek = DAY_NAMES[date.getDay()]
    const day = date.getDate()
    const month = MONTH_NAMES[date.getMonth()]
    return `${dayOfWeek}, ${day} ${month}`
  }

  const todayCheck = isToday()

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={goToPrevDay}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <span className="text-sm font-medium min-w-[100px] text-center">
          {formatDate(selectedDateObj)}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={goToNextDay}
          disabled={todayCheck}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        {!todayCheck && showTodayButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={goToToday}
          >
            <Home className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl bg-card/50 backdrop-blur border',
      className
    )}>
      {/* Previous day button */}
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0 rounded-full"
        onClick={goToPrevDay}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      {/* Date display */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {formatDate(selectedDateObj)}
          </span>
        </div>
        {!todayCheck && (
          <span className="text-xs text-muted-foreground mt-1">
            Не сегодня
          </span>
        )}
      </div>

      {/* Next day and today buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 rounded-full"
          onClick={goToNextDay}
          disabled={todayCheck}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        {!todayCheck && showTodayButton && (
          <Button
            variant="default"
            size="sm"
            className="h-10 px-3 rounded-full"
            onClick={goToToday}
          >
            <Home className="w-4 h-4 mr-1" />
            Сегодня
          </Button>
        )}
      </div>
    </div>
  )
}

// Mini date badge for compact spaces
export function DateBadge() {
  const { selectedDateObj, isToday, goToToday } = useAppStore()
  const todayCheck = isToday()

  if (todayCheck) return null

  return (
    <button
      onClick={goToToday}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors"
    >
      <Calendar className="w-3 h-3" />
      <span>
        {DAY_NAMES[selectedDateObj.getDay()]}, {selectedDateObj.getDate()}
      </span>
      <Home className="w-3 h-3" />
    </button>
  )
}
