'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Link2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function CreateChainScreen() {
  const { user, setScreen } = useAppStore()
  const [isSaving, setIsSaving] = useState(false)
  const [step, setStep] = useState(1)

  const [title, setTitle] = useState('')
  const [firstStepText, setFirstStepText] = useState('')

  const handleSave = async () => {
    if (!user?.id || !title.trim()) return

    setIsSaving(true)
    try {
      await fetch('/api/chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          firstStepText: firstStepText.trim() || undefined
        })
      })
      setScreen('tasks')
    } catch (error) {
      console.error('Failed to create chain:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('tasks')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Новая цепочка</h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? 'Шаг 1 из 2: Цель' : 'Шаг 2 из 2: Первый шаг'}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          {/* Introduction */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Цепочка — это последовательность шагов к цели.
                    Каждый выполненный шаг приближает тебя к результату.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Title */}
          <div className="space-y-2">
            <Label>Название цепочки / Цель *</Label>
            <Input
              placeholder="Например: LeakFixer — MVP"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Назови цель или проект, к которому ведут шаги
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <Label>Примеры</Label>
            <div className="flex flex-wrap gap-2">
              {['Steam — связка', 'LeakFixer — MVP', 'Похудение к лету', 'Изучение AI'].map(example => (
                <button
                  key={example}
                  className="px-3 py-1.5 rounded-full text-sm bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={() => setTitle(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Next button */}
          <Button
            className="w-full bg-primary"
            disabled={!title.trim()}
            onClick={() => setStep(2)}
          >
            Далее: Первый шаг
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* First step */}
          <div className="space-y-2">
            <Label>Первый шаг</Label>
            <Input
              placeholder="Что сделать первым?"
              value={firstStepText}
              onChange={e => setFirstStepText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Можно пропустить и добавить шаги позже
            </p>
          </div>

          {/* Quick suggestions */}
          <div className="space-y-2">
            <Label>Быстрые варианты</Label>
            <div className="flex flex-wrap gap-2">
              {[
                'Описать план',
                'Сделать список задач',
                'Изучить тему',
                'Начать с малого'
              ].map(suggestion => (
                <button
                  key={suggestion}
                  className="px-3 py-1.5 rounded-full text-sm bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={() => setFirstStepText(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Назад
            </Button>
            <Button
              className="flex-1 bg-primary"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? 'Создание...' : 'Создать цепочку'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
