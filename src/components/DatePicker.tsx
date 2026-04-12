"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Russian day names
const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

interface DatePickerProps {
  className?: string;
  showTodayButton?: boolean;
  variant?: "default" | "compact";
}

export function DatePicker({
  className,
  showTodayButton = true,
  variant = "default",
}: DatePickerProps) {
  const { selectedDate, selectedDateObj, goToPrevDay, goToNextDay, goToToday, isToday } =
    useAppStore();

  // Format date for display: "Пт, 7 марта"
  const formatDate = (date: Date) => {
    const dayOfWeek = DAY_NAMES[date.getDay()];
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    return `${dayOfWeek}, ${day} ${month}`;
  };

  const todayCheck = isToday();

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goToPrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-[100px] text-center text-sm font-medium">
          {formatDate(selectedDateObj)}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={goToNextDay}
          disabled={todayCheck}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!todayCheck && showTodayButton && (
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={goToToday}>
            <Home className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card/50 flex items-center justify-between rounded-xl border p-3 backdrop-blur",
        className
      )}
    >
      {/* Previous day button */}
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 rounded-full p-0"
        onClick={goToPrevDay}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Date display */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span className="text-lg font-semibold">{formatDate(selectedDateObj)}</span>
        </div>
        {!todayCheck && <span className="text-muted-foreground mt-1 text-xs">Не сегодня</span>}
      </div>

      {/* Next day and today buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 rounded-full p-0"
          onClick={goToNextDay}
          disabled={todayCheck}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {!todayCheck && showTodayButton && (
          <Button
            variant="default"
            size="sm"
            className="h-10 rounded-full px-3"
            onClick={goToToday}
          >
            <Home className="mr-1 h-4 w-4" />
            Сегодня
          </Button>
        )}
      </div>
    </div>
  );
}

// Mini date badge for compact spaces
export function DateBadge() {
  const { selectedDateObj, isToday, goToToday } = useAppStore();
  const todayCheck = isToday();

  if (todayCheck) return null;

  return (
    <button
      onClick={goToToday}
      className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-400 transition-colors hover:bg-amber-500/30"
    >
      <Calendar className="h-3 w-3" />
      <span>
        {DAY_NAMES[selectedDateObj.getDay()]}, {selectedDateObj.getDate()}
      </span>
      <Home className="h-3 w-3" />
    </button>
  );
}
