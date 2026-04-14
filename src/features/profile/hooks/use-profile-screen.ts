"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import type {
  ActivityStats,
  Buddy,
  Measurement,
  UserAttribute,
  UserSettings,
} from "@/features/profile/constants";

interface CommunityStats {
  streakPercentile: number;
  pointsPercentile: number;
  totalUsers: number;
}

interface Transformation {
  narrative: string;
  cached: boolean;
  createdAt: string;
}

interface AiPattern {
  leakType: string;
  analysisCount: number;
  whatWorked: unknown[];
  updatedAt: string;
}

export interface AdminFeedback {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
  user: { firstName: string | null; username: string | null; day: number; streak: number };
}

export function useProfileScreen() {
  const { user, profile } = useAppStore();
  const { setTheme } = useTheme();

  const [stats, setStats] = useState({ totalWorkouts: 0, totalCaloriesBurned: 0, totalWaterMl: 0 });
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>({});
  const [firstMeasurements, setFirstMeasurements] = useState<
    Record<string, { value: number; date: string }>
  >({});
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState({ type: "weight", value: "" });

  const [topPRs, setTopPRs] = useState<
    Array<{ templateId: string; name: string; maxWeight: number }>
  >([]);
  const [prHistory, setPrHistory] = useState<
    Record<string, Array<{ date: string; weight: number }>>
  >({});

  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [achievements, setAchievements] = useState<Array<{ code: string; obtainedAt: string }>>([]);
  const [aiPatterns, setAiPatterns] = useState<AiPattern[]>([]);
  const [transformation, setTransformation] = useState<Transformation | null>(null);
  const [transformationLoading, setTransformationLoading] = useState(false);

  const [bio, setBio] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    ritualReminders: true,
    taskReminders: true,
    zoneLeakfixerEnabled: true,
    zoneAiEnabled: true,
    zonePokerEnabled: true,
    zoneHealthEnabled: true,
    theme: "system",
  });
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    activeRituals: 0,
    completedTasks7Days: 0,
    activeChains: 0,
    completedChains: 0,
    inProgressContent: 0,
  });
  const [feedback, setFeedback] = useState({ type: "idea", message: "" });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [adminFeedbacks, setAdminFeedbacks] = useState<AdminFeedback[]>([]);
  const [adminFeedbackCounts, setAdminFeedbackCounts] = useState<Record<string, number>>({});
  const [adminFeedbackFilter, setAdminFeedbackFilter] = useState("new");
  const [isLoadingAdminFeedbacks, setIsLoadingAdminFeedbacks] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        const [measurementsRes, buddiesRes, attrsRes, settingsRes, statsRes] = await Promise.all([
          fetch(`/api/measurements?userId=${user.id}`),
          fetch(`/api/buddies?userId=${user.id}`),
          fetch(`/api/rituals/attributes?userId=${user.id}`),
          fetch(`/api/settings?userId=${user.id}`),
          fetch(`/api/stats?userId=${user.id}`),
        ]);

        if (measurementsRes.ok) {
          const d = (await measurementsRes.json()) as {
            latestByType?: Record<string, Measurement>;
            firstByType?: Record<string, { value: number; date: string }>;
          };
          setMeasurements(d.latestByType ?? {});
          setFirstMeasurements(d.firstByType ?? {});
        }
        if (buddiesRes.ok) {
          const d = (await buddiesRes.json()) as { buddies?: Buddy[] };
          setBuddies(d.buddies ?? []);
        }
        if (attrsRes.ok) {
          const d = (await attrsRes.json()) as { attributes?: UserAttribute[] };
          setAttributes(d.attributes ?? []);
        }

        let hiddenWidgets: string[] = [];
        if (settingsRes.ok) {
          const settingsData = (await settingsRes.json()) as { settings?: Record<string, unknown> };
          if (settingsData.settings) {
            setSettings(settingsData.settings as unknown as UserSettings);
            const theme = settingsData.settings.theme;
            if (typeof theme === "string") setTheme(theme);
            const hw = settingsData.settings.hiddenWidgets;
            if (Array.isArray(hw)) hiddenWidgets = hw as string[];
          }
        }

        if (statsRes.ok) {
          const statsData = (await statsRes.json()) as { stats?: Record<string, unknown> };
          if (statsData.stats) {
            const s = statsData.stats;
            setActivityStats({
              activeRituals: (s.activeRituals as number) || 0,
              completedTasks7Days: (s.completedTasks7Days as number) || 0,
              activeChains: (s.activeChains as number) || 0,
              completedChains: (s.completedChains as number) || 0,
              inProgressContent: (s.inProgressContent as number) || 0,
            });
            if (s.attributes) setAttributes(s.attributes as UserAttribute[]);
            setStats((prev) => ({ ...prev, totalWorkouts: (s.totalWorkouts as number) || 0 }));
          }
        }

        // Fire-and-forget parallel fetches
        fetch(`/api/gym/records?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then(
            (
              d: {
                topPRs?: Array<{ templateId: string; name: string; maxWeight: number }>;
                history?: Record<string, Array<{ date: string; weight: number }>>;
              } | null
            ) => {
              if (!d) return;
              if (d.topPRs) setTopPRs(d.topPRs.slice(0, 5));
              if (d.history) setPrHistory(d.history);
            }
          )
          .catch(() => {
            /* silent */
          });

        fetch(`/api/stats/community?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then(
            (
              d: {
                success?: boolean;
                streakPercentile?: number;
                pointsPercentile?: number;
                totalUsers?: number;
              } | null
            ) => {
              if (d?.success)
                setCommunityStats({
                  streakPercentile: d.streakPercentile!,
                  pointsPercentile: d.pointsPercentile!,
                  totalUsers: d.totalUsers!,
                });
            }
          )
          .catch(() => {
            /* silent */
          });

        fetch(`/api/achievements/check?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { achievements?: Array<{ code: string; obtainedAt: string }> } | null) => {
            if (d?.achievements) setAchievements(d.achievements);
          })
          .catch(() => {
            /* silent */
          });

        fetch(`/api/ai/patterns?userId=${user.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { patterns?: AiPattern[] } | null) => {
            if (d?.patterns) setAiPatterns(d.patterns);
          })
          .catch(() => {
            /* silent */
          });

        if ((user.day ?? 0) >= 30 && !hiddenWidgets.includes("transformation")) {
          setTransformationLoading(true);
          fetch(`/api/ai/transformation?userId=${user.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: Transformation | null) => {
              if (d?.narrative) setTransformation(d);
            })
            .catch(() => {
              /* silent */
            })
            .finally(() => setTransformationLoading(false));
        }

        if (profile?.bio) setBio(profile.bio);
      } catch (error) {
        showErrorToast(error, "load data");
      }
    };
    void loadData();
  }, [user?.id, profile?.bio]);

  const handleSaveBio = async () => {
    if (!user?.id) return;
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, profile: { bio } }),
      });
      setIsEditingBio(false);
      showSuccessToast("Биография сохранена");
    } catch (error) {
      showErrorToast(error, "save bio");
    }
  };

  const handleToggleWidget = async (widgetId: string) => {
    const current = settings.hiddenWidgets ?? [];
    const updated = current.includes(widgetId)
      ? current.filter((w) => w !== widgetId)
      : [...current, widgetId];
    const newSettings = { ...settings, hiddenWidgets: updated };
    setSettings(newSettings);
    if (user?.id) {
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, hiddenWidgets: updated }),
        });
      } catch (error) {
        showErrorToast(error, "save widget setting");
      }
    }
  };

  const handleSettingChange = async (key: keyof UserSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (key === "theme" && typeof value === "string") setTheme(value);
    if (user?.id) {
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, ...newSettings }),
        });
      } catch (error) {
        showErrorToast(error, "save setting");
      }
    }
  };

  const handleSendFeedback = async () => {
    if (!user?.id || !feedback.message.trim()) return;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type: feedback.type, message: feedback.message }),
      });
      if (!res.ok) throw new Error("send failed");
      setFeedback({ type: "idea", message: "" });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (error) {
      showErrorToast(error, "send feedback");
    }
  };

  const loadAdminFeedbacks = async (filter = adminFeedbackFilter) => {
    if (!user?.id) return;
    setIsLoadingAdminFeedbacks(true);
    try {
      const url = `/api/admin/feedback?userId=${user.id}${filter !== "all" ? `&status=${filter}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        feedbacks?: AdminFeedback[];
        counts?: Record<string, number>;
      };
      setAdminFeedbacks(data.feedbacks ?? []);
      setAdminFeedbackCounts(data.counts ?? {});
    } catch {
      /* silent */
    } finally {
      setIsLoadingAdminFeedbacks(false);
    }
  };

  const handleMarkFeedback = async (feedbackId: string, status: string) => {
    if (!user?.id) return;
    try {
      await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, feedbackId, status }),
      });
      setAdminFeedbacks((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, status } : f)));
      setAdminFeedbackCounts((prev) => {
        const old = adminFeedbacks.find((f) => f.id === feedbackId);
        if (!old) return prev;
        return {
          ...prev,
          [old.status]: Math.max(0, (prev[old.status] ?? 0) - 1),
          [status]: (prev[status] ?? 0) + 1,
        };
      });
    } catch {
      /* silent */
    }
  };

  const handleAddMeasurement = async () => {
    if (!user?.id || !newMeasurement.value) return;
    try {
      await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: newMeasurement.type,
          value: parseFloat(newMeasurement.value),
        }),
      });
      const res = await fetch(`/api/measurements?userId=${user.id}`);
      const data = (await res.json()) as {
        latestByType?: Record<string, Measurement>;
        firstByType?: Record<string, { value: number; date: string }>;
      };
      setMeasurements(data.latestByType ?? {});
      setFirstMeasurements(data.firstByType ?? {});
      setShowMeasurements(false);
      setNewMeasurement({ type: "weight", value: "" });
      showSuccessToast("Замер добавлен");
    } catch (error) {
      showErrorToast(error, "add measurement");
    }
  };

  return {
    stats,
    measurements,
    firstMeasurements,
    buddies,
    attributes,
    showMeasurements,
    setShowMeasurements,
    newMeasurement,
    setNewMeasurement,
    topPRs,
    prHistory,
    communityStats,
    achievements,
    aiPatterns,
    transformation,
    transformationLoading,
    bio,
    setBio,
    isEditingBio,
    setIsEditingBio,
    settings,
    activityStats,
    feedback,
    setFeedback,
    feedbackSent,
    adminFeedbacks,
    adminFeedbackCounts,
    adminFeedbackFilter,
    setAdminFeedbackFilter,
    isLoadingAdminFeedbacks,
    handleSaveBio,
    handleToggleWidget,
    handleSettingChange,
    handleSendFeedback,
    loadAdminFeedbacks,
    handleMarkFeedback,
    handleAddMeasurement,
  };
}
