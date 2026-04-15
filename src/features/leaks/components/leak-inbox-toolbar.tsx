"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import {
  GROUP_OPTIONS,
  SORT_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/leaks/lib/leak-constants";
import type {
  LeakFocusFilter,
  LeakGroupOption,
  LeakSortOption,
  LeakSourceFilter,
  LeakStatusFilter,
} from "@/features/leaks/types";

interface LeakInboxToolbarProps {
  statusFilter: LeakStatusFilter;
  sourceFilter: LeakSourceFilter;
  focusFilter: LeakFocusFilter;
  sortOption: LeakSortOption;
  groupBy: LeakGroupOption;
  searchQuery: string;
  leakCounts: Record<LeakStatusFilter, number>;
  focusLeakCount: number;
  onStatusFilterChange: (value: LeakStatusFilter) => void;
  onSourceFilterChange: (value: LeakSourceFilter) => void;
  onFocusFilterChange: (value: LeakFocusFilter) => void;
  onSortOptionChange: (value: LeakSortOption) => void;
  onGroupByChange: (value: LeakGroupOption) => void;
  onSearchQueryChange: (value: string) => void;
}

function getPillClassName(isActive: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
  }`;
}

/**
 * Проверяем, отличаются ли расширенные фильтры от значений по умолчанию.
 * Помогает показать индикатор активных фильтров на кнопке.
 */
function hasActiveExtraFilters(
  sourceFilter: LeakSourceFilter,
  focusFilter: LeakFocusFilter,
  sortOption: LeakSortOption,
  groupBy: LeakGroupOption,
): boolean {
  return (
    sourceFilter !== "all" ||
    focusFilter !== "all" ||
    sortOption !== "updated_desc" ||
    groupBy !== "none"
  );
}

export function LeakInboxToolbar({
  statusFilter,
  sourceFilter,
  focusFilter,
  sortOption,
  groupBy,
  searchQuery,
  leakCounts,
  focusLeakCount,
  onStatusFilterChange,
  onSourceFilterChange,
  onFocusFilterChange,
  onSortOptionChange,
  onGroupByChange,
  onSearchQueryChange,
}: LeakInboxToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const hasExtra = hasActiveExtraFilters(sourceFilter, focusFilter, sortOption, groupBy);

  return (
    <div className="space-y-3">
      {/* Статус — всегда видимый, основной фильтр */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onStatusFilterChange(option.id)}
            className={getPillClassName(statusFilter === option.id)}
          >
            {option.label} ({leakCounts[option.id]})
          </button>
        ))}
      </div>

      {/* Поиск — всегда видимый */}
      <Input
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Поиск по названию или описанию"
        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
      />

      {/* Кнопка раскрытия доп. фильтров */}
      <button
        type="button"
        onClick={() => setFiltersExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/70"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {filtersExpanded ? "Свернуть фильтры" : "Ещё фильтры"}
        {hasExtra && !filtersExpanded && (
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
        )}
        {filtersExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Раскрывающийся блок дополнительных фильтров */}
      {filtersExpanded && (
        <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          {/* Источник */}
          <div>
            <div className="mb-1.5 text-[11px] tracking-wide text-white/35 uppercase">
              Источник
            </div>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSourceFilterChange(option.id)}
                  className={getPillClassName(sourceFilter === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Фокус */}
          <div>
            <div className="mb-1.5 text-[11px] tracking-wide text-white/35 uppercase">
              Фокус
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onFocusFilterChange("all")}
                className={getPillClassName(focusFilter === "all")}
              >
                Все лики
              </button>
              <button
                type="button"
                onClick={() => onFocusFilterChange("focus")}
                className={getPillClassName(focusFilter === "focus")}
              >
                В фокусе ({focusLeakCount})
              </button>
            </div>
          </div>

          {/* Сортировка */}
          <div>
            <div className="mb-1.5 text-[11px] tracking-wide text-white/35 uppercase">
              Сортировка
            </div>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSortOptionChange(option.id)}
                  className={getPillClassName(sortOption === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Группировка */}
          <div>
            <div className="mb-1.5 text-[11px] tracking-wide text-white/35 uppercase">
              Группировка
            </div>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onGroupByChange(option.id)}
                  className={getPillClassName(groupBy === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
