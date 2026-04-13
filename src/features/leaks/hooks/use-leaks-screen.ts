"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { showErrorToast } from "@/lib/network-utils";
import { loadLeaksDashboard } from "@/features/leaks/api/leaks-api";
import { getCurrentMonday } from "@/features/leaks/lib/leak-context";
import { getSphereLabel } from "@/features/leaks/lib/leak-formatters";
import {
  getLeakGroupKey,
  isFocusLeak,
  normalizeLookupValue,
} from "@/features/leaks/lib/leak-selectors";
import type {
  LeakEntity,
  LeakFocusFilter,
  LeakGroupOption,
  LeakHint,
  LeakPattern,
  LeakPolicyHint,
  LeakSortOption,
  LeakSourceFilter,
  LeakStatusFilter,
  PatternFilter,
} from "@/features/leaks/types";

interface UseLeaksScreenOptions {
  userId?: string;
}

export function useLeaksScreen({ userId }: UseLeaksScreenOptions) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaks, setLeaks] = useState<LeakEntity[]>([]);
  const [signals, setSignals] = useState<LeakHint[]>([]);
  const [patterns, setPatterns] = useState<LeakPattern[]>([]);
  const [activeTab, setActiveTab] = useState("inbox");
  const [statusFilter, setStatusFilter] = useState<LeakStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<LeakSourceFilter>("all");
  const [sortOption, setSortOption] = useState<LeakSortOption>("updated_desc");
  const [focusFilter, setFocusFilter] = useState<LeakFocusFilter>("all");
  const [groupBy, setGroupBy] = useState<LeakGroupOption>("none");
  const [patternFilter, setPatternFilter] = useState<PatternFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [policyByLeak, setPolicyByLeak] = useState<Record<string, LeakPolicyHint | null>>({});

  const loadData = useCallback(
    async (showSkeleton = false) => {
      if (!userId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showSkeleton) setLoading(true);
      else setRefreshing(true);

      try {
        const data = await loadLeaksDashboard({
          userId,
          weekStart: getCurrentMonday(),
        });

        setLeaks(data.leaks);
        setSignals(data.signals);
        setPatterns(data.patterns);
        setPolicyByLeak({});
      } catch (error) {
        showErrorToast(error, "load leaks module");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const filteredLeaks = useMemo(() => {
    const filtered = leaks.filter((leak) => {
      if (statusFilter !== "all" && leak.status !== statusFilter) return false;
      if (sourceFilter !== "all" && leak.source !== sourceFilter) return false;
      if (focusFilter === "focus" && !isFocusLeak(leak)) return false;

      if (!searchQuery.trim()) return true;

      const normalizedQuery = searchQuery.trim().toLowerCase();
      return (
        normalizeLookupValue(leak.title).includes(normalizedQuery) ||
        normalizeLookupValue(leak.description).includes(normalizedQuery) ||
        normalizeLookupValue(leak.sphere).includes(normalizedQuery) ||
        normalizeLookupValue(getSphereLabel(leak.sphere)).includes(normalizedQuery)
      );
    });

    const severityRank: Record<LeakEntity["severity"], number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    return filtered.sort((a, b) => {
      if (sortOption === "created_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortOption === "severity_desc") {
        const byFocus = Number(isFocusLeak(b)) - Number(isFocusLeak(a));
        if (byFocus !== 0) return byFocus;

        const bySeverity = severityRank[b.severity] - severityRank[a.severity];
        if (bySeverity !== 0) return bySeverity;
      }

      const byFocus = Number(isFocusLeak(b)) - Number(isFocusLeak(a));
      if (byFocus !== 0) return byFocus;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [focusFilter, leaks, searchQuery, sortOption, sourceFilter, statusFilter]);

  const leakCounts = useMemo(() => {
    return leaks.reduce(
      (acc, leak) => {
        acc.all += 1;
        acc[leak.status] += 1;
        return acc;
      },
      {
        all: 0,
        new: 0,
        in_progress: 0,
        resolved: 0,
        archived: 0,
      } as Record<LeakStatusFilter, number>
    );
  }, [leaks]);

  const focusLeakCount = useMemo(() => leaks.filter((leak) => isFocusLeak(leak)).length, [leaks]);

  const groupCounts = useMemo(() => {
    if (groupBy === "none") return {};

    return filteredLeaks.reduce<Record<string, number>>((acc, leak) => {
      const key = getLeakGroupKey(leak, groupBy);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [filteredLeaks, groupBy]);

  const visiblePatterns = useMemo(() => {
    const sorted = [...patterns].sort((a, b) => {
      const activeCountA = typeof a.activeLeakCount === "number" ? a.activeLeakCount : 0;
      const activeCountB = typeof b.activeLeakCount === "number" ? b.activeLeakCount : 0;
      if (activeCountB !== activeCountA) return activeCountB - activeCountA;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (patternFilter === "linked") {
      return sorted.filter((pattern) => (pattern.activeLeakCount || 0) > 0);
    }

    return sorted;
  }, [patternFilter, patterns]);

  const priorityLeaks = useMemo(() => {
    const severityRank: Record<LeakEntity["severity"], number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    const scoreLeak = (leak: LeakEntity) => {
      let score = severityRank[leak.severity] * 10;
      if (leak.status === "new") score += 7;
      if (leak.status === "in_progress") score += 5;
      if (isFocusLeak(leak)) score += 4;
      if (leak.actions.length === 0) score += 2;
      return score;
    };

    return leaks
      .filter((leak) => leak.status === "new" || leak.status === "in_progress")
      .sort((a, b) => {
        const byScore = scoreLeak(b) - scoreLeak(a);
        if (byScore !== 0) return byScore;

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 3);
  }, [leaks]);

  return {
    loading,
    refreshing,
    leaks,
    setLeaks,
    signals,
    setSignals,
    patterns,
    setPatterns,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    sortOption,
    setSortOption,
    focusFilter,
    setFocusFilter,
    groupBy,
    setGroupBy,
    patternFilter,
    setPatternFilter,
    searchQuery,
    setSearchQuery,
    policyByLeak,
    setPolicyByLeak,
    filteredLeaks,
    leakCounts,
    focusLeakCount,
    groupCounts,
    visiblePatterns,
    priorityLeaks,
    loadData,
  };
}
