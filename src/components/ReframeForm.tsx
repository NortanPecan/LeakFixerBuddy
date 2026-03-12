'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NOTE_ZONES, ReframeData, ReframeAction, getNoteZoneInfo } from '@/lib/notes-config'
import { Plus, Trash2, ChevronDown, ChevronUp, Lightbulb, ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReframeFormProps {
  initialData?: ReframeData
  initialZone?: string
  onSubmit: (data: ReframeData, zone: string) => void
  onCancel: () => void
  isLoading?: boolean
}

const EXAMPLES = {
  oldThought: [
    'Я опять всё солью',
    'У меня не получится',
    'Я не смогу довести это до конца',
  ],
  newView: [
    'Я могу сделать маленький шаг и проверить результат',
    'У меня уже есть опыт, который поможет',
    'Можно разбить на части и двигаться постепенно',
  ],
  actions: [
    'Написать план на сегодня',
    'Сделать один маленький шаг',
    'Проверить гипотезу',
  ],
}

export function ReframeForm({ 
  initialData, 
  initialZone = 'general', 
  onSubmit, 
  onCancel,
  isLoading 
}: ReframeFormProps) {
  const [zone, setZone] = useState(initialZone)
  const [situation, setSituation] = useState(initialData?.situation || '')
  const [oldThought, setOldThought] = useState(initialData?.oldThought || '')
  const [newView, setNewView] = useState(initialData?.newView || '')
  const [actions, setActions] = useState<ReframeAction[]>(
    initialData?.actions || [{ text: '' }]
  )
  const [showExamples, setShowExamples] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('oldThought')

  const addAction = () => {
    if (actions.length < 3) {
      setActions([...actions, { text: '' }])
    }
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, text: string) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], text }
    setActions(updated)
  }

  const isValid = oldThought.trim() && newView.trim() && actions.some(a => a.text.trim())

  const handleSubmit = () => {
    if (!isValid) return
    
    const data: ReframeData = {
      situation: situation.trim(),
      oldThought: oldThought.trim(),
      newView: newView.trim(),
      actions: actions.filter(a => a.text.trim()),
    }
    
    onSubmit(data, zone)
  }

  return (
    <div className="space-y-4">
      {/* Zone selector */}
      <div className="space-y-2">
        <Label>Зона</Label>
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_ZONES.map(z => (
              <SelectItem key={z.id} value={z.id}>
                {z.icon} {z.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Situation (optional) */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full"
          onClick={() => setExpandedSection(expandedSection === 'situation' ? null : 'situation')}
        >
          <span className="text-muted-foreground">Ситуация</span>
          <Badge variant="outline" className="text-[10px]">опц.</Badge>
          {expandedSection === 'situation' ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {expandedSection === 'situation' && (
          <Textarea
            placeholder="Что произошло / что запускает мысль?"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-[60px] resize-none"
          />
        )}
      </div>

      {/* Old Thought (required) */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full"
          onClick={() => setExpandedSection(expandedSection === 'oldThought' ? null : 'oldThought')}
        >
          <span className="text-destructive">Старая мысль</span>
          <Badge variant="destructive" className="text-[10px]">обяз.</Badge>
          {expandedSection === 'oldThought' ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {expandedSection === 'oldThought' && (
          <>
            <Textarea
              placeholder="Что за мысль крутится в голове?"
              value={oldThought}
              onChange={(e) => setOldThought(e.target.value)}
              className="min-h-[80px] resize-none border-destructive/30 focus-visible:ring-destructive/30"
            />
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.oldThought.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-foreground bg-muted/50 px-2 py-0.5 rounded"
                  onClick={() => setOldThought(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New View (required) */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full"
          onClick={() => setExpandedSection(expandedSection === 'newView' ? null : 'newView')}
        >
          <span className="text-emerald-600">Новый взгляд</span>
          <Badge className="text-[10px] bg-emerald-600">обяз.</Badge>
          {expandedSection === 'newView' ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {expandedSection === 'newView' && (
          <>
            <Textarea
              placeholder="Как можно посмотреть на это по-другому?"
              value={newView}
              onChange={(e) => setNewView(e.target.value)}
              className="min-h-[80px] resize-none border-emerald-500/30 focus-visible:ring-emerald-500/30"
            />
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.newView.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-foreground bg-muted/50 px-2 py-0.5 rounded"
                  onClick={() => setNewView(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full"
          onClick={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
        >
          <span className="text-primary">Действия</span>
          <Badge variant="default" className="text-[10px]">1-3</Badge>
          {expandedSection === 'actions' ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {expandedSection === 'actions' && (
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-muted-foreground text-sm mt-2">{index + 1}.</span>
                <Input
                  placeholder={`Действие ${index + 1}...`}
                  value={action.text}
                  onChange={(e) => updateAction(index, e.target.value)}
                  className="flex-1"
                />
                {actions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeAction(index)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {actions.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={addAction}
              >
                <Plus className="w-4 h-4" />
                Добавить действие
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {isValid && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Превью:</p>
          <div className="text-sm">
            <span className="text-destructive">&quot;{oldThought.slice(0, 50)}{oldThought.length > 50 ? '...' : ''}&quot;</span>
            <span className="mx-2">→</span>
            <span className="text-emerald-600">&quot;{newView.slice(0, 50)}{newView.length > 50 ? '...' : ''}&quot;</span>
          </div>
          <p className="text-xs text-muted-foreground">
            📋 {actions.filter(a => a.text.trim()).length} действие(й)
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
