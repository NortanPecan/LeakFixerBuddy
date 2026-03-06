'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { 
  Download, Copy, FileText, Brain, Sparkles, CheckCircle,
  Database, RefreshCw, Calendar
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

const AI_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'Вставь это в Claude для контекста...' },
  { value: 'chatgpt', label: 'ChatGPT (OpenAI)', placeholder: 'Вставь это в ChatGPT для контекста...' },
  { value: 'gemini', label: 'Gemini (Google)', placeholder: 'Вставь это в Gemini для контекста...' },
  { value: 'generic', label: 'Универсальный', placeholder: 'Контекст для любого AI помощника...' },
]

const DATE_PRESETS = [
  { value: '7', label: 'Последняя неделя' },
  { value: '14', label: 'Последние 2 недели' },
  { value: '30', label: 'Последний месяц' },
  { value: 'custom', label: 'Свой диапазон' },
]

const ENTITIES = [
  { id: 'rituals', label: 'Ритуалы', icon: '🔥' },
  { id: 'tasks', label: 'Задачи', icon: '✅' },
  { id: 'challenges', label: 'Челенджи', icon: '🏆' },
  { id: 'skills', label: 'Навыки', icon: '⭐' },
  { id: 'traits', label: 'Качества', icon: '💚' },
  { id: 'notes', label: 'Заметки', icon: '📝' },
]

export function ExportScreen() {
  const { user } = useAppStore()
  const [selectedProvider, setSelectedProvider] = useState('claude')
  const [exportData, setExportData] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Date range
  const [datePreset, setDatePreset] = useState('7')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Entity selection
  const [selectedEntities, setSelectedEntities] = useState<string[]>(['rituals', 'tasks', 'challenges', 'skills', 'traits', 'notes'])

  const getDateRange = () => {
    const end = new Date()
    let start = new Date()

    if (datePreset === 'custom') {
      if (customStartDate) start = new Date(customStartDate)
      if (customEndDate) {
        return { 
          start: customStartDate ? new Date(customStartDate) : start, 
          end: new Date(customEndDate) 
        }
      }
    } else {
      const days = parseInt(datePreset)
      start.setDate(start.getDate() - days)
    }

    return { start, end }
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const handleExport = async () => {
    if (!user?.id) return
    setIsExporting(true)
    setError(null)
    
    try {
      const { start, end } = getDateRange()
      const params = new URLSearchParams({
        userId: user.id,
        startDate: formatDate(start),
        endDate: formatDate(end),
        entities: selectedEntities.join(',')
      })
      
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error('Failed to export')
      const data = await res.json()
      
      if (data.markdown) {
        const provider = AI_PROVIDERS.find(p => p.value === selectedProvider)
        const header = `# Контекст для ${provider?.label || 'AI'}

Это данные пользователя приложения LeakFixer Buddy — личного ассистента для развития привычек, целей и навыков.

`

        setExportData(header + data.markdown)
      } else {
        setError('Не удалось сгенерировать данные')
      }
    } catch (err) {
      console.error('Export error:', err)
      setError('Ошибка при экспорте данных')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leakfixer-export-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleEntity = (id: string) => {
    setSelectedEntities(prev => 
      prev.includes(id) 
        ? prev.filter(e => e !== id)
        : [...prev, id]
    )
  }

  const selectAllEntities = () => {
    setSelectedEntities(ENTITIES.map(e => e.id))
  }

  const clearAllEntities = () => {
    setSelectedEntities([])
  }

  // Calculate date range for display
  const { start, end } = getDateRange()
  const displayDateRange = `${formatDate(start)} — ${formatDate(end)}`

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Экспорт в AI</h1>
      </div>

      {/* Info */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">Передай контекст AI</div>
              <div className="text-sm text-muted-foreground">
                Экспортируй свои данные в формате, понятном Claude, ChatGPT или другому AI. 
                Это поможет AI лучше понимать твой контекст и давать персональные советы.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <RefreshCw className="w-4 h-4 mr-1" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Период выгрузки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Пресет</Label>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>С</Label>
                <Input 
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>По</Label>
                <Input 
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Период: {displayDateRange}
          </div>
        </CardContent>
      </Card>

      {/* Entity Selection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              Что включить
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllEntities}>
                Все
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllEntities}>
                Очистить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ENTITIES.map(entity => (
              <label
                key={entity.id}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedEntities.includes(entity.id) 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-muted/30 border-transparent'
                }`}
              >
                <Checkbox
                  checked={selectedEntities.includes(entity.id)}
                  onCheckedChange={() => toggleEntity(entity.id)}
                />
                <span className="text-sm">{entity.icon}</span>
                <span className="text-sm">{entity.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Провайдер
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting || selectedEntities.length === 0}
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Сгенерировать
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Result */}
      {exportData && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Результат</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <><CheckCircle className="w-4 h-4 mr-1" /> Скопировано</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1" /> Копировать</>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> Скачать .md
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={exportData}
              onChange={e => setExportData(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder={AI_PROVIDERS.find(p => p.value === selectedProvider)?.placeholder}
            />
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline">
                {exportData.length} символов
              </Badge>
              <Badge variant="outline">
                {selectedEntities.length} разделов
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isExporting && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
