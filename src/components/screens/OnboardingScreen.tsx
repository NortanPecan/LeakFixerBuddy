"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Trophy,
  Flame,
  Heart,
  Dumbbell,
  Wallet,
  BookOpen,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface OnboardingScreenProps {
  onComplete: (goal: string) => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Добро пожаловать",
    subtitle: "Твой персональный путь к лучшей версии себя",
    icon: "🗺️",
  },
  {
    id: "features",
    title: "Что тебя ждёт",
    subtitle: "Мощный набор инструментов для трансформации",
    features: [
      { icon: Heart, label: "Ритуалы", desc: "Ежедневные привычки" },
      { icon: Dumbbell, label: "Тренировки", desc: "GYM и фитнес" },
      { icon: Target, label: "Цели", desc: "Направления и челленджи" },
      { icon: Wallet, label: "Финансы", desc: "Учёт расходов" },
      { icon: BookOpen, label: "Обучение", desc: "Книги и курсы" },
      { icon: Users, label: "Бадди", desc: "Партнёры" },
    ],
  },
  {
    id: "journey",
    title: "30-дневный курс",
    subtitle: "Пошаговое путешествие по всем функциям",
    benefits: [
      "Ежедневные уроки с практическими заданиями",
      "Система XP и достижений",
      "Streak бонусы за постоянство",
      "Персонализация под твою цель",
    ],
  },
  {
    id: "buddy-privacy",
    title: "Приватность с Бадди",
    subtitle: "Что видит твой партнёр по саморазвитию",
  },
  {
    id: "goal",
    title: "Выбери свою цель",
    subtitle: "Курс адаптируется под твой фокус",
  },
];

const GOALS = [
  {
    id: "fitness",
    label: "💪 Похудеть / Набрать форму",
    description: "Акцент на вес, тренировки, питание",
  },
  {
    id: "productivity",
    label: "📈 Стать продуктивнее",
    description: "Акцент на дела, привычки, ритуалы",
  },
  {
    id: "health",
    label: "🧘 Улучшить здоровье",
    description: "Акцент на БАДы, вода, сон, настроение",
  },
  {
    id: "finance",
    label: "💰 Навести порядок в финансах",
    description: "Акцент на финансы, цели, бюджет",
  },
  { id: "all", label: "🔄 Всё сразу", description: "Полный курс по всем направлениям" },
];

const PRIVACY_OPTIONS = [
  {
    id: "full",
    emoji: "🔓",
    label: "Полный доступ",
    desc: "Бадди видит твои ритуалы, привычки, стрики и прогресс по ликам",
  },
  {
    id: "partial",
    emoji: "🔒",
    label: "Частичный доступ",
    desc: "Бадди видит стрики и общий прогресс, но не детали ритуалов и ликов",
  },
  {
    id: "streak",
    emoji: "🙈",
    label: "Только стрики",
    desc: "Бадди видит только твои стрики — ничего личного",
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedPrivacy, setSelectedPrivacy] = useState<string>("full");
  const { setScreen, user } = useAppStore();

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (selectedGoal) {
      // Save buddy privacy setting before completing onboarding
      if (user?.id) {
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, buddyPrivacy: selectedPrivacy }),
        }).catch(() => {});
      }
      onComplete(selectedGoal);
      setScreen("journey");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete("all");
    setScreen("journey");
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col justify-center">
      {/* Progress */}
      <div className="mb-8">
        <div className="text-muted-foreground mb-2 flex justify-between text-xs">
          <span>
            Шаг {currentStep + 1} из {STEPS.length}
          </span>
          <button onClick={handleSkip} className="hover:text-foreground transition-colors">
            Пропустить
          </button>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center">
        {/* Step 1: Welcome */}
        {step.id === "welcome" && (
          <div className="space-y-6 text-center">
            <div className="mb-4 text-6xl">{step.icon}</div>
            <h1 className="text-2xl font-bold">{step.title}</h1>
            <p className="text-muted-foreground">{step.subtitle}</p>

            <div className="space-y-3 pt-8">
              <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span>Более 20 модулей для развития</span>
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Система достижений и XP</span>
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Streak и мотивация</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Features */}
        {step.id === "features" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {step.features?.map((feature, i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardContent className="p-3 text-center">
                    <feature.icon className="text-primary mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm font-medium">{feature.label}</div>
                    <div className="text-muted-foreground text-xs">{feature.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Journey */}
        {step.id === "journey" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>

            <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-br">
              <CardContent className="space-y-3 p-4">
                {step.benefits?.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="text-muted-foreground text-center text-xs">
              Курс проведёт тебя по всем функциям приложения
            </div>
          </div>
        )}

        {/* Step 4: Buddy Privacy */}
        {step.id === "buddy-privacy" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-3 text-5xl">🤝</div>
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{step.subtitle}</p>
            </div>

            <div className="space-y-3">
              {PRIVACY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPrivacy === opt.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedPrivacy(opt.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-muted-foreground mt-0.5 text-xs">{opt.desc}</div>
                    </div>
                    {selectedPrivacy === opt.id && (
                      <CheckCircle2 className="text-primary ml-auto h-5 w-5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-muted-foreground text-center text-[11px]">
              Настройку можно изменить в любое время в разделе Настройки
            </p>
          </div>
        )}

        {/* Step 5: Goal Selection */}
        {step.id === "goal" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>

            <div className="space-y-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                    selectedGoal === goal.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedGoal(goal.id)}
                >
                  <div className="font-medium">{goal.label}</div>
                  <div className="text-muted-foreground text-xs">{goal.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {currentStep > 0 && (
          <Button variant="outline" className="flex-1" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        )}
        <Button
          className="bg-primary hover:bg-primary/90 flex-1"
          onClick={handleNext}
          disabled={step.id === "goal" && !selectedGoal}
        >
          {currentStep === STEPS.length - 1 ? (
            <>
              Начать путешествие
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Далее
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
