'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Download, Copy, FileText, Brain, Sparkles, CheckCircle,
  Database, Zap
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const AI_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'Вставь это в Claude для контекста...' },
  { value: 'chatgpt', label: 'ChatGPT (OpenAI)', placeholder: 'Вставь это в ChatGPT для контекста...' },
  { value: 'gemini', label: 'Gemini (Google)', placeholder: 'Вставь это в Gemini для контекста...' },
  { value: 'generic', label: 'Универсальный', placeholder: 'Контекст для любого AI помощника...' },
]

export function ExportScreen() {
  const { user } = useAppStore()
  const [selectedProvider, setSelectedProvider] = useState('claude')
  const [exportData, setExportData] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportType, setExportType] = useState<'full' | 'profile' | 'rituals' | 'challenges'>('full')

  const handleExport = async () => {
    if (!user?.id) return
    setIsExporting(true)
    
    try {
      const endpoints: Record<string, string> = {
        full: `/api/stats?userId=${user.id}&full=true`,
        profile: `/api/user?userId=${user.id}`,
        rituals: `/api/rituals?userId=${user.id}`,
        challenges: `/api/challenges?userId=${user.id}`,
      }
      
      const res = await fetch(endpoints[exportType])
      const data = await res.json()
      
      const provider = AI_PROVIDERS.find(p => p.value === selectedProvider)
      const prompt = generatePrompt(data, exportType, provider?.label || 'AI')
      
      setExportData(prompt)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const generatePrompt = (data: any, type: string, provider: string): string => {
    const header = `# Контекст пользователя для ${provider}

Это данные пользователя приложения LeakFixer Buddy — личного ассистента для развития привычек, целей и навыков.

`

    const sections: Record<string, string> = {
      full: `
## Полный профиль

### Основная информация
- Имя: ${data.user?.firstName || 'Не указано'}
- Прогресс: День ${data.user?.day || 1}, Серия: ${data.user?.streak || 0}

### Активность (7 дней)
- Ритуалов: ${data.stats?.rituals?.completed || 0} выполнено
- Задач: ${data.stats?.tasks?.completed || 0} выполнено
- Цепочек: ${data.stats?.chains?.active || 0} активных

### Навыки и черты
${JSON.stringify(data.skills || [], null, 2)}

### Направления и челенджи
${JSON.stringify(data.directions || [], null, 2)}
${JSON.stringify(data.challenges || [], null, 2)}
`,
      profile: `
## Профиль пользователя

- Имя: ${data.firstName || 'Не указано'}
- О себе: ${data.bio || 'Не указано'}
- Прогресс: День ${data.day || 1}
- Серия: ${data.streak || 0}
- Очки: ${data.points || 0}
`,
      rituals: `
## Ритуалы пользователя

${JSON.stringify(data.rituals || [], null, 2)}
`,
      challenges: `
## Челенджи пользователя

${JSON.stringify(data.challenges || [], null, 2)}
`,
    }

    return header + (sections[type] || sections.full)
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

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Экспорт в AI</h1>
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

      {/* Export Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Настройки экспорта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Провайдер</Label>
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
          </div>

          <div className="space-y-2">
            <Label>Что экспортировать</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'full', label: 'Всё', icon: Database },
                { value: 'profile', label: 'Профиль', icon: FileText },
                { value: 'rituals', label: 'Ритуалы', icon: Zap },
                { value: 'challenges', label: 'Челенджи', icon: Target },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={exportType === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportType(opt.value as any)}
                  className="justify-start"
                >
                  <opt.icon className="w-4 h-4 mr-2" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Экспорт...' : 'Сгенерировать'}
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
                  <Download className="w-4 h-4 mr-1" /> Скачать
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Target({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
