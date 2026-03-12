'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  BookOpen,
  Film,
  GraduationCap,
  Headphones,
  Video,
  ExternalLink,
  Edit3,
  Trash2,
  Plus,
  StickyNote,
  ListTodo,
  Sparkles,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface ContentRitual {
  id: string
  title: string
  status: string
  category: string
}

interface Note {
  id: string
  text: string
  type: string
  createdAt: string
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
  rituals: ContentRitual[]
}

interface Props {
  contentId?: string
}

export function ContentDetailScreen({ contentId: contentIdProp }: Props) {
  const { user, setScreen } = useAppStore()
  const contentId = contentIdProp || '' // In real app, get from URL/store
  
  const [item, setItem] = useState<ContentItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    status: '',
    zone: '',
    totalUnits: 0,
    currentUnits: 0,
  })
  const [newNoteText, setNewNoteText] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  
  // Ritual creation state
  const [showRitualModal, setShowRitualModal] = useState(false)
  const [ritualTitle, setRitualTitle] = useState('')
  const [ritualGoal, setRitualGoal] = useState('')
  const [isCreatingRitual, setIsCreatingRitual] = useState(false)

  // Load content item
  const loadItem = useCallback(async () => {
    if (!contentId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content?userId=${user?.id}&id=${contentId}`)
      const data = await response.json()
      if (data.items && data.items[0]) {
        setItem(data.items[0])
        setEditData({
          title: data.items[0].title,
          status: data.items[0].status,
          zone: data.items[0].zone,
          totalUnits: data.items[0].totalUnits || 0,
          currentUnits: data.items[0].currentUnits || 0,
        })
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [contentId, user?.id])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  // Update content
  const handleUpdate = async () => {
    if (!item) return
    try {
      const response = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          ...editData,
        })
      })
      const data = await response.json()
      if (data.item) {
        setItem(data.item)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update content:', error)
    }
  }

  // Delete content
  const handleDelete = async () => {
    if (!item) return
    if (!confirm('Удалить этот контент?')) return
    try {
      await fetch(`/api/content?id=${item.id}`, { method: 'DELETE' })
      setScreen('development')
    } catch (error) {
      console.error('Failed to delete content:', error)
    }
  }

  // Create note from content
  const handleCreateNote = async () => {
    if (!item || !user?.id || !newNoteText.trim()) return
    try {
      const response = await fetch('/api/content/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          entity: 'note',
          createEntity: true,
          fragment: newNoteText.substring(0, 100),
          entityData: {
            userId: user.id,
            text: newNoteText,
            type: 'content',
            zone: item.zone,
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        setNewNoteText('')
        loadItem() // Refresh
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  // Create task from content
  const handleCreateTask = async () => {
    if (!item || !user?.id || !newTaskText.trim()) return
    try {
      const response = await fetch('/api/content/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          entity: 'task',
          createEntity: true,
          fragment: newTaskText.substring(0, 100),
          entityData: {
            userId: user.id,
            text: newTaskText,
            zone: item.zone,
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        setNewTaskText('')
        loadItem() // Refresh
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Open ritual modal with pre-filled data
  const openRitualModal = () => {
    if (!item) return
    
    // Generate title based on content type
    let title = ''
    const typeInfo = getContentTypeInfo(item.type)
    
    switch (item.type) {
      case 'book':
        title = `Чтение: ${item.title}`
        break
      case 'course':
        title = `Курс: ${item.title} (ежедневно)`
        break
      case 'podcast':
      case 'video':
        title = `Просмотр: ${item.title}`
        break
      case 'movie':
        title = `Просмотр: ${item.title}`
        break
      default:
        title = item.title
    }
    
    setRitualTitle(title)
    setRitualGoal(`Продвигаться по ${typeInfo.label.toLowerCase()} каждый день`)
    setShowRitualModal(true)
  }

  // Create ritual from content
  const handleCreateRitual = async () => {
    if (!item || !user?.id || !ritualTitle.trim()) return
    setIsCreatingRitual(true)
    try {
      const response = await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: ritualTitle,
          type: 'regular',
          category: 'learning',
          days: [1, 2, 3, 4, 5, 6, 7], // Every day
          timeWindow: 'any',
          goalShort: ritualGoal,
          contentId: item.id,
        })
      })
      const data = await response.json()
      if (data.ritual) {
        setShowRitualModal(false)
        loadItem() // Refresh to show the ritual
      }
    } catch (error) {
      console.error('Failed to create ritual:', error)
    } finally {
      setIsCreatingRitual(false)
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      book: <BookOpen className="w-5 h-5" />,
      movie: <Film className="w-5 h-5" />,
      course: <GraduationCap className="w-5 h-5" />,
      podcast: <Headphones className="w-5 h-5" />,
      video: <Video className="w-5 h-5" />,
    }
    return icons[type] || <BookOpen className="w-5 h-5" />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScreen('development')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Загрузка...</h1>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScreen('development')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Контент не найден</h1>
        </div>
      </div>
    )
  }

  const typeInfo = getContentTypeInfo(item.type)
  const statusInfo = getContentStatusInfo(item.status)
  const zoneInfo = getNoteZoneInfo(item.zone)
  const progress = calculateProgress(item)

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setScreen('development')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={cn(
          "shrink-0 p-2 rounded-lg",
          statusInfo.id === 'completed' ? 'bg-emerald-500/20 text-emerald-600' :
          statusInfo.id === 'in_progress' ? 'bg-amber-500/20 text-amber-600' :
          'bg-muted/50 text-muted-foreground'
        )}>
          {getTypeIcon(item.type)}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold line-clamp-1">{item.title}</h1>
          <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
          <Edit3 className="w-5 h-5" />
        </Button>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_STATUSES.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.icon} {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Зона</Label>
                <Select
                  value={editData.zone}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, zone: value }))}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Прогресс</Label>
                <Input
                  type="number"
                  value={editData.currentUnits}
                  onChange={(e) => setEditData(prev => ({ ...prev, currentUnits: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Всего</Label>
                <Input
                  type="number"
                  value={editData.totalUnits}
                  onChange={(e) => setEditData(prev => ({ ...prev, totalUnits: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
              <Button className="flex-1" onClick={handleUpdate}>
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              {typeInfo.icon} {typeInfo.label}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              {statusInfo.icon} {statusInfo.label}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {zoneInfo.icon} {zoneInfo.label}
            </Badge>
          </div>

          {/* Author & Source */}
          {item.author && (
            <p className="text-sm text-muted-foreground">👤 {item.author}</p>
          )}
          {item.source && (
            <p className="text-sm text-muted-foreground">📍 {item.source}</p>
          )}

          {/* URL */}
          {item.url && (
            <Button
              variant="outline"
              className="w-full gap-1"
              onClick={() => window.open(item.url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Открыть источник
            </Button>
          )}

          {/* Progress */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Прогресс</p>
                <p className="text-lg font-bold text-primary">
                  {formatProgress(item) || 'Не указан'}
                </p>
              </div>
              {item.totalUnits && item.totalUnits > 0 && (
                <Progress value={progress} className="h-2" />
              )}
              {item.totalUnits && item.totalUnits > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="number"
                    className="flex-1"
                    placeholder="Обновить прогресс"
                    value={editData.currentUnits}
                    onChange={(e) => setEditData(prev => ({ ...prev, currentUnits: parseInt(e.target.value) || 0 }))}
                  />
                  <Button size="sm" onClick={handleUpdate}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {item.description && (
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Notes section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium flex items-center gap-1">
              <StickyNote className="w-4 h-4" />
              Заметки ({item.links?.length || 0})
            </p>
          </div>
          
          {/* Existing notes */}
          {item.links && item.links.length > 0 && (
            <div className="space-y-2">
              {item.links.map(link => (
                <div
                  key={link.id}
                  className="text-sm bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setScreen('notes')}
                >
                  <p className="line-clamp-2">{link.fragment || 'Заметка'}</p>
                </div>
              ))}
            </div>
          )}

          {/* New note input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Добавить заметку..."
              className="min-h-[60px] resize-none"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={handleCreateNote}
              disabled={!newNoteText.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium flex items-center gap-1">
              <ListTodo className="w-4 h-4" />
              Дела ({item.tasks?.length || 0})
            </p>
          </div>
          
          {/* Existing tasks */}
          {item.tasks && item.tasks.length > 0 && (
            <div className="space-y-2">
              {item.tasks.map(task => (
                <div
                  key={task.id}
                  className="text-sm bg-muted/30 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => setScreen('tasks')}
                >
                  {task.status === 'done' ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded border" />
                  )}
                  <p className="line-clamp-1 flex-1">{task.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* New task input */}
          <div className="flex gap-2">
            <Input
              placeholder="Добавить дело..."
              className="flex-1"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskText.trim()) {
                  handleCreateTask()
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={handleCreateTask}
              disabled={!newTaskText.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rituals section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Ритуалы ({item.rituals?.length || 0})
            </p>
          </div>
          
          {/* Existing rituals */}
          {item.rituals && item.rituals.length > 0 && (
            <div className="space-y-2">
              {item.rituals.map(ritual => (
                <div
                  key={ritual.id}
                  className="text-sm bg-muted/30 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => setScreen('rituals')}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <p className="line-clamp-1 flex-1">{ritual.title}</p>
                  <Badge variant={ritual.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {ritual.status === 'active' ? 'Активен' : 'Архив'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Create ritual button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={openRitualModal}
          >
            <Sparkles className="w-4 h-4" />
            Создать ритуал
          </Button>
        </CardContent>
      </Card>

      {/* Delete button */}
      <Button
        variant="destructive"
        className="w-full gap-1"
        onClick={handleDelete}
      >
        <Trash2 className="w-4 h-4" />
        Удалить контент
      </Button>

      {/* Ritual Creation Modal */}
      <Dialog open={showRitualModal} onOpenChange={setShowRitualModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать ритуал</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={ritualTitle}
                onChange={(e) => setRitualTitle(e.target.value)}
                placeholder="Название ритуала"
              />
            </div>
            <div className="space-y-2">
              <Label>Цель</Label>
              <Input
                value={ritualGoal}
                onChange={(e) => setRitualGoal(e.target.value)}
                placeholder="Краткая цель"
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
              <p>📊 Категория: Обучение</p>
              <p>📅 Дни: каждый день</p>
              <p>⏰ Время: любое</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRitualModal(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateRitual}
                disabled={!ritualTitle.trim() || isCreatingRitual}
              >
                {isCreatingRitual ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
