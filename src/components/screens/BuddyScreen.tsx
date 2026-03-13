'use client'

import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Search,
  ArrowLeft,
  UserPlus,
  Check,
  X,
  Clock,
  UserCheck,
  UserX,
  Flame,
  Target,
  Loader2
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface UserProfile {
  id: string
  name: string
  photoUrl?: string
  username?: string
  streak: number
  day: number
}

interface BuddyRequest {
  id: string
  partnerId: string
  partnerName: string
  partnerPhoto?: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export function BuddyScreen() {
  const { user, setScreen } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<BuddyRequest[]>([])
  const [incomingRequests, setIncomingRequests] = useState<BuddyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'incoming' | 'my'>('users')

  // Load users and buddy data
  useEffect(() => {
    if (!user?.id) return
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      // Load all users
      const usersRes = await fetch(`/api/users?userId=${user.id}`)
      const usersData = await usersRes.json()
      setUsers(usersData.users || [])

      // Load buddy data
      const buddiesRes = await fetch(`/api/buddies?userId=${user.id}`)
      const buddiesData = await buddiesRes.json()
      setOutgoingRequests(buddiesData.buddies || [])
      setIncomingRequests(buddiesData.incoming || [])
    } catch (error) {
      showErrorToast(error, 'load buddy data')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase()
    return users.filter(u => 
      u.name.toLowerCase().includes(query) || 
      (u.username && u.username.toLowerCase().includes(query))
    )
  }, [users, searchQuery])

  // Get accepted buddies (my partners)
  const acceptedBuddies = outgoingRequests.filter(b => b.status === 'accepted')

  // Send buddy request
  const handleSendRequest = async (partner: UserProfile) => {
    if (!user?.id || !isOnline()) return
    setSendingTo(partner.id)
    try {
      const res = await fetch('/api/buddies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerPhoto: partner.photoUrl
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        if (data.error?.includes('already exists')) {
          showSuccessToast('Запрос уже отправлен')
        } else {
          throw new Error(data.error || 'Failed to send request')
        }
      } else {
        showSuccessToast(`Запрос отправлен ${partner.name}`)
        // Refresh buddy data
        await loadData()
      }
    } catch (error) {
      showErrorToast(error, 'send request')
    } finally {
      setSendingTo(null)
    }
  }

  // Accept incoming request
  const handleAcceptRequest = async (request: BuddyRequest) => {
    if (!user?.id || !isOnline()) return
    try {
      await fetch('/api/buddies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddyId: request.id,
          status: 'accepted',
          currentUserId: user.id
        })
      })
      showSuccessToast(`${request.partnerName} теперь ваш бадди!`)
      await loadData()
    } catch (error) {
      showErrorToast(error, 'accept request')
    }
  }

  // Reject incoming request
  const handleRejectRequest = async (request: BuddyRequest) => {
    if (!user?.id || !isOnline()) return
    try {
      await fetch('/api/buddies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddyId: request.id,
          status: 'rejected',
          currentUserId: user.id
        })
      })
      showSuccessToast('Запрос отклонён')
      await loadData()
    } catch (error) {
      showErrorToast(error, 'reject request')
    }
  }

  // Check if user already has a request sent
  const getRequestStatus = (partnerId: string) => {
    const outgoing = outgoingRequests.find(b => b.partnerId === partnerId)
    if (outgoing) return outgoing.status
    const incoming = incomingRequests.find(b => b.partnerId === partnerId)
    if (incoming) return `incoming_${incoming.id}` as const
    return null
  }

  // Pending incoming count
  const pendingIncomingCount = incomingRequests.filter(b => b.status === 'pending').length

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setScreen('profile')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Бадди</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          size="sm"
          className={activeTab === 'users' ? 'bg-primary' : ''}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-4 h-4 mr-1" />
          Все
        </Button>
        <Button
          variant={activeTab === 'incoming' ? 'default' : 'outline'}
          size="sm"
          className={activeTab === 'incoming' ? 'bg-primary' : ''}
          onClick={() => setActiveTab('incoming')}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Запросы
          {pendingIncomingCount > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {pendingIncomingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'my' ? 'default' : 'outline'}
          size="sm"
          className={activeTab === 'my' ? 'bg-primary' : ''}
          onClick={() => setActiveTab('my')}
        >
          <UserCheck className="w-4 h-4 mr-1" />
          Мои ({acceptedBuddies.length})
        </Button>
      </div>

      {/* Search (only on users tab) */}
      {activeTab === 'users' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск пользователей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeTab === 'users' ? (
        // All users list
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Пользователи не найдены' : 'Нет других пользователей'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map(u => {
              const status = getRequestStatus(u.id)
              return (
                <Card key={u.id} className="bg-card/50 backdrop-blur">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={u.photoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {u.name[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{u.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {u.username && <span>@{u.username}</span>}
                          <Badge variant="secondary" className="text-xs">
                            <Flame className="w-3 h-3 mr-0.5 text-orange-400" />
                            {u.streak}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            День {u.day}
                          </Badge>
                        </div>
                      </div>
                      {status === 'accepted' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <Check className="w-3 h-3 mr-1" />
                          Бадди
                        </Badge>
                      ) : status === 'pending' ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Отправлено
                        </Badge>
                      ) : status === 'rejected' ? (
                        <Badge variant="outline" className="border-red-500 text-red-400">
                          <X className="w-3 h-3 mr-1" />
                          Отклонено
                        </Badge>
                      ) : status?.startsWith('incoming_') ? (
                        <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                          Хочет стать бадди
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-primary"
                          onClick={() => handleSendRequest(u)}
                          disabled={sendingTo === u.id}
                        >
                          {sendingTo === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Пригласить
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      ) : activeTab === 'incoming' ? (
        // Incoming requests
        <div className="space-y-3">
          {incomingRequests.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="py-8 text-center">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Нет входящих запросов</p>
              </CardContent>
            </Card>
          ) : (
            incomingRequests.map(request => (
              <Card key={request.id} className="bg-card/50 backdrop-blur">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={request.partnerPhoto} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {request.partnerName[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{request.partnerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.status === 'pending' ? 'Хочет стать вашим бадди' :
                         request.status === 'accepted' ? '🤝 Ваш бадди' : '❌ Отклонено'}
                      </p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRejectRequest(request)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => handleAcceptRequest(request)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // My buddies
        <div className="space-y-3">
          {acceptedBuddies.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="py-8 text-center">
                <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-3">У вас пока нет бадди</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('users')}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Найти бадди
                </Button>
              </CardContent>
            </Card>
          ) : (
            acceptedBuddies.map(buddy => (
              <Card key={buddy.id} className="bg-card/50 backdrop-blur border-emerald-500/30">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-2 border-emerald-500/50">
                      <AvatarImage src={buddy.partnerPhoto} />
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xl">
                        {buddy.partnerName[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{buddy.partnerName}</p>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <Check className="w-3 h-3 mr-1" />
                        Ваш бадди
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">С {new Date(buddy.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Что такое бадди?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Бадди — это партнёр по отчётности. Вы можете делиться прогрессом, 
                поддерживать друг друга и следить за выполнением целей вместе.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
