'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  StickyNote,
  Send,
  Link2,
  Calendar,
  Filter,
  Trash2,
  Edit3,
  Sparkles,
  ListTodo,
  Target,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ArrowRight,
  CheckCircle2
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NOTE_TYPES, NOTE_ZONES, getNoteTypeInfo, getNoteZoneInfo, parseReframeData, serializeReframeData, ReframeData, ReframeAction, getReframePreview, countLinkedActions } from '@/lib/notes-config'
import { ReframeForm } from '@/components/ReframeForm'
import { cn } from '@/lib/utils'

interface NoteLink {
  id: string
  entity: string
  entityId: string
  fragment: string | null
  entityDetails?: {
    type: 'task' | 'ritual' | 'chain'
    text?: string
    title?: string
    chain?: { id: string; title: string } | null
    status?: string
  }
}

interface Note {
  id: string
  text: string
  type: string
  zone: string
  date: string
  createdAt: string
  links: NoteLink[]
}

export function NotesScreen() {
  const { user, setScreen } = useAppStore()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [quickNote, setQuickNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeZone, setActiveZone] = useState('all')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState('')
  const [editZone, setEditZone] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // Chain step modal state
  const [showChainModal, setShowChainModal] = useState(false)
  const [activeChains, setActiveChains] = useState<{ id: string; title: string }[]>([])
  const [selectedChainId, setSelectedChainId] = useState<string>('')
  const [chainStepText, setChainStepText] = useState('')
  const [isLoadingChains, setIsLoadingChains] = useState(false)
  
  // Reframe modal state
  const [showReframeModal, setShowReframeModal] = useState(false)
  const [reframeEditData, setReframeEditData] = useState<ReframeData | undefined>()
  const [reframeEditZone, setReframeEditZone] = useState<string>('general')
  const [isSavingReframe, setIsSavingReframe] = useState(false)
  
  // Reframe detail state
  const [reframeDetailData, setReframeDetailData] = useState<ReframeData | null>(null)
  const [reframeActionIndex, setReframeActionIndex] = useState<number | null>(null)

  // Load notes
  const loadNotes = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        type: activeFilter,
        zone: activeZone,
      })
      const response = await fetch(`/api/notes?${params}`)
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, activeFilter, activeZone])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Quick save note
  const handleQuickSave = async () => {
    if (!user?.id || !quickNote.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: quickNote.trim(),
          type: 'thought',
          zone: 'general',
        })
      })
      const data = await response.json()
      if (data.note) {
        setNotes(prev => [data.note, ...prev])
        setQuickNote('')
      }
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete note
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== id))
      setShowDetail(false)
      setSelectedNote(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  // Update note
  const handleUpdate = async () => {
    if (!selectedNote) return
    try {
      const response = await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedNote.id,
          text: editText,
          type: editType,
          zone: editZone,
        })
      })
      const data = await response.json()
      if (data.note) {
        setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n))
        setSelectedNote(data.note)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  // Create task from note
  const handleCreateTask = async () => {
    if (!selectedNote || !user?.id) return
    try {
      const response = await fetch('/api/notes/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: 'task',
          createEntity: true,
          fragment: selectedNote.text.substring(0, 100),
          entityData: {
            userId: user.id,
            text: selectedNote.text.substring(0, 200),
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        // Refresh notes to show the link
        loadNotes()
        setShowDetail(false)
        // Navigate to tasks
        setScreen('tasks')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Create ritual from note
  const handleCreateRitual = async () => {
    if (!selectedNote || !user?.id) return
    try {
      const response = await fetch('/api/notes/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: 'ritual',
          createEntity: true,
          fragment: selectedNote.text.substring(0, 100),
          entityData: {
            userId: user.id,
            title: selectedNote.text.substring(0, 100),
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        loadNotes()
        setShowDetail(false)
        setScreen('rituals')
      }
    } catch (error) {
      console.error('Failed to create ritual:', error)
    }
  }

  // Load active chains for the modal
  const loadActiveChains = async () => {
    if (!user?.id) return
    setIsLoadingChains(true)
    try {
      const response = await fetch(`/api/chains?userId=${user.id}&status=active`)
      const data = await response.json()
      setActiveChains(data.chains || [])
      if (data.chains?.length > 0) {
        setSelectedChainId(data.chains[0].id)
      }
    } catch (error) {
      console.error('Failed to load chains:', error)
    } finally {
      setIsLoadingChains(false)
    }
  }

  // Open chain step modal
  const openChainModal = () => {
    setChainStepText(selectedNote?.text.substring(0, 200) || '')
    setShowDetail(false)
    setShowChainModal(true)
    loadActiveChains()
  }

  // Create chain step from note or reframe action
  const handleCreateChainStep = async () => {
    if (!user?.id || !selectedChainId || !chainStepText.trim()) return
    try {
      const response = await fetch('/api/notes/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: selectedNote?.id,
          entity: 'task',
          createEntity: true,
          fragment: chainStepText.substring(0, 100),
          entityData: {
            userId: user.id,
            text: chainStepText,
            chainId: selectedChainId,
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        // If this was from a reframe action, update the linked entity
        if (reframeActionIndex !== null && reframeDetailData) {
          const updatedActions = [...reframeDetailData.actions]
          updatedActions[reframeActionIndex] = {
            ...updatedActions[reframeActionIndex],
            linkedEntity: { type: 'chainStep', id: data.entityId }
          }
          const updatedData = { ...reframeDetailData, actions: updatedActions }
          
          await fetch('/api/notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: selectedNote?.id,
              text: serializeReframeData(updatedData),
            })
          })
          setReframeDetailData(updatedData)
          setReframeActionIndex(null)
        }
        
        loadNotes()
        setShowChainModal(false)
        setSelectedChainId('')
        setChainStepText('')
        setScreen('tasks')
      }
    } catch (error) {
      console.error('Failed to create chain step:', error)
    }
  }

  // Open reframe modal for new note
  const openNewReframeModal = () => {
    setReframeEditData(undefined)
    setReframeEditZone('general')
    setShowReframeModal(true)
  }

  // Open reframe modal for editing
  const openEditReframeModal = (note: Note) => {
    const data = parseReframeData(note.text)
    if (data) {
      setReframeEditData(data)
      setReframeEditZone(note.zone)
      setSelectedNote(note)
      setShowDetail(false)
      setShowReframeModal(true)
    }
  }

  // Save reframe note
  const handleSaveReframe = async (data: ReframeData, zone: string) => {
    if (!user?.id) return
    setIsSavingReframe(true)
    try {
      if (selectedNote && reframeEditData) {
        // Update existing
        const response = await fetch('/api/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedNote.id,
            text: serializeReframeData(data),
            zone,
          })
        })
        const result = await response.json()
        if (result.note) {
          setNotes(prev => prev.map(n => n.id === result.note.id ? result.note : n))
          setShowReframeModal(false)
          setSelectedNote(null)
          setReframeEditData(undefined)
        }
      } else {
        // Create new
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            text: serializeReframeData(data),
            type: 'reframe',
            zone,
          })
        })
        const result = await response.json()
        if (result.note) {
          setNotes(prev => [result.note, ...prev])
          setShowReframeModal(false)
        }
      }
    } catch (error) {
      console.error('Failed to save reframe:', error)
    } finally {
      setIsSavingReframe(false)
    }
  }

  // Create task from reframe action
  const handleCreateTaskFromAction = async (actionIndex: number) => {
    if (!selectedNote || !user?.id || !reframeDetailData) return
    const action = reframeDetailData.actions[actionIndex]
    if (!action.text.trim()) return
    
    try {
      const response = await fetch('/api/notes/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: 'task',
          createEntity: true,
          fragment: action.text.substring(0, 100),
          entityData: {
            userId: user.id,
            text: action.text,
            zone: selectedNote.zone,
          }
        })
      })
      const data = await response.json()
      if (data.link) {
        // Update reframe data with linked entity
        const updatedActions = [...reframeDetailData.actions]
        updatedActions[actionIndex] = {
          ...action,
          linkedEntity: { type: 'task', id: data.entityId }
        }
        const updatedData = { ...reframeDetailData, actions: updatedActions }
        
        // Update note text
        await fetch('/api/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedNote.id,
            text: serializeReframeData(updatedData),
          })
        })
        
        setReframeDetailData(updatedData)
        loadNotes()
      }
    } catch (error) {
      console.error('Failed to create task from action:', error)
    }
  }

  // Open chain modal for action
  const openChainModalForAction = (actionIndex: number) => {
    if (!reframeDetailData) return
    setReframeActionIndex(actionIndex)
    setChainStepText(reframeDetailData.actions[actionIndex].text)
    setShowDetail(false)
    setShowChainModal(true)
    loadActiveChains()
  }

  // Create ritual from reframe action
  const handleCreateRitualFromAction = async (actionIndex: number) => {
    if (!selectedNote || !user?.id || !reframeDetailData) return
    const action = reframeDetailData.actions[actionIndex]
    if (!action.text.trim()) return
    
    try {
      const response = await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: action.text.substring(0, 100),
          type: 'regular',
          category: 'productivity',
          days: [1, 2, 3, 4, 5, 6, 7],
          timeWindow: 'any',
          goalShort: `Из рефрейминга: ${reframeDetailData.newView.substring(0, 50)}`,
        })
      })
      const data = await response.json()
      if (data.ritual) {
        // Update reframe data with linked entity
        const updatedActions = [...reframeDetailData.actions]
        updatedActions[actionIndex] = {
          ...action,
          linkedEntity: { type: 'ritual', id: data.ritual.id }
        }
        const updatedData = { ...reframeDetailData, actions: updatedActions }
        
        // Update note text
        await fetch('/api/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedNote.id,
            text: serializeReframeData(updatedData),
          })
        })
        
        setReframeDetailData(updatedData)
        loadNotes()
      }
    } catch (error) {
      console.error('Failed to create ritual from action:', error)
    }
  }

  // Open note detail
  const openNoteDetail = (note: Note) => {
    setSelectedNote(note)
    setEditText(note.text)
    setEditType(note.type)
    setEditZone(note.zone)
    setIsEditing(false)
    
    // Parse reframe data if applicable
    if (note.type === 'reframe') {
      const data = parseReframeData(note.text)
      setReframeDetailData(data)
    } else {
      setReframeDetailData(null)
    }
    
    setShowDetail(true)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Сегодня'
    } else if (days === 1) {
      return 'Вчера'
    } else if (days < 7) {
      return `${days} дн. назад`
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }
  }

  // Get preview text
  const getPreviewText = (text: string, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Заметки</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {notes.length} заметок
        </Badge>
      </div>

      {/* Quick input */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Написать заметку..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="min-h-[60px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleQuickSave()
                }
              }}
            />
            <div className="flex flex-col gap-1 shrink-0 self-end">
              <Button
                size="icon"
                onClick={handleQuickSave}
                disabled={!quickNote.trim() || isSaving}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 flex-1"
              onClick={openNewReframeModal}
            >
              <RefreshCw className="w-4 h-4" />
              Рефрейминг
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          size="sm"
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('all')}
          className="shrink-0"
        >
          Все
        </Button>
        {NOTE_TYPES.map(type => (
          <Button
            key={type.id}
            size="sm"
            variant={activeFilter === type.id ? 'default' : 'outline'}
            onClick={() => setActiveFilter(type.id)}
            className="shrink-0 gap-1"
          >
            <span>{type.icon}</span>
            {type.label}
          </Button>
        ))}
      </div>

      {/* Zone filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          size="sm"
          variant={activeZone === 'all' ? 'secondary' : 'ghost'}
          onClick={() => setActiveZone('all')}
          className="shrink-0 text-xs"
        >
          Все зоны
        </Button>
        {NOTE_ZONES.map(zone => (
          <Button
            key={zone.id}
            size="sm"
            variant={activeZone === zone.id ? 'secondary' : 'ghost'}
            onClick={() => setActiveZone(zone.id)}
            className="shrink-0 text-xs gap-1"
          >
            <span>{zone.icon}</span>
            {zone.label}
          </Button>
        ))}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Загрузка...
        </div>
      ) : notes.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <StickyNote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Нет заметок</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Напиши первую заметку выше
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map(note => {
            const typeInfo = getNoteTypeInfo(note.type)
            const zoneInfo = getNoteZoneInfo(note.zone)
            const hasLinks = note.links && note.links.length > 0
            
            // Check if this is a reframe note
            const isReframe = note.type === 'reframe'
            const reframeData = isReframe ? parseReframeData(note.text) : null

            // For reframe notes, show special card
            if (isReframe && reframeData) {
              const preview = getReframePreview(reframeData)
              const linkedCount = countLinkedActions(reframeData)
              
              return (
                <Card
                  key={note.id}
                  className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors border-primary/20"
                  onClick={() => openNoteDetail(note)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-lg shrink-0 mt-0.5">
                        🔄
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="text-destructive">&quot;{preview.oldThought}&quot;</span>
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          <span className="text-emerald-600">&quot;{preview.newView}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {zoneInfo.icon} {zoneInfo.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            📋 {reframeData.actions.filter(a => a.text.trim()).length} действ.
                          </Badge>
                          {linkedCount > 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              {linkedCount} связей
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            openEditReframeModal(note)
                          }}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(note.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            // Regular note card
            return (
              <Card
                key={note.id}
                className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
                onClick={() => openNoteDetail(note)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="text-lg shrink-0 mt-0.5">
                      {typeInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">
                        {getPreviewText(note.text)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {zoneInfo.icon} {zoneInfo.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(note.createdAt)}
                        </span>
                        {hasLinks && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                            <Link2 className="w-3 h-3" />
                            {note.links.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          openNoteDetail(note)
                        }}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(note.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Note Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? 'Редактирование' : 'Заметка'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {isEditing ? (
              <>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[150px]"
                />
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Тип</label>
                  <div className="flex flex-wrap gap-2">
                    {NOTE_TYPES.map(type => (
                      <Button
                        key={type.id}
                        size="sm"
                        variant={editType === type.id ? 'default' : 'outline'}
                        onClick={() => setEditType(type.id)}
                        className="gap-1"
                      >
                        {type.icon} {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Зона</label>
                  <div className="flex flex-wrap gap-2">
                    {NOTE_ZONES.map(zone => (
                      <Button
                        key={zone.id}
                        size="sm"
                        variant={editZone === zone.id ? 'secondary' : 'outline'}
                        onClick={() => setEditZone(zone.id)}
                        className="gap-1"
                      >
                        {zone.icon} {zone.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Note content - different for reframe type */}
                {selectedNote?.type === 'reframe' && reframeDetailData ? (
                  <>
                    {/* Reframe specific view */}
                    {reframeDetailData.situation && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Ситуация</p>
                        <div className="text-sm bg-muted/30 rounded-lg p-3">
                          {reframeDetailData.situation}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <p className="text-xs text-destructive">Старая мысль</p>
                      <div className="text-sm bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                        {reframeDetailData.oldThought}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600">Новый взгляд</p>
                      <div className="text-sm bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                        {reframeDetailData.newView}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {reframeDetailData.actions.filter(a => a.text.trim()).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Действия</p>
                        {reframeDetailData.actions.filter(a => a.text.trim()).map((action, index) => (
                          <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              {action.linkedEntity?.id ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm flex-1">{action.text}</span>
                            </div>
                            {!action.linkedEntity?.id && (
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-6"
                                  onClick={() => handleCreateTaskFromAction(reframeDetailData.actions.findIndex(a => a.text === action.text))}
                                >
                                  <ListTodo className="w-3 h-3 mr-1" />
                                  Дело
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-6"
                                  onClick={() => openChainModalForAction(reframeDetailData.actions.findIndex(a => a.text === action.text))}
                                >
                                  <Target className="w-3 h-3 mr-1" />
                                  В цепочку
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-6"
                                  onClick={() => handleCreateRitualFromAction(reframeDetailData.actions.findIndex(a => a.text === action.text))}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Ритуал
                                </Button>
                              </div>
                            )}
                            {action.linkedEntity?.id && (
                              <Badge variant="secondary" className="text-[10px]">
                                {action.linkedEntity.type === 'task' && '✓ Дело создано'}
                                {action.linkedEntity.type === 'chainStep' && '✓ Шаг цепочки создан'}
                                {action.linkedEntity.type === 'ritual' && '✓ Ритуал создан'}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Regular note text */
                  <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                    {selectedNote?.text}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    {getNoteTypeInfo(selectedNote?.type || '').icon}
                    {getNoteTypeInfo(selectedNote?.type || '').label}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    {getNoteZoneInfo(selectedNote?.zone || '').icon}
                    {getNoteZoneInfo(selectedNote?.zone || '').label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(selectedNote?.createdAt || '')}
                  </span>
                </div>

                {/* Links */}
                {selectedNote?.links && selectedNote.links.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Link2 className="w-4 h-4" />
                      Связи
                    </div>
                    {selectedNote.links.map(link => {
                      // Determine display text based on entity and chain
                      let displayText = ''
                      let Icon = ListTodo
                      let iconColor = 'text-primary'
                      
                      if (link.entity === 'task') {
                        if (link.entityDetails?.chain) {
                          // Task is a chain step
                          displayText = `Шаг цепочки: ${link.entityDetails.chain.title}`
                          Icon = Target
                          iconColor = 'text-emerald-500'
                        } else {
                          displayText = 'Дело'
                          Icon = ListTodo
                          iconColor = 'text-primary'
                        }
                      } else if (link.entity === 'ritual') {
                        displayText = link.entityDetails?.title || 'Ритуал'
                        Icon = Sparkles
                        iconColor = 'text-amber-500'
                      } else if (link.entity === 'chain') {
                        displayText = link.entityDetails?.title || 'Цепочка'
                        Icon = Target
                        iconColor = 'text-emerald-500'
                      }
                      
                      return (
                        <div
                          key={link.id}
                          className="text-sm bg-muted/30 rounded-lg p-2 flex items-center gap-2"
                        >
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                          <span>{displayText}</span>
                          {link.fragment && !link.entityDetails?.chain && (
                            <span className="text-muted-foreground text-xs truncate">
                              &quot;{link.fragment.substring(0, 30)}...&quot;
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Создать из заметки:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={handleCreateTask}
                    >
                      <ListTodo className="w-4 h-4" />
                      Дело
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={openChainModal}
                    >
                      <Target className="w-4 h-4" />
                      Шаг в цепочку
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={handleCreateRitual}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ритуал
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Отмена
                </Button>
                <Button className="flex-1" onClick={handleUpdate}>
                  Сохранить
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 gap-1" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4" />
                  Изменить
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1"
                  onClick={() => selectedNote && handleDelete(selectedNote.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chain Step Modal */}
      <Dialog open={showChainModal} onOpenChange={setShowChainModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить шаг в цепочку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {isLoadingChains ? (
              <p className="text-center text-muted-foreground py-4">Загрузка цепочек...</p>
            ) : activeChains.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Нет активных цепочек</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setShowChainModal(false)
                    setScreen('create-chain')
                  }}
                >
                  Создать цепочку
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Выбрать цепочку</Label>
                  <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите цепочку" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeChains.map(chain => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Текст шага</Label>
                  <Textarea
                    value={chainStepText}
                    onChange={(e) => setChainStepText(e.target.value)}
                    placeholder="Текст нового шага..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowChainModal(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateChainStep}
                    disabled={!selectedChainId || !chainStepText.trim()}
                  >
                    Создать
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reframe Modal */}
      <Dialog open={showReframeModal} onOpenChange={setShowReframeModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reframeEditData ? 'Редактировать рефрейминг' : 'Новый рефрейминг'}</DialogTitle>
          </DialogHeader>
          <ReframeForm
            initialData={reframeEditData}
            initialZone={reframeEditZone}
            onSubmit={handleSaveReframe}
            onCancel={() => {
              setShowReframeModal(false)
              setReframeEditData(undefined)
              setSelectedNote(null)
            }}
            isLoading={isSavingReframe}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
