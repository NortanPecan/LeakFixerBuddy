"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Bell, Scale } from "lucide-react";
import { ZONES_CONFIG, THEME_OPTIONS, type UserSettings } from "@/features/profile/constants";

const WIDGET_CONFIG = [
  { id: "weight", label: "Вес" },
  { id: "wellbeing", label: "Велнес" },
  { id: "mood", label: "Настроение / Энергия" },
  { id: "water", label: "Вода (в сводке)" },
  { id: "food", label: "Еда (в сводке)" },
  { id: "rituals", label: "Ритуалы (в сводке)" },
  { id: "supplements", label: "БАДы (в сводке)" },
  { id: "quickinput", label: "Быстрый ввод" },
  { id: "ai_recommendations", label: "AI Рекомендации" },
  { id: "daily_tip", label: "Совет дня (AI)" },
  { id: "transformation", label: "AI-нарратив «Как я изменился»" },
  { id: "challenges", label: "Активные челленджи" },
] as const;

interface ProfileSettingsCardProps {
  settings: UserSettings;
  handleSettingChange: (key: keyof UserSettings, value: boolean | string) => Promise<void>;
  handleToggleWidget: (id: string) => Promise<void>;
}

export function ProfileSettingsCard({
  settings,
  handleSettingChange,
  handleToggleWidget,
}: ProfileSettingsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-5 w-5" />
          Настройки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Уведомления</p>
          {(
            [
              {
                key: "ritualReminders" as keyof UserSettings,
                label: "Напоминания по ритуалам",
              },
              {
                key: "taskReminders" as keyof UserSettings,
                label: "Напоминания по делам",
              },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="text-muted-foreground h-5 w-5" />
                <Label className="text-sm">{label}</Label>
              </div>
              <Switch
                checked={settings[key] as boolean}
                onCheckedChange={(checked) => void handleSettingChange(key, checked)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="text-muted-foreground h-5 w-5" />
              <div>
                <Label className="text-sm">Напоминание о весе</Label>
                <p className="text-muted-foreground text-xs">Если не записал сегодня</p>
              </div>
            </div>
            <Switch
              checked={settings.weightReminder ?? false}
              onCheckedChange={(checked) => void handleSettingChange("weightReminder", checked)}
            />
          </div>
          {settings.weightReminder && (
            <div className="flex items-center justify-between pl-8">
              <Label className="text-muted-foreground text-sm">Время напоминания</Label>
              <Input
                type="time"
                value={settings.weightReminderTime ?? "08:00"}
                onChange={(e) => void handleSettingChange("weightReminderTime", e.target.value)}
                className="h-8 w-28 text-sm"
              />
            </div>
          )}
        </div>

        <div className="border-border/50 space-y-3 border-t pt-3">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Активные зоны</p>
          <div className="flex flex-wrap gap-2">
            {ZONES_CONFIG.map(({ key, label, emoji }) => (
              <Badge
                key={key}
                variant={settings[key as keyof UserSettings] ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  settings[key as keyof UserSettings]
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50"
                }`}
                onClick={() =>
                  void handleSettingChange(
                    key as keyof UserSettings,
                    !settings[key as keyof UserSettings]
                  )
                }
              >
                {emoji} {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-border/50 space-y-3 border-t pt-3">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Виджеты главного экрана
          </p>
          {WIDGET_CONFIG.map(({ id, label }) => {
            const hidden = (settings.hiddenWidgets ?? []).includes(id);
            return (
              <div key={id} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch checked={!hidden} onCheckedChange={() => void handleToggleWidget(id)} />
              </div>
            );
          })}
        </div>

        <div className="border-border/50 space-y-3 border-t pt-3">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Тема оформления</p>
          <Select
            value={settings.theme}
            onValueChange={(value) => void handleSettingChange("theme", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите тему" />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
