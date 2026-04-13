import { LeakAiAnalysisCard } from "@/components/LeakAiAnalysisCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeakDraft } from "@/features/leaks/types";
import { Brain } from "lucide-react";

interface LeakAiDraftCardProps {
  userId: string;
  selectedDraft: LeakDraft;
  selectedDraftLabel: string | null;
}

export function LeakAiDraftCard({
  userId,
  selectedDraft,
  selectedDraftLabel,
}: LeakAiDraftCardProps) {
  return (
    <Card
      style={{
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Brain className="h-4 w-4 text-indigo-300" />
          Готово к AI-разбору
        </CardTitle>
        <CardDescription className="text-white/60">{selectedDraftLabel}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-2 text-sm text-white/75">{selectedDraft.leakMessage}</p>
        <LeakAiAnalysisCard
          userId={userId}
          leakType={selectedDraft.leakType}
          leakMessage={selectedDraft.leakMessage}
          severity={selectedDraft.severity}
        />
      </CardContent>
    </Card>
  );
}
