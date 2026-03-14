'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Palette,
  MapPin
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'

interface Zone {
  id: string
  key: string
  name: string
  emoji: string | null
  color: string | null
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

// Emoji picker options
const EMOJI_OPTIONS = ['🔧', '🤖', '♠️', '💪', '🏠', '💰', '📦', '🎯', '📚', '🎮', '✈️', '🚗', '🎵', '🎨', '💼', '🏖️', '⚡', '🌟', '🔥', '💎']

// Color options
const COLOR_OPTIONS = [
  '#4a5568', '#6366f1', '#059669', '#dc2626', '#f59e0b', 
  '#10b981', '#6b7280', '#8b5cf6', '#ec4899', '#0ea5e9'
]

export function ZonesScreen() {
  const { user } = useAppStore()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  
  // New zone form
  const [newZone, setNewZone] = useState({
    key: '',
    name: '',
    emoji: '📁',
    color: '#6b7280'
  })

  // Load zones
  useEffect(() => {
    const loadZones = async () => {
      if (!user?.id) return
      
      if (!isOnline()) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const res = await fetch(`/api/zones?userId=${user.id}`)
        const data = await res.json()
        if (data.success) {
          setZones(data.zones)
        }
      } catch (err) {
        showErrorToast(err, 'загрузка зон')
      } finally {
        setLoading(false)
      }
    }
    
    loadZones()
  }, [user?.id])

  // Create zone
  const handleCreateZone = async () => {
    if (!user?.id || !newZone.key || !newZone.name || saving) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          key: newZone.key,
          name: newZone.name,
          emoji: newZone.emoji,
          color: newZone.color,
          sortOrder: zones.length
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        showErrorToast(new Error(data.error), 'создание зоны')
        return
      }
      
      setZones(prev => [...prev, data.zone])
      setShowAddDialog(false)
      setNewZone({ key: '', name: '', emoji: '📁', color: '#6b7280' })
      showSuccessToast('Зона создана')
    } catch (err) {
      showErrorToast(err, 'создание зоны')
    } finally {
      setSaving(false)
    }
  }

  // Update zone
  const handleUpdateZone = async () => {
    if (!editingZone || saving) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingZone)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        showErrorToast(new Error(data.error), 'обновление зоны')
        return
      }
      
      setZones(prev => prev.map(z => z.id === editingZone.id ? data.zone : z))
      setEditingZone(null)
      showSuccessToast('Зона обновлена')
    } catch (err) {
      showErrorToast(err, 'обновление зоны')
    } finally {
      setSaving(false)
    }
  }

  // Toggle zone active status
  const handleToggleActive = async (zone: Zone) => {
    try {
      const res = await fetch('/api/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zone.id, isActive: !zone.isActive })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        showErrorToast(new Error(data.error), 'изменение зоны')
        return
      }
      
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z))
    } catch (err) {
      showErrorToast(err, 'изменение зоны')
    }
  }

  // Delete zone
  const handleDeleteZone = async (zone: Zone) => {
    if (zone.isDefault) {
      showErrorToast(new Error('Нельзя удалить стандартную зону'), 'удаление зоны')
      return
    }
    
    if (!confirm(`Удалить зону "${zone.name}"?`)) return
    
    try {
      const res = await fetch(`/api/zones?id=${zone.id}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        showErrorToast(new Error(data.error), 'удаление зоны')
        return
      }
      
      setZones(prev => prev.filter(z => z.id !== zone.id))
      showSuccessToast('Зона удалена')
    } catch (err) {
      showErrorToast(err, 'удаление зоны')
    }
  }

  // Generate key from name
  const handleNameChange = (name: string) => {
    const key = name.toLowerCase()
      .replace(/[^a-z0-9а-яё\s]/gi, '')
      .replace(/\s+/g, '_')
      .replace(/[а-яё]/gi, '')
      .substring(0, 20)
    setNewZone(prev => ({ ...prev, name, key }))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Зоны</h1>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Загрузка...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Зоны</h1>
        <Button size="sm" className="bg-primary" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Зона
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Зоны — это области вашей жизни для организации задач, финансов, вызовов и контента. 
            Стандартные зоны можно скрыть, но нельзя удалить.
          </p>
        </CardContent>
      </Card>

      {/* Zones List */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Активные зоны
            <Badge variant="outline">{zones.filter(z => z.isActive).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {zones.filter(z => z.isActive).length > 0 ? (
            <div className="space-y-2">
              {zones.filter(z => z.isActive).map(zone => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{zone.emoji || '📁'}</span>
                    <div>
                      <p className="font-medium">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">{zone.key}</p>
                    </div>
                    {zone.isDefault && (
                      <Badge variant="outline" className="text-xs">Стандарт</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: zone.color || '#6b7280' }}
                    />
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => setEditingZone(zone)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {!zone.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteZone(zone)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Нет активных зон
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Zones */}
      {zones.filter(z => !z.isActive).length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Скрытые зоны
              <Badge variant="outline" className="ml-2">{zones.filter(z => !z.isActive).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zones.filter(z => !z.isActive).map(zone => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 group opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{zone.emoji || '📁'}</span>
                    <div>
                      <p className="font-medium">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">{zone.key}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(zone)}
                  >
                    Показать
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Zone Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая зона</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Здоровье"
                value={newZone.name}
                onChange={e => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ключ (латиница)</Label>
              <Input
                placeholder="health"
                value={newZone.key}
                onChange={e => setNewZone(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={newZone.emoji === emoji ? 'default' : 'outline'}
                    size="sm"
                    className="text-xl h-9 w-9 p-0"
                    onClick={() => setNewZone(prev => ({ ...prev, emoji }))}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <Button
                    key={color}
                    type="button"
                    variant={newZone.color === color ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    style={{ backgroundColor: color }}
                    onClick={() => setNewZone(prev => ({ ...prev, color }))}
                  >
                    {newZone.color === color && '✓'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary" 
                onClick={handleCreateZone}
                disabled={!newZone.name || !newZone.key || saving}
              >
                {saving ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog */}
      <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать зону</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editingZone?.name || ''}
                onChange={e => setEditingZone(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            {editingZone && !editingZone.isDefault && (
              <div className="space-y-2">
                <Label>Ключ</Label>
                <Input
                  value={editingZone?.key || ''}
                  onChange={e => setEditingZone(prev => prev ? { ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') } : null)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={editingZone?.emoji === emoji ? 'default' : 'outline'}
                    size="sm"
                    className="text-xl h-9 w-9 p-0"
                    onClick={() => setEditingZone(prev => prev ? { ...prev, emoji } : null)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <Button
                    key={color}
                    type="button"
                    variant={editingZone?.color === color ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    style={{ backgroundColor: color }}
                    onClick={() => setEditingZone(prev => prev ? { ...prev, color } : null)}
                  >
                    {editingZone?.color === color && '✓'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Показывать в списках</Label>
              <Switch
                checked={editingZone?.isActive ?? true}
                onCheckedChange={checked => setEditingZone(prev => prev ? { ...prev, isActive: checked } : null)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingZone(null)}>
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary" 
                onClick={handleUpdateZone}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
