'use client'

import { useEffect, useState } from 'react'
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
import { ChallengesScreen } from '@/components/screens/ChallengesScreen'
import { ChallengeDetailScreen } from '@/components/screens/ChallengeDetailScreen'
import { HealthScreen } from '@/components/screens/HealthScreen'
import { DailySummaryScreen } from '@/components/screens/DailySummaryScreen'
import { DatePicker, DateBadge } from '@/components/DatePicker'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// Screens that show bottom nav
const MAIN_SCREENS: Screen[] = ['home', 'fitness', 'rituals', 'gym', 'profile', 'tasks', 'notes', 'development', 'finance', 'challenges', 'health', 'daily-summary']

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
    case 'challenges':
      return <ChallengesScreen />
    case 'challenge-detail':
      return <ChallengeDetailScreen />
    case 'health':
      return <HealthScreen />
    case 'daily-summary':
      return <DailySummaryScreen />
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
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const ensureTelegramSdkLoaded = async () => {
      if (typeof window === 'undefined') return

      const hasTelegram = !!(window as unknown as { Telegram?: unknown }).Telegram
      if (hasTelegram) return

      const existing = document.querySelector<HTMLScriptElement>('script[data-telegram-web-app="true"]')
      if (existing) {
        if ((window as unknown as { Telegram?: unknown }).Telegram) return
        await new Promise<void>((resolve) => {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => resolve(), { once: true })
          setTimeout(() => resolve(), 1500)
        })
        return
      }

      await new Promise<void>((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-web-app.js'
        script.async = true
        script.dataset.telegramWebApp = 'true'
        script.onload = () => resolve()
        script.onerror = () => resolve()
        document.head.appendChild(script)
        setTimeout(() => resolve(), 1500)
      })
    }

    const initApp = async () => {
      if (isInitialized) return

      setIsLoading(true)

      try {
        await ensureTelegramSdkLoaded()

        // Initialize Telegram WebApp if available
        if (typeof window !== 'undefined') {
          const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; initData?: string } } }).Telegram
          if (tg?.WebApp) {
            tg.WebApp.ready?.()
            tg.WebApp.expand?.()
          }
        }

        // Login decision is handled in store (Telegram first, demo fallback only in regular browser)
        const ok = await login()
        if (!ok && typeof window !== 'undefined') {
          const message = (window as unknown as { __leakfixerAuthError?: string }).__leakfixerAuthError
          setAuthError(message || 'Auth failed')
        } else {
          setAuthError(null)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Auth initialization failed'
        console.error('Init app error:', error)
        setAuthError(message)
      } finally {
        setIsLoading(false)
      }
    }

    initApp()
  }, [isInitialized, login, setIsLoading])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isInitialized && authError) {
    return <AuthErrorScreen message={authError} />
  }

  if (!isInitialized) {
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

function AuthErrorScreen({ message }: { message: string }) {
  const { login, setIsLoading } = useAppStore()

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <h1 className="text-xl font-semibold">Ошибка авторизации</h1>
        <p className="text-sm text-muted-foreground break-words">{message}</p>
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={async () => {
            setIsLoading(true)
            await login()
            setIsLoading(false)
          }}>
            Повторить
          </Button>
          <Button variant="outline" onClick={async () => {
            setIsLoading(true)
            await login(true)
            setIsLoading(false)
          }}>
            Войти как демо
          </Button>
        </div>
      </div>
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
