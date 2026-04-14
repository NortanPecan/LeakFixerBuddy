import { LeakAiDraftCard } from "@/features/leaks/components/leak-ai-draft-card";
import { LeakEmptyState } from "@/features/leaks/components/leak-empty-state";
import { LeakInboxToolbar } from "@/features/leaks/components/leak-inbox-toolbar";
import { LeakPriorityCard } from "@/features/leaks/components/leak-priority-card";
import type {
  LeakDraft,
  LeakEntity,
  LeakFocusFilter,
  LeakGroupOption,
  LeakSortOption,
  LeakSourceFilter,
  LeakStatusFilter,
} from "@/features/leaks/types";
import type { ReactNode } from "react";

interface LeakInboxTabProps {
  userId: string;
  selectedDraft: LeakDraft | null;
  selectedDraftLabel: string | null;
  priorityLeaks: LeakEntity[];
  statusFilter: LeakStatusFilter;
  sourceFilter: LeakSourceFilter;
  focusFilter: LeakFocusFilter;
  sortOption: LeakSortOption;
  groupBy: LeakGroupOption;
  searchQuery: string;
  leakCounts: Record<LeakStatusFilter, number>;
  focusLeakCount: number;
  hasLeaks: boolean;
  signalsCount: number;
  patternsCount: number;
  isEmpty: boolean;
  onSelectPriorityLeak: (leakId: string) => void;
  onStatusFilterChange: (value: LeakStatusFilter) => void;
  onSourceFilterChange: (value: LeakSourceFilter) => void;
  onFocusFilterChange: (value: LeakFocusFilter) => void;
  onSortOptionChange: (value: LeakSortOption) => void;
  onGroupByChange: (value: LeakGroupOption) => void;
  onSearchQueryChange: (value: string) => void;
  onOpenSignals: () => void;
  onOpenPatterns: () => void;
  onClearFilters: () => void;
  children: ReactNode;
}

export function LeakInboxTab({
  userId,
  selectedDraft,
  selectedDraftLabel,
  priorityLeaks,
  statusFilter,
  sourceFilter,
  focusFilter,
  sortOption,
  groupBy,
  searchQuery,
  leakCounts,
  focusLeakCount,
  hasLeaks,
  signalsCount,
  patternsCount,
  isEmpty,
  onSelectPriorityLeak,
  onStatusFilterChange,
  onSourceFilterChange,
  onFocusFilterChange,
  onSortOptionChange,
  onGroupByChange,
  onSearchQueryChange,
  onOpenSignals,
  onOpenPatterns,
  onClearFilters,
  children,
}: LeakInboxTabProps) {
  return (
    <div className="space-y-4">
      {selectedDraft && (
        <LeakAiDraftCard
          userId={userId}
          selectedDraft={selectedDraft}
          selectedDraftLabel={selectedDraftLabel}
        />
      )}

      <LeakPriorityCard priorityLeaks={priorityLeaks} onSelectLeak={onSelectPriorityLeak} />

      <LeakInboxToolbar
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        focusFilter={focusFilter}
        sortOption={sortOption}
        groupBy={groupBy}
        searchQuery={searchQuery}
        leakCounts={leakCounts}
        focusLeakCount={focusLeakCount}
        onStatusFilterChange={onStatusFilterChange}
        onSourceFilterChange={onSourceFilterChange}
        onFocusFilterChange={onFocusFilterChange}
        onSortOptionChange={onSortOptionChange}
        onGroupByChange={onGroupByChange}
        onSearchQueryChange={onSearchQueryChange}
      />

      {isEmpty ? (
        <LeakEmptyState
          hasLeaks={hasLeaks}
          signalsCount={signalsCount}
          patternsCount={patternsCount}
          onOpenSignals={onOpenSignals}
          onOpenPatterns={onOpenPatterns}
          onClearFilters={onClearFilters}
        />
      ) : (
        children
      )}
    </div>
  );
}
