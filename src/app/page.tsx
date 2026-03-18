'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useAppStore, Screen } from '@/lib/store'
import { BottomNav } from '@/components/BottomNav'
import { TopNav } from '@/components/TopNav'
import { Button } from '@/components/ui/button'
import { CheckinModal } from '@/components/CheckinModal'
import { EmailAuthScreen } from '@/components/EmailAuthScreen'

// Lazy load all screens — split bundles for faster initial load
const HomeScreen = lazy(() => import('@/components/screens/HomeScreen').then(m => ({ default: m.HomeScreen })))
const FitnessScreen = lazy(() => import('@/components/screens/FitnessScreen').then(m => ({ default: m.FitnessScreen })))
const GymScreen = lazy(() => import('@/components/screens/GymScreen').then(m => ({ default: m.GymScreen })))
const RitualsScreen = lazy(() => import('@/components/screens/RitualsScreen').then(m => ({ default: m.RitualsScreen })))
const CreateRitualScreen = lazy(() => import('@/components/screens/CreateRitualScreen').then(m => ({ default: m.CreateRitualScreen })))
const CatalogScreen = lazy(() => import('@/components/screens/CatalogScreen').then(m => ({ default: m.CatalogScreen })))
const ProfileScreen = lazy(() => import('@/components/screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })))
const TasksScreen = lazy(() => import('@/components/screens/TasksScreen').then(m => ({ default: m.TasksScreen })))
const ChainDetailScreen = lazy(() => import('@/components/screens/ChainDetailScreen').then(m => ({ default: m.ChainDetailScreen })))
const CreateTaskScreen = lazy(() => import('@/components/screens/CreateTaskScreen').then(m => ({ default: m.CreateTaskScreen })))
const CreateChainScreen = lazy(() => import('@/components/screens/CreateChainScreen').then(m => ({ default: m.CreateChainScreen })))
const NotesScreen = lazy(() => import('@/components/screens/NotesScreen').then(m => ({ default: m.NotesScreen })))
const DevelopmentScreen = lazy(() => import('@/components/screens/DevelopmentScreen').then(m => ({ default: m.DevelopmentScreen })))
const ContentDetailScreen = lazy(() => import('@/components/screens/ContentDetailScreen').then(m => ({ default: m.ContentDetailScreen })))
const FinanceScreen = lazy(() => import('@/components/screens/FinanceScreen').then(m => ({ default: m.FinanceScreen })))
const ChallengesScreen = lazy(() => import('@/components/screens/ChallengesScreen').then(m => ({ default: m.ChallengesScreen })))
const ChallengeDetailScreen = lazy(() => import('@/components/screens/ChallengeDetailScreen').then(m => ({ default: m.ChallengeDetailScreen })))
const HealthScreen = lazy(() => import('@/components/screens/HealthScreen').then(m => ({ default: m.HealthScreen })))
const DailySummaryScreen = lazy(() => import('@/components/screens/DailySummaryScreen').then(m => ({ default: m.DailySummaryScreen })))
const GoalsScreen = lazy(() => import('@/components/screens/GoalsScreen').then(m => ({ default: m.GoalsScreen })))
const SkillsScreen = lazy(() => import('@/components/screens/SkillsScreen').then(m => ({ default: m.SkillsScreen })))
const TraitsScreen = lazy(() => import('@/components/screens/TraitsScreen').then(m => ({ default: m.TraitsScreen })))
const ExportScreen = lazy(() => import('@/components/screens/ExportScreen').then(m => ({ default: m.ExportScreen })))
const StatsScreen = lazy(() => import('@/components/screens/StatsScreen').then(m => ({ default: m.StatsScreen })))
const BuddyScreen = lazy(() => import('@/components/screens/BuddyScreen').then(m => ({ default: m.BuddyScreen })))
const OnboardingScreen = lazy(() => import('@/components/screens/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })))
const ZonesScreen = lazy(() => import('@/components/screens/ZonesScreen').then(m => ({ default: m.ZonesScreen })))
const AllRitualsScreen = lazy(() => import('@/components/screens/AllRitualsScreen').then(m => ({ default: m.AllRitualsScreen })))
const SettingsScreen = lazy(() => import('@/components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })))
const HabitsScreen = lazy(() => import('@/components/screens/HabitsScreen').then(m => ({ default: m.HabitsScreen })))
const WeeklyReportScreen = lazy(() => import('@/components/screens/WeeklyReportScreen').then(m => ({ default: m.WeeklyReportScreen })))
const MonthlyReportScreen = lazy(() => import('@/components/screens/MonthlyReportScreen').then(m => ({ default: m.MonthlyReportScreen })))
const CalorieGoalScreen = lazy(() => import('@/components/screens/CalorieGoalScreen').then(m => ({ default: m.CalorieGoalScreen })))
const QuickEntryFAB = lazy(() => import('@/components/QuickEntryFAB').then(m => ({ default: m.QuickEntryFAB })))

// Screens that show bottom nav
const MAIN_SCREENS: Screen[] = ['home', 'fitness', 'rituals', 'gym', 'profile', 'tasks', 'notes', 'development', 'finance', 'challenges', 'health', 'daily-summary', 'goals', 'skills', 'traits', 'export']

// Minimal fallback while screen chunks load
function ScreenFallback() {
  return (
    <div className="flex flex-col gap-4 py-6">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-32 w-full rounded-2xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      ))}
    </div>
  )
}

function ScreenRouter({ screen, contentId }: { screen: Screen; contentId?: string | null }) {
  return (
    <Suspense fallback={<ScreenFallback />}>
      {(() => {
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
          case 'goals':
            return <GoalsScreen />
          case 'skills':
            return <SkillsScreen />
          case 'traits':
            return <TraitsScreen />
          case 'export':
            return <ExportScreen />
          case 'stats':
            return <StatsScreen />
          case 'buddies':
            return <BuddyScreen />
          case 'onboarding':
            return <OnboardingScreen onComplete={() => {}} />
          case 'zones':
            return <ZonesScreen />
          case 'all-rituals':
            return <AllRitualsScreen />
          case 'settings':
            return <SettingsScreen />
          case 'habits':
            return <HabitsScreen />
          case 'weekly-report':
            return <WeeklyReportScreen />
          case 'monthly-report':
            return <MonthlyReportScreen />
          case 'calorie-goal':
            return <CalorieGoalScreen />
          case 'note-detail':
            return <NotesScreen />
          default:
            return <HomeScreen />
        }
      })()}
    </Suspense>
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

        if (typeof window !== 'undefined') {
          const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; initData?: string } } }).Telegram
          if (tg?.WebApp) {
            tg.WebApp.ready?.()
            tg.WebApp.expand?.()
          }
        }

        const urlParams = new URLSearchParams(window.location.search)
        const ownerParam = urlParams.get('owner')
        let storedMode = localStorage.getItem('leakfixer-auth-mode')

        // If Telegram SDK is present, we're inside a real MiniApp — never use cached demo mode
        const tgWebApp = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
        if (tgWebApp && storedMode === 'demo') {
          localStorage.removeItem('leakfixer-auth-mode')
          storedMode = null
        }

        let isDemo = false
        let isOwner = false

        if (ownerParam === 'true') {
          isOwner = true
          localStorage.setItem('leakfixer-auth-mode', 'owner')
        } else if (storedMode === 'owner') {
          isOwner = true
        } else if (storedMode === 'demo') {
          isDemo = true
        }

        if (ownerParam) {
          urlParams.delete('owner')
          const newUrl = urlParams.toString()
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }

        const ok = await login(isDemo, isOwner)
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
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {/* Fixed Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <div
        className="flex-1 max-w-md mx-auto px-4 w-full overflow-y-auto"
        style={{
          paddingTop: '8px',
          paddingBottom: showBottomNav ? '88px' : '24px',
        }}
      >
        <ScreenRouter screen={currentScreen} contentId={selectedContentId} />
      </div>

      {/* Fixed Bottom Navigation */}
      {showBottomNav && <BottomNav />}

      {/* Quick Entry FAB */}
      {showBottomNav && (
        <Suspense fallback={null}>
          <QuickEntryFAB />
        </Suspense>
      )}

      {/* Morning / Evening Check-in Modal */}
      <CheckinModal />
    </main>
  )
}

function AuthErrorScreen({ message }: { message: string }) {
  const { login, setIsLoading } = useAppStore()
  const [showEmail, setShowEmail] = useState(false)

  if (showEmail) {
    return <EmailAuthScreen onBack={() => setShowEmail(false)} />
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-8 space-y-4 flex-1 flex flex-col justify-center">
        <div
          className="p-6 rounded-2xl text-center"
          style={{
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="text-3xl mb-3">🔧</div>
          <h1 className="text-xl font-semibold text-white mb-1">LeakFixer</h1>
          <p className="text-sm text-white/40 break-words mb-5">{message}</p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => setShowEmail(true)}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 h-12"
            >
              Войти / Зарегистрироваться
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true)
                await login()
                setIsLoading(false)
              }}
              variant="outline"
              className="rounded-xl bg-white/5 border-white/15 text-white hover:bg-white/10 h-12"
            >
              Войти через Telegram
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setIsLoading(true)
                await login(true)
                setIsLoading(false)
              }}
              className="rounded-xl bg-white/5 border-white/10 text-white/50 hover:bg-white/10 text-sm"
            >
              Демо-режим
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-8 space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-24 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="h-4 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="h-6 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />

        <div className="space-y-4">
          <div className="h-40 w-full rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-24 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="h-32 w-full rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>

        <p className="text-center text-white/40 text-sm animate-pulse">
          LeakFixer...
        </p>
      </div>
    </main>
  )
}
