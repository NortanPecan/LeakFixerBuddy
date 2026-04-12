"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Coffee } from "lucide-react";
import { DONATE_URL } from "../constants";

export function DonateCard() {
  return (
    <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-br">
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
            <Coffee className="text-primary h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Поддержать проект</p>
            <p className="text-muted-foreground text-xs">Помочь развитию LeakFixer</p>
          </div>
          <Button
            variant="default"
            className="bg-primary"
            onClick={() => window.open(DONATE_URL, "_blank")}
          >
            <Heart className="mr-1 h-4 w-4" />
            Донат
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
