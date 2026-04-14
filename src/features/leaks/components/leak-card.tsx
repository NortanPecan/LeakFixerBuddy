import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/features/leaks/lib/leak-constants";
import { formatDate, getActionLabel } from "@/features/leaks/lib/leak-formatters";
import type { LeakActionLink, LeakEntity } from "@/features/leaks/types";
import type { ReactNode } from "react";

interface LeakCardProps {
  leak: LeakEntity;
  updatingLeakId: string | null;
  expanded: boolean;
  isFocus: boolean;
  mainActionBlock?: ReactNode;
  children?: ReactNode;
  onOpenActionEntity: (entityType: LeakActionLink["entityType"]) => void;
  onMoveToWork: () => void;
  onResolve: () => void;
  onArchive: () => void;
  onReturnToWork: () => void;
  onToggleFocus: () => void;
  onToggleDetails: () => void;
  onAnalyze: () => void;
  onEdit: () => void;
}

export function LeakCard({
  leak,
  updatingLeakId,
  expanded,
  isFocus,
  mainActionBlock,
  children,
  onOpenActionEntity,
  onMoveToWork,
  onResolve,
  onArchive,
  onReturnToWork,
  onToggleFocus,
  onToggleDetails,
  onAnalyze,
  onEdit,
}: LeakCardProps) {
  return (
    <Card
      style={{
        background: "rgba(15,23,42,0.82)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <CardContent className="space-y-3 pt-4">
        {mainActionBlock}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-white">{leak.title}</div>
            <div className="mt-1 text-xs text-white/35">
              Создан: {formatDate(leak.createdAt)}
              {leak.resolvedAt ? ` • Решён: ${formatDate(leak.resolvedAt)}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isFocus && (
              <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">Фокус</Badge>
            )}
            <Badge className={STATUS_STYLES[leak.status]}>{STATUS_LABELS[leak.status]}</Badge>
            <Badge className={SEVERITY_STYLES[leak.severity]}>{leak.severity}</Badge>
            {leak.actions.length > 0 && (
              <Badge className="border-white/10 bg-white/10 text-white/75">
                Действий: {leak.actions.length}
              </Badge>
            )}
          </div>
        </div>

        {leak.description && (
          <p className="text-sm whitespace-pre-wrap text-white/72">{leak.description}</p>
        )}

        {leak.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {leak.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onOpenActionEntity(action.entityType)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {getActionLabel(action.entityType)}: {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {leak.status === "new" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onMoveToWork}
              disabled={updatingLeakId === leak.id}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              В работу
            </Button>
          )}
          {leak.status !== "resolved" && leak.status !== "archived" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResolve}
              disabled={updatingLeakId === leak.id}
              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
            >
              Решено
            </Button>
          )}
          {leak.status !== "archived" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onArchive}
              disabled={updatingLeakId === leak.id}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              В архив
            </Button>
          )}
          {(leak.status === "resolved" || leak.status === "archived") && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReturnToWork}
              disabled={updatingLeakId === leak.id}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Вернуть в работу
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleFocus}
            disabled={updatingLeakId === leak.id}
            className={
              isFocus
                ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                : "border-white/15 bg-white/5 text-white hover:bg-white/10"
            }
          >
            {isFocus ? "Убрать из фокуса" : "В фокус"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleDetails}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            {expanded ? "Скрыть детали" : "Детали"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onAnalyze}
            className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
          >
            Разобрать
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Редактировать
          </Button>
        </div>

        {expanded && children}
      </CardContent>
    </Card>
  );
}
