'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, BookOpen, Film, GraduationCap, Headphones, Video, Filter, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CONTENT_TYPES, CONTENT_STATUSES, CONTENT_ZONES, getContentTypeInfo, getContentStatusInfo, getNoteZoneInfo, formatProgress, calculateProgress } from '@/lib/content-config'
import { cn } from '@/lib/utils'

interface ContentLink {
  id: string
  entity: string
  entityId: string
  fragment: string | null
}

interface ContentTask {
  id: string
  text: string
  status: string
}

interface ContentItem {
  id: string
  type: string
  title: string
  status: string
  source: string | null
  url: string | null
  zone: string
  totalUnits: number | null
  currentUnits: number | null
  unitType: string | null
  author: string | null
  imageUrl: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  links: ContentLink[]
  tasks: ContentTask[]
}

export function DevelopmentScreen() {
  const { user, setScreen, setSelectedContentId } = useAppStore()
  const [items, setItems] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  
  // New content form state
  const [newContent, setNewContent] = useState({
    type: 'book',
    title: '',
    status: 'planned',
    source: '',
    url: '',
    zone: 'general',
    totalUnits: '',
    unitType: 'pages',
    author: '',
  })

  // Load content items
  const loadItems = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        type: activeType,
        status: activeStatus,
      })
      const response = await fetch(`/api/content?${params}`)
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, activeType, activeStatus])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Create new content
  const handleCreateContent = async () => {
    if (!user?.id || !newContent.title.trim()) return
    
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: newContent.type,
          title: newContent.title.trim(),
          status: newContent.status,
          source: newContent.source || null,
          url: newContent.url || null,
          zone: newContent.zone,
          totalUnits: newContent.totalUnits ? parseInt(newContent.totalUnits) : null,
          unitType: newContent.unitType,
          author: newContent.author || null,
        })
      })
      const data = await response.json()
      if (data.item) {
        setItems(prev => [data.item, ...prev])
        setShowAddDialog(false)
        setNewContent({
          type: 'book',
          title: '',
          status: 'planned',
          source: '',
          url: '',
          zone: 'general',
          totalUnits: '',
          unitType: 'pages',
          author: '',
        })
      }
    } catch (error) {
      console.error('Failed to create content:', error)
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      book: <BookOpen className="w-4 h-4" />,
      movie: <Film className="w-4 h-4" />,
      course: <GraduationCap className="w-4 h-4" />,
      podcast: <Headphones className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
    }
    return icons[type] || <BookOpen className="w-4 h-4" />
  }

  // Get default unit type for content type
  const getDefaultUnitType = (type: string): string => {
    const defaults: Record<string, string> = {
      book: 'pages',
      movie: 'minutes',
      course: 'lessons',
      podcast: 'minutes',
      video: 'minutes',
    }
    return defaults[type] || 'pages'
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Развитие</h1>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          size="sm"
          variant={activeType === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveType('all')}
          className="shrink-0"
        >
          Все
        </Button>
        {CONTENT_TYPES.map(type => (
          <Button
            key={type.id}
            size="sm"
            variant={activeType === type.id ? 'default' : 'outline'}
            onClick={() => setActiveType(type.id)}
            className="shrink-0 gap-1"
          >
            <span>{type.icon}</span>
            {type.label}
          </Button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CONTENT_STATUSES.map(status => (
          <Button
            key={status.id}
            size="sm"
            variant={activeStatus === status.id ? 'secondary' : 'ghost'}
            onClick={() => setActiveStatus(status.id)}
            className="shrink-0 text-xs"
          >
            <span>{status.icon}</span>
            {status.label}
          </Button>
        ))}
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Нет контента</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Добавь книгу, курс или видео для отслеживания прогресса
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const typeInfo = getContentTypeInfo(item.type)
            const statusInfo = getContentStatusInfo(item.status)
            const zoneInfo = getNoteZoneInfo(item.zone)
            const progress = calculateProgress(item)
            const hasLinks = (item.links && item.links.length > 0) || (item.tasks && item.tasks.length > 0)

            return (
              <Card
                key={item.id}
                className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 mt-0.5 p-2 rounded-lg",
                      statusInfo.id === 'completed' ? 'bg-emerald-500/20 text-emerald-600' :
                      statusInfo.id === 'in_progress' ? 'bg-amber-500/20 text-amber-600' :
                      'bg-muted/50 text-muted-foreground'
                    )}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {typeInfo.icon} {typeInfo.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {zoneInfo.icon} {zoneInfo.label}
                        </Badge>
                        {progress > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {formatProgress(item)}
                          </Badge>
                        )}
                        {hasLinks && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            🔗 {(item.links?.length || 0) + (item.tasks?.length || 1)}
                          </Badge>
                        )}
                      </div>
                      {item.author && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.author}
                        </p>
                      )}
                    </div>
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(item.url!, '_blank')
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Content Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить контент</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Type selection */}
            <div className="space-y-2">
              <Label>Тип</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(type => (
                  <Button
                    key={type.id}
                    size="sm"
                    variant={newContent.type === type.id ? 'default' : 'outline'}
                    onClick={() => setNewContent(prev => ({ ...prev, type: type.id, unitType: getDefaultUnitType(type.id) }))}
                    className="gap-1"
                  >
                    {type.icon} {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Название *</Label>
              <Input
                id="title"
                placeholder="Название книги, курса, фильма..."
                value={newContent.title}
                onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author">Автор</Label>
              <Input
                id="author"
                placeholder="Автор, создатель..."
                value={newContent.author}
                onChange={(e) => setNewContent(prev => ({ ...prev, author: e.target.value }))}
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Источник</Label>
              <Input
                id="source"
                placeholder="YouTube, Netflix, Udemy, бумажная книга..."
                value={newContent.source}
                onChange={(e) => setNewContent(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">Ссылка</Label>
              <Input
                id="url"
                placeholder="https://..."
                value={newContent.url}
                onChange={(e) => setNewContent(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>

            {/* Total units (progress) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="totalUnits">Всего ({newContent.unitType === 'pages' ? 'страниц' : newContent.unitType === 'lessons' ? 'уроков' : 'минут'})</Label>
                <Input
                  id="totalUnits"
                  type="number"
                  placeholder="300"
                  value={newContent.totalUnits}
                  onChange={(e) => setNewContent(prev => ({ ...prev, totalUnits: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Зона</Label>
                <Select
                  value={newContent.zone}
                  onValueChange={(value) => setNewContent(prev => ({ ...prev, zone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_ZONES.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.icon} {zone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddDialog(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateContent}
                disabled={!newContent.title.trim()}
              >
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getTypeIcon(selectedItem.type)}
              {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {getContentTypeInfo(selectedItem.type).icon} {getContentTypeInfo(selectedItem.type).label}
                </Badge>
                <Badge variant="secondary">
                  {getContentStatusInfo(selectedItem.status).icon} {getContentStatusInfo(selectedItem.status).label}
                </Badge>
                <Badge variant="outline">
                  {getNoteZoneInfo(selectedItem.zone).icon} {getNoteZoneInfo(selectedItem.zone).label}
                </Badge>
              </div>

              {/* Author & Source */}
              {selectedItem.author && (
                <p className="text-sm text-muted-foreground">Автор: {selectedItem.author}</p>
              )}
              {selectedItem.source && (
                <p className="text-sm text-muted-foreground">Источник: {selectedItem.source}</p>
              )}
              
              {/* URL */}
              {selectedItem.url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={() => window.open(selectedItem.url!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть источник
                </Button>
              )}

              {/* Progress */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-1">Прогресс</p>
                <p className="text-lg font-bold text-primary">
                  {formatProgress(selectedItem) || 'Не указан'}
                </p>
              </div>

              {/* Links */}
              {selectedItem.links && selectedItem.links.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Связанные заметки</p>
                  {selectedItem.links.map(link => (
                    <div key={link.id} className="text-sm bg-muted/30 rounded-lg p-2">
                      📝 {link.fragment?.substring(0, 50) || 'Заметка'}...
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {selectedItem.tasks && selectedItem.tasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Связанные дела</p>
                  {selectedItem.tasks.map(task => (
                    <div key={task.id} className="text-sm bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                      {task.status === 'done' ? '✅' : '⬜'} {task.text.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedContentId(selectedItem.id)
                    setSelectedItem(null)
                    setScreen('content-detail')
                  }}
                >
                  Открыть полностью
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
