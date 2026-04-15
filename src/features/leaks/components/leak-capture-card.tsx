import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SEVERITY_OPTIONS,
  SEVERITY_STYLES,
  SPHERE_OPTIONS,
} from "@/features/leaks/lib/leak-constants";
import type { LeakSeverity } from "@/features/leaks/types";
import { Plus } from "lucide-react";

interface LeakCaptureCardProps {
  title: string;
  details: string;
  severity: LeakSeverity;
  sphere: string | null;
  hasDraft: boolean;
  submitting: boolean;
  onTitleChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onSeverityChange: (value: LeakSeverity) => void;
  onSphereChange: (value: string | null) => void;
  onSubmit: () => void;
}

export function LeakCaptureCard({
  title,
  details,
  severity,
  sphere,
  hasDraft,
  submitting,
  onTitleChange,
  onDetailsChange,
  onSeverityChange,
  onSphereChange,
  onSubmit,
}: LeakCaptureCardProps) {
  return (
    <Card style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Plus className="h-5 w-5 text-white/70" />
          Новый лик
        </CardTitle>
        <CardDescription className="text-white/55">
          Заметь слабое место — AI поможет разобрать и составить план.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Коротко: что не так?"
          className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />
        <Textarea
          value={details}
          onChange={(event) => onDetailsChange(event.target.value)}
          placeholder="Что произошло? Где проявляется? Что хочешь исправить?"
          className="min-h-24 border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />

        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTIONS.map((option) => {
            const isActive = severity === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSeverityChange(option.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? SEVERITY_STYLES[option.id]
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-[11px] opacity-80">{option.description}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Сфера</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSphereChange(null)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                sphere === null
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
                onClick={() => onSphereChange(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  sphere === option.id
                    ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
                    : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onSubmit}
            disabled={!hasDraft || submitting}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {submitting ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
