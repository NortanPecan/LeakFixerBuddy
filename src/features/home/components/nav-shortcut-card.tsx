"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface NavShortcutCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

export function NavShortcutCard({ emoji, title, subtitle, onClick }: NavShortcutCardProps) {
  return (
    <Card
      className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <div>
              <div className="text-sm font-medium text-white">{title}</div>
              <div className="text-xs text-white/40">{subtitle}</div>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
