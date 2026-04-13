import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeakEntity } from "@/features/leaks/types";

interface LeakPriorityCardProps {
  priorityLeaks: LeakEntity[];
  onSelectLeak: (leakId: string) => void;
}

export function LeakPriorityCard({ priorityLeaks, onSelectLeak }: LeakPriorityCardProps) {
  if (priorityLeaks.length === 0) {
    return null;
  }

  return (
    <Card
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white">Приоритетный фокус</CardTitle>
        <CardDescription className="text-white/60">
          Leaks, где сейчас выше риск застрять без следующего шага.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {priorityLeaks.map((leak) => (
            <Button
              key={`priority-${leak.id}`}
              size="sm"
              variant="outline"
              onClick={() => onSelectLeak(leak.id)}
              className="border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
            >
              {leak.title}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
