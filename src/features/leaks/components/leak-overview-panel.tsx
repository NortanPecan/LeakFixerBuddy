import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLAN_MODE_LABELS, SPHERE_OPTIONS } from "@/features/leaks/lib/leak-constants";
import { getSnapshotHistory } from "@/features/leaks/lib/leak-context";
import {
  formatDate,
  getActionLabel,
  getSourceLabel,
  getSphereLabel,
} from "@/features/leaks/lib/leak-formatters";
import { isLeakEntityType } from "@/features/leaks/lib/leak-selectors";
import type { LeakActionLink, LeakEntity, LeakSolutionPlan } from "@/features/leaks/types";
type SnapshotHistory = ReturnType<typeof getSnapshotHistory>;

interface ContextPulse {
  energyAvg: number | null;
  stressAvg: number | null;
  sleepHoursAvg: number | null;
  openTasks: number | null;
}

interface LeakOverviewPanelProps {
  leak: LeakEntity;
  updatingLeakId: string | null;
  editing: boolean;
  editingLeakTitle: string;
  editingLeakDescription: string;
  contextSnapshotItems: string[];
  contextPulse: ContextPulse;
  contextPulseRisk: "high" | "normal";
  contextHypotheses: string[];
  snapshotHistory: SnapshotHistory;
  onEditingLeakTitleChange: (value: string) => void;
  onEditingLeakDescriptionChange: (value: string) => void;
  onSaveEdits: () => void;
  onCancelEditing: () => void;
  onUpdateSphere: (sphere: string | null) => void;
  onOpenSnapshotEntity: (entityType: LeakActionLink["entityType"]) => void;
}

export function LeakOverviewPanel({
  leak,
  updatingLeakId,
  editing,
  editingLeakTitle,
  editingLeakDescription,
  contextSnapshotItems,
  contextPulse,
  contextPulseRisk,
  contextHypotheses,
  snapshotHistory,
  onEditingLeakTitleChange,
  onEditingLeakDescriptionChange,
  onSaveEdits,
  onCancelEditing,
  onUpdateSphere,
  onOpenSnapshotEntity,
}: LeakOverviewPanelProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge className="border-white/10 bg-white/10 text-white/75">
          Источник: {getSourceLabel(leak.source)}
        </Badge>
        {leak.sphere && (
          <Badge className="border-white/10 bg-white/10 text-white/75">
            Сфера: {getSphereLabel(leak.sphere)}
          </Badge>
        )}
      </div>

      {editing && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-3">
          <Input
            value={editingLeakTitle}
            onChange={(event) => onEditingLeakTitleChange(event.target.value)}
            placeholder="Название лика"
            className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
          />
          <Textarea
            value={editingLeakDescription}
            onChange={(event) => onEditingLeakDescriptionChange(event.target.value)}
            placeholder="Уточни, что именно происходит и что хочешь исправить"
            className="min-h-24 border-white/10 bg-white/5 text-white placeholder:text-white/30"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={onSaveEdits}
              disabled={!editingLeakTitle.trim() || updatingLeakId === leak.id}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {updatingLeakId === leak.id ? "Сохраняю..." : "Сохранить"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelEditing}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs tracking-wide text-white/40 uppercase">Сфера</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpdateSphere(null)}
            disabled={updatingLeakId === leak.id}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              !leak.sphere
                ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
                : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
            }`}
          >
            Без сферы
          </button>
          {SPHERE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onUpdateSphere(option.id)}
              disabled={updatingLeakId === leak.id}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                leak.sphere === option.id
                  ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
                  : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {contextSnapshotItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Контекст</div>
          <div className="flex flex-wrap gap-2">
            {contextSnapshotItems.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-white/10 text-left whitespace-normal text-white/60"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(contextPulse.energyAvg !== null ||
        contextPulse.stressAvg !== null ||
        contextPulse.sleepHoursAvg !== null ||
        contextPulse.openTasks !== null) && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Контекстный пульс</div>
          <div className="flex flex-wrap gap-2">
            <Badge
              className={
                contextPulseRisk === "high"
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              }
            >
              Риск контекста: {contextPulseRisk === "high" ? "высокий" : "нормальный"}
            </Badge>
            {contextPulse.energyAvg !== null && (
              <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                Энергия: {contextPulse.energyAvg}
              </Badge>
            )}
            {contextPulse.stressAvg !== null && (
              <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                Стресс: {contextPulse.stressAvg}
              </Badge>
            )}
            {contextPulse.sleepHoursAvg !== null && (
              <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-200">
                Сон: {contextPulse.sleepHoursAvg}ч
              </Badge>
            )}
            {contextPulse.openTasks !== null && (
              <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                Открытые задачи: {contextPulse.openTasks}
              </Badge>
            )}
          </div>
        </div>
      )}

      {contextHypotheses.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Контекстные гипотезы</div>
          <div className="space-y-2">
            {contextHypotheses.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {(snapshotHistory.linkedEntities.length > 0 || snapshotHistory.actionFeedback.length > 0) && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">
            Learning memory (snapshot)
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="text-xs text-white/55">Последние созданные сущности</div>
              {snapshotHistory.linkedEntities.slice(0, 4).map((item) => (
                <div
                  key={`${item.entityType}-${item.label}-${item.createdAt}`}
                  className="text-xs text-white/70"
                >
                  <div>
                    {item.sourcePlanMode && item.sourcePlanMode in PLAN_MODE_LABELS
                      ? `[${PLAN_MODE_LABELS[item.sourcePlanMode as LeakSolutionPlan["mode"]]}] `
                      : ""}
                    {item.label} • {formatDate(item.createdAt)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.reused && (
                      <Badge className="border-white/10 bg-white/10 text-white/65">Reused</Badge>
                    )}
                    {item.policyCorrelationId && (
                      <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                        Corr: {item.policyCorrelationId.slice(0, 18)}
                      </Badge>
                    )}
                  </div>
                  {isLeakEntityType(item.entityType) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onOpenSnapshotEntity(item.entityType as LeakActionLink["entityType"])
                      }
                      className="mt-1 border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Открыть {getActionLabel(item.entityType as LeakActionLink["entityType"])}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="text-xs text-white/55">Последние feedback из истории</div>
              {snapshotHistory.actionFeedback.slice(0, 4).map((item) => (
                <div
                  key={`${item.actionTitle}-${item.updatedAt}`}
                  className="text-xs text-white/70"
                >
                  <div>
                    {item.actionTitle} • {item.result} • {formatDate(item.updatedAt)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.feedbackSource === "policy" && (
                      <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                        Policy outcome
                      </Badge>
                    )}
                    {item.attempt && (
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        Attempt {item.attempt}
                      </Badge>
                    )}
                    {item.policyCorrelationId && (
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        Corr: {item.policyCorrelationId.slice(0, 18)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
