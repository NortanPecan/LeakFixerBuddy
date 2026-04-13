import { getLeakGroupLabel } from "@/features/leaks/lib/leak-selectors";
import type { LeakEntity, LeakGroupOption } from "@/features/leaks/types";
import type { ReactNode } from "react";

interface LeakListProps {
  filteredLeaks: LeakEntity[];
  groupBy: LeakGroupOption;
  groupCounts: Record<string, number>;
  getGroupKey: (leak: LeakEntity) => string;
  renderLeak: (leak: LeakEntity, index: number) => ReactNode;
}

export function LeakList({
  filteredLeaks,
  groupBy,
  groupCounts,
  getGroupKey,
  renderLeak,
}: LeakListProps) {
  return (
    <>
      {filteredLeaks.map((leak, index) => {
        const groupKey = getGroupKey(leak);
        const prevGroupKey = index > 0 ? getGroupKey(filteredLeaks[index - 1]) : null;
        const showGroupHeader = groupBy !== "none" && groupKey !== prevGroupKey;

        return (
          <div key={leak.id} className="space-y-2">
            {showGroupHeader && (
              <div className="px-1">
                <div className="text-[11px] tracking-wide text-white/35 uppercase">
                  {getLeakGroupLabel(groupKey, groupBy)} ({groupCounts[groupKey] || 0})
                </div>
              </div>
            )}
            {renderLeak(leak, index)}
          </div>
        );
      })}
    </>
  );
}
