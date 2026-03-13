'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
  CheckCircle2
} from 'lucide-react'

interface OnboardingScreenProps {
  onComplete: (goal: string) => void
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать',
    subtitle: 'Твой персональный путь к лучшей версии себя',
    icon: '🗺️',
  },
  {
    id: 'features',
    title: 'Что тебя ждёт',
    subtitle: 'Мощный набор инструментов для трансформации',
    features: [
      { icon: Heart, label: 'Ритуалы', desc: 'Ежедневные привычки' },
      { icon: Dumbbell, label: 'Тренировки', desc: 'GYM и фитнес' },
      { icon: Target, label: 'Цели', desc: 'Направления и челленджи' },
      { icon: Wallet, label: 'Финансы', desc: 'Учёт расходов' },
      { icon: BookOpen, label: 'Обучение', desc: 'Книги и курсы' },
      { icon: Users, label: 'Бадди', desc: 'Партнёры' },
    ],
  },
  {
    id: 'journey',
    title: '30-дневный курс',
    subtitle: 'Пошаговое путешествие по всем функциям',
    benefits: [
      'Ежедневные уроки с практическими заданиями',
      'Система XP и достижений',
      'Streak бонусы за постоянство',
      'Персонализация под твою цель',
    ],
  },
  {
    id: 'goal',
    title: 'Выбери свою цель',
    subtitle: 'Курс адаптируется под твой фокус',
  },
]

const GOALS = [
  { id: 'fitness', label: '💪 Похудеть / Набрать форму', description: 'Акцент на вес, тренировки, питание' },
  { id: 'productivity', label: '📈 Стать продуктивнее', description: 'Акцент на дела, привычки, ритуалы' },
  { id: 'health', label: '🧘 Улучшить здоровье', description: 'Акцент на БАДы, вода, сон, настроение' },
  { id: 'finance', label: '💰 Навести порядок в финансах', description: 'Акцент на финансы, цели, бюджет' },
  { id: 'all', label: '🔄 Всё сразу', description: 'Полный курс по всем направлениям' },
]

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const { setScreen } = useAppStore()

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else if (selectedGoal) {
      onComplete(selectedGoal)
      setScreen('journey')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete('all')
    setScreen('journey')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)] justify-center">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Шаг {currentStep + 1} из {STEPS.length}</span>
          <button onClick={handleSkip} className="hover:text-foreground transition-colors">
            Пропустить
          </button>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Step 1: Welcome */}
        {step.id === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h1 className="text-2xl font-bold">{step.title}</h1>
            <p className="text-muted-foreground">{step.subtitle}</p>
            
            <div className="pt-8 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span>Более 20 модулей для развития</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Система достижений и XP</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Streak и мотивация</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Features */}
        {step.id === 'features' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {step.features?.map((feature, i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardContent className="p-3 text-center">
                    <feature.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-sm">{feature.label}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Journey */}
        {step.id === 'journey' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>
            
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                {step.benefits?.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground">
              Курс проведёт тебя по всем функциям приложения
            </div>
          </div>
        )}

        {/* Step 4: Goal Selection */}
        {step.id === 'goal' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{step.title}</h1>
              <p className="text-muted-foreground text-sm">{step.subtitle}</p>
            </div>
            
            <div className="space-y-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedGoal === goal.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedGoal(goal.id)}
                >
                  <div className="font-medium">{goal.label}</div>
                  <div className="text-xs text-muted-foreground">{goal.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {currentStep > 0 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        )}
        <Button
          className="flex-1 bg-primary hover:bg-primary/90"
          onClick={handleNext}
          disabled={step.id === 'goal' && !selectedGoal}
        >
          {currentStep === STEPS.length - 1 ? (
            <>
              Начать путешествие
              <Sparkles className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Далее
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
