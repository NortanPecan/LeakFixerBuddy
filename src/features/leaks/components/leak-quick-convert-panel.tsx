import { Button } from "@/components/ui/button";
import type { LeakEntity } from "@/features/leaks/types";

interface LeakQuickConvertPanelProps {
  leak: LeakEntity;
  actionLeakId: string | null;
  hasActionType: (leak: LeakEntity, type: "task" | "ritual" | "challenge") => boolean;
  onConvertToTask: () => void;
  onConvertToRitual: () => void;
  onConvertToChallenge: () => void;
}

export function LeakQuickConvertPanel({
  leak,
  actionLeakId,
  hasActionType,
  onConvertToTask,
  onConvertToRitual,
  onConvertToChallenge,
}: LeakQuickConvertPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs tracking-wide text-white/40 uppercase">Быстрый перевод без плана</div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onConvertToTask}
          disabled={actionLeakId === leak.id || hasActionType(leak, "task")}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          В задачу
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onConvertToRitual}
          disabled={actionLeakId === leak.id || hasActionType(leak, "ritual")}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          В ритуал
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onConvertToChallenge}
          disabled={actionLeakId === leak.id || hasActionType(leak, "challenge")}
          className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
        >
          AI-челлендж
        </Button>
      </div>
      <p className="text-xs text-white/45">
        Если не нужен целый режим, leak можно сразу превратить в одну понятную сущность.
      </p>
    </div>
  );
}
