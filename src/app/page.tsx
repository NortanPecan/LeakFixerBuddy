'use client'

import { useEffect } from 'react'
import { useAppStore, Screen } from '@/lib/store'
import { BottomNav } from '@/components/BottomNav'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { FitnessScreen } from '@/components/screens/FitnessScreen'
import { GymScreen } from '@/components/screens/GymScreen'
import { RitualsScreen } from '@/components/screens/RitualsScreen'
import { CreateRitualScreen } from '@/components/screens/CreateRitualScreen'
import { CatalogScreen } from '@/components/screens/CatalogScreen'
import { ProfileScreen } from '@/components/screens/ProfileScreen'
import { TasksScreen } from '@/components/screens/TasksScreen'
import { ChainDetailScreen } from '@/components/screens/ChainDetailScreen'
import { CreateTaskScreen } from '@/components/screens/CreateTaskScreen'
import { CreateChainScreen } from '@/components/screens/CreateChainScreen'
import { NotesScreen } from '@/components/screens/NotesScreen'
import { DevelopmentScreen } from '@/components/screens/DevelopmentScreen'
import { ContentDetailScreen } from '@/components/screens/ContentDetailScreen'
import { FinanceScreen } from '@/components/screens/FinanceScreen'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// Screens that show bottom nav
const MAIN_SCREENS: Screen[] = ['home', 'fitness', 'rituals', 'gym', 'profile', 'tasks', 'notes', 'development', 'finance']

// Screen router component
function ScreenRouter({ screen, contentId }: { screen: Screen; contentId?: string | null }) {
  switch (screen) {
    case 'home':
      return <HomeScreen />
    case 'fitness':
      return <FitnessScreen />
    case 'rituals':
      return <RitualsScreen />
    case 'gym':
      return <GymScreen />
    case 'profile':
      return <ProfileScreen />
    case 'tasks':
      return <TasksScreen />
    case 'chain':
      return <ChainDetailScreen />
    case 'create-task':
      return <CreateTaskScreen />
    case 'create-chain':
      return <CreateChainScreen />
    case 'create-ritual':
      return <CreateRitualScreen />
    case 'catalog':
      return <CatalogScreen />
    case 'notes':
      return <NotesScreen />
    case 'development':
      return <DevelopmentScreen />
    case 'content-detail':
      return <ContentDetailScreen contentId={contentId || undefined} />
    case 'finance':
      return <FinanceScreen />
    case 'all-rituals':
      return <AllRitualsScreen />
    default:
      return <HomeScreen />
  }
}

// Simple All Rituals screen
function AllRitualsScreen() {
  const { setScreen } = useAppStore()
  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Все ритуалы</h1>
        <Button variant="outline" onClick={() => setScreen('rituals')}>Назад</Button>
      </div>
      <p className="text-muted-foreground">Список всех ритуалов...</p>
    </div>
  )
}

export default function Home() {
  const {
    currentScreen,
    selectedContentId,
    isInitialized,
    isLoading,
    login,
    setIsLoading
  } = useAppStore()

  useEffect(() => {
    const initApp = async () => {
      if (isInitialized) return

      setIsLoading(true)

      // Initialize Telegram WebApp if available
      if (typeof window !== 'undefined') {
        const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; initData?: string } } }).Telegram
        if (tg?.WebApp) {
          tg.WebApp.ready?.()
          tg.WebApp.expand?.()
        }
      }

      // Login (will fall back to demo if not in Telegram)
      const isTelegram = typeof window !== 'undefined' && 
        !!(window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData

      await login(!isTelegram)

      setIsLoading(false)
    }

    initApp()
  }, [isInitialized, login, setIsLoading])

  if (!isInitialized || isLoading) {
    return <LoadingScreen />
  }

  const showBottomNav = MAIN_SCREENS.includes(currentScreen)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-4">
        <ScreenRouter screen={currentScreen} contentId={selectedContentId} />
      </div>
      {showBottomNav && <BottomNav />}
    </main>
  )
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-muted" />
            <Skeleton className="h-4 w-32 bg-muted" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12 rounded-full bg-muted" />
            <Skeleton className="h-6 w-12 rounded-full bg-muted" />
          </div>
        </div>

        {/* Progress skeleton */}
        <Skeleton className="h-2 w-full bg-muted" />

        {/* Main card skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl bg-muted" />
            <Skeleton className="h-24 rounded-xl bg-muted" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl bg-muted" />
        </div>

        {/* Loading text */}
        <p className="text-center text-muted-foreground text-sm animate-pulse">
          Загрузка LeakFixer...
        </p>
      </div>
    </main>
  )
}
