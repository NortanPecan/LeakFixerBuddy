"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Trash2, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface WeightRecordsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Measurement {
  id: string;
  value: number;
  date: string;
  note: string | null;
}

interface DayGroup {
  date: string;
  avg: number;
  count: number;
  measurements: Measurement[];
}

export function WeightRecordsModal({ open, onOpenChange }: WeightRecordsModalProps) {
  const { user } = useAppStore();
  const [records, setRecords] = useState<DayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (open && user?.id) {
      loadData(true);
    }
  }, [open, user?.id]);

  const loadData = async (reset = false) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const skip = reset ? 0 : page * PAGE_SIZE;
      const res = await fetch(
        `/api/weight/records?userId=${user.id}&skip=${skip}&take=${PAGE_SIZE}`
      );
      const data = await res.json();

      if (reset) {
        setRecords(data.groups || []);
        setPage(0);
      } else {
        setRecords((prev) => [...prev, ...(data.groups || [])]);
      }

      setHasMore((data.groups?.length || 0) === PAGE_SIZE);
      if (!reset) {
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      showErrorToast(error, "load records");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;

    try {
      await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
      showSuccessToast("Запись удалена");
      loadData(true);
    } catch (error) {
      showErrorToast(error, "delete record");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Сегодня";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Вчера";

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Все записи веса
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {isLoading && records.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Scale className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Нет записей</p>
            </div>
          ) : (
            <>
              {records.map((day) => (
                <div key={day.date} className="space-y-1">
                  {/* Day header */}
                  <button
                    className="bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between rounded-lg p-3 transition-colors"
                    onClick={() => toggleDay(day.date)}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{formatDate(day.date)}</p>
                      <p className="text-muted-foreground text-xs">
                        Средний: {day.avg.toFixed(1)} кг · {day.count}{" "}
                        {day.count === 1 ? "запись" : day.count < 5 ? "записи" : "записей"}
                      </p>
                    </div>
                    {expandedDays.has(day.date) ? (
                      <ChevronUp className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                  </button>

                  {/* Measurements for this day */}
                  {expandedDays.has(day.date) && (
                    <div className="space-y-1 pl-4">
                      {day.measurements.map((m) => (
                        <div
                          key={m.id}
                          className="bg-muted/20 flex items-center justify-between rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground h-3 w-3" />
                            <span className="text-muted-foreground text-xs">
                              {formatTime(m.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{m.value.toFixed(1)} кг</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground h-6 w-6 p-0 hover:text-red-400"
                              onClick={() => handleDelete(m.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => loadData()}
                  disabled={isLoading}
                >
                  {isLoading ? "Загрузка..." : "Загрузить ещё"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
