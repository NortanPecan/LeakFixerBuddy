"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import type { AdminFeedback } from "@/features/profile/hooks/use-profile-screen";

interface AdminFeedbacksCardProps {
  adminFeedbacks: AdminFeedback[];
  adminFeedbackCounts: Record<string, number>;
  adminFeedbackFilter: string;
  setAdminFeedbackFilter: React.Dispatch<React.SetStateAction<string>>;
  isLoadingAdminFeedbacks: boolean;
  loadAdminFeedbacks: (filter?: string) => Promise<void>;
  handleMarkFeedback: (feedbackId: string, status: string) => Promise<void>;
}

export function AdminFeedbacksCard({
  adminFeedbacks,
  adminFeedbackCounts,
  adminFeedbackFilter,
  setAdminFeedbackFilter,
  isLoadingAdminFeedbacks,
  loadAdminFeedbacks,
  handleMarkFeedback,
}: AdminFeedbacksCardProps) {
  return (
    <Card className="bg-card/50 border-emerald-500/20 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            Фидбеки пользователей
            {adminFeedbackCounts["new"] > 0 && (
              <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-400">
                {adminFeedbackCounts["new"]} новых
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => void loadAdminFeedbacks(adminFeedbackFilter)}
          >
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(["new", "read", "resolved", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={adminFeedbackFilter === f ? "default" : "outline"}
              className={`h-7 text-xs ${adminFeedbackFilter === f ? "bg-primary" : ""}`}
              onClick={() => {
                setAdminFeedbackFilter(f);
                void loadAdminFeedbacks(f);
              }}
            >
              {f === "new"
                ? `Новые${adminFeedbackCounts["new"] ? ` (${adminFeedbackCounts["new"]})` : ""}`
                : f === "read"
                  ? "Прочитано"
                  : f === "resolved"
                    ? "Решено"
                    : "Все"}
            </Button>
          ))}
        </div>
        {adminFeedbacks.length === 0 && !isLoadingAdminFeedbacks && (
          <Button
            variant="outline"
            className="w-full text-sm"
            onClick={() => void loadAdminFeedbacks(adminFeedbackFilter)}
          >
            Загрузить фидбеки
          </Button>
        )}
        {isLoadingAdminFeedbacks && (
          <p className="text-muted-foreground py-2 text-center text-sm">Загрузка...</p>
        )}
        <div className="space-y-2">
          {adminFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className={`space-y-1.5 rounded-xl border p-3 text-sm ${
                fb.status === "new"
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : fb.status === "resolved"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-white/10 bg-white/3"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={`text-xs ${
                      fb.type === "bug"
                        ? "bg-red-500/20 text-red-400"
                        : fb.type === "idea"
                          ? "bg-blue-500/20 text-blue-400"
                          : fb.type === "review"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/60"
                    }`}
                  >
                    {fb.type === "bug"
                      ? "🐛 Баг"
                      : fb.type === "idea"
                        ? "💡 Идея"
                        : fb.type === "review"
                          ? "⭐ Отзыв"
                          : "❓ Вопрос"}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {fb.user?.firstName ?? fb.user?.username ?? "Аноним"}
                    {" · "}день {fb.user?.day} · стрик {fb.user?.streak}
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {new Date(fb.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">{fb.message}</p>
              {fb.status !== "resolved" && (
                <div className="flex gap-1.5 pt-1">
                  {fb.status === "new" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => void handleMarkFeedback(fb.id, "read")}
                    >
                      Прочитано
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 border-emerald-500/30 px-2 text-xs text-emerald-400"
                    onClick={() => void handleMarkFeedback(fb.id, "resolved")}
                  >
                    Решено ✓
                  </Button>
                </div>
              )}
            </div>
          ))}
          {adminFeedbacks.length === 0 &&
            !isLoadingAdminFeedbacks &&
            adminFeedbackCounts["new"] !== undefined && (
              <p className="text-muted-foreground py-3 text-center text-sm">
                Нет фидбеков в этой категории
              </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
