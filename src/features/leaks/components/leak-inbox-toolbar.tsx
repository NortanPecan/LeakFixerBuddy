import { Input } from "@/components/ui/input";
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onFocusFilterChange("all")}
          className={getPillClassName(focusFilter === "all")}
        >
          Все leaks
        </button>
        <button
          type="button"
          onClick={() => onFocusFilterChange("focus")}
          className={getPillClassName(focusFilter === "focus")}
        >
          Фокус ({focusLeakCount})
        </button>
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

      <Input
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Поиск по ликам, описанию или сфере"
        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
      />
    </div>
  );
}
