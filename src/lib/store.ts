import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Navigation state
export type Screen = 'home' | 'fitness' | 'rituals' | 'gym' | 'profile' | 'create-ritual' | 'catalog' | 'all-rituals' | 'tasks' | 'chain' | 'create-task' | 'create-chain' | 'notes' | 'note-detail' | 'development' | 'content-detail' | 'finance' | 'challenges' | 'challenge-detail'

interface User {
  id: string
  telegramId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  language: string
  day: number
  streak: number
  points: number
}

interface UserProfile {
  weight?: number
  height?: number
  age?: number
  targetWeight?: number
  workProfile?: string
  waterBaseline?: number
  // Body measurements
  waist?: number
  hips?: number
  chest?: number
  bicep?: number
  thigh?: number
}

interface GlobalState {
  mood: number // 1-10
  energy: number // 1-10
  trend: number // change from yesterday
  status: string
}

interface DailyData {
  water: { current: number; target: number }
  calories: { eaten: number; burned: number; target: number }
  activities: unknown[]
  foods: unknown[]
  mood?: number
  energy?: number
}

interface Buddy {
  id: string
  partnerId: string
  partnerName: string
  partnerPhoto?: string
  status: 'pending' | 'accepted' | 'rejected'
}

interface GymPeriod {
  id: string
  name: string
  type: string
  cycleLength: number
  workoutsPerCycle: number
  totalCycles: number
  currentCycle: number
  currentDay: number
  isActive: boolean
}

interface AppState {
  // Navigation
  currentScreen: Screen
  setScreen: (screen: Screen) => void
  selectedContentId: string | null
  setSelectedContentId: (id: string | null) => void

  // User
  user: User | null
  profile: UserProfile | null
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void

  // Global state (mood widget)
  globalState: GlobalState | null
  setGlobalState: (state: GlobalState) => void

  // Daily data cache
  dailyData: Record<string, DailyData>
  setDailyData: (date: string, data: DailyData) => void

  // Buddies
  buddies: Buddy[]
  setBuddies: (buddies: Buddy[]) => void

  // Gym
  activeGymPeriod: GymPeriod | null
  setActiveGymPeriod: (period: GymPeriod | null) => void

  // Demo mode
  isDemoMode: boolean
  setDemoMode: (demo: boolean) => void

  // Loading
  isLoading: boolean
  isInitialized: boolean
  setIsLoading: (loading: boolean) => void
  setIsInitialized: (initialized: boolean) => void

  // Actions
  login: (isDemo?: boolean) => Promise<boolean>
  logout: () => void
  updateProgress: (day?: number, streak?: number, points?: number) => Promise<void>
  updateGlobalState: (mood: number, energy: number) => Promise<void>
  loadDailyData: (date: string) => Promise<DailyData | null>
  saveWater: (date: string, ml: number) => Promise<void>
}

// Mood status helper
function getMoodStatus(mood: number): { status: string; color: string } {
  if (mood >= 9) return { status: 'Пиковое состояние! 🚀', color: '#fcd34d' }
  if (mood >= 7) return { status: 'Хороший тон, есть ресурс', color: '#34d399' }
  if (mood >= 5) return { status: 'Нормально, можно лучше', color: '#60a5fa' }
  if (mood >= 3) return { status: 'Низкий ресурс, береги силы', color: '#fb923c' }
  return { status: 'Кризис, нужна поддержка', color: '#f87171' }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentScreen: 'home',
      setScreen: (screen) => set({ currentScreen: screen }),
      selectedContentId: null,
      setSelectedContentId: (id) => set({ selectedContentId: id }),

      // User
      user: null,
      profile: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),

      // Global state
      globalState: null,
      setGlobalState: (state) => set({ globalState: state }),

      // Daily data
      dailyData: {},
      setDailyData: (date, data) => set((state) => ({
        dailyData: { ...state.dailyData, [date]: data }
      })),

      // Buddies
      buddies: [],
      setBuddies: (buddies) => set({ buddies }),

      // Gym
      activeGymPeriod: null,
      setActiveGymPeriod: (period) => set({ activeGymPeriod: period }),

      // Demo mode
      isDemoMode: false,
      setDemoMode: (demo) => set({ isDemoMode: demo }),

      // Loading
      isLoading: false,
      isInitialized: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsInitialized: (initialized) => set({ isInitialized: initialized }),

      // Login
      login: async (isDemo = false) => {
        set({ isLoading: true })

        try {
          const endpoint = isDemo ? '/api/auth?demo=true' : '/api/auth'
          let response: Response

          if (isDemo) {
            response = await fetch(endpoint)
          } else {
            const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
            const initData = tg?.WebApp?.initData

            if (!initData) {
              return get().login(true)
            }

            response = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData })
            })
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Auth failed')
          }

          const data = await response.json()

          // Calculate global state from daily state
          let globalState: GlobalState | null = null
          if (data.globalState) {
            const moodStatus = getMoodStatus(data.globalState.mood)
            globalState = {
              mood: data.globalState.mood,
              energy: data.globalState.energy || 5,
              trend: data.globalState.trend || 0,
              status: moodStatus.status
            }
          }

          set({
            user: data.user,
            profile: data.profile,
            globalState,
            isDemoMode: data.isDemo || false,
            isInitialized: true,
            isLoading: false
          })

          return true
        } catch (error) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          profile: null,
          globalState: null,
          dailyData: {},
          buddies: [],
          activeGymPeriod: null,
          isDemoMode: false,
          isInitialized: false
        })
      },

      // Update progress
      updateProgress: async (day, streak, points) => {
        const { user } = get()
        if (!user) return

        try {
          await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, day, streak, points })
          })

          set({
            user: { ...user, day: day ?? user.day, streak: streak ?? user.streak, points: points ?? user.points }
          })
        } catch (error) {
          console.error('Update progress error:', error)
        }
      },

      // Update global state
      updateGlobalState: async (mood, energy) => {
        const { user } = get()
        if (!user) return

        const moodStatus = getMoodStatus(mood)
        const currentState = get().globalState
        const trend = currentState ? mood - currentState.mood : 0

        const newState: GlobalState = {
          mood,
          energy,
          trend,
          status: moodStatus.status
        }

        set({ globalState: newState })

        try {
          const today = new Date().toISOString().split('T')[0]
          await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, date: today, mood, energy })
          })
        } catch (error) {
          console.error('Update state error:', error)
        }
      },

      // Load daily data
      loadDailyData: async (date) => {
        const { user, setDailyData } = get()
        if (!user) return null

        try {
          const response = await fetch(`/api/fitness?userId=${user.id}&date=${date}`)
          const data = await response.json()

          if (data.data) {
            const dailyData: DailyData = {
              water: data.data.water || { current: 0, target: 2000 },
              calories: data.data.calories || { eaten: 0, burned: 0, target: 2200 },
              activities: data.data.activities || [],
              foods: data.data.foods || [],
              mood: data.data.mood,
              energy: data.data.energy
            }
            setDailyData(date, dailyData)
            return dailyData
          }
          return null
        } catch (error) {
          console.error('Load daily data error:', error)
          return null
        }
      },

      // Save water
      saveWater: async (date, ml) => {
        const { user, dailyData, setDailyData } = get()
        if (!user) return

        const current = dailyData[date] || { water: { current: 0, target: 2000 }, calories: { eaten: 0, burned: 0, target: 2200 }, activities: [], foods: [] }
        const updated = { ...current, water: { ...current.water, current: ml } }
        setDailyData(date, updated)

        try {
          await fetch('/api/fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, date, water: updated.water })
          })
        } catch (error) {
          console.error('Save water error:', error)
        }
      }
    }),
    {
      name: 'leakfixer-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        globalState: state.globalState,
        isDemoMode: state.isDemoMode,
        dailyData: state.dailyData,
        buddies: state.buddies,
        activeGymPeriod: state.activeGymPeriod,
        selectedContentId: state.selectedContentId
      })
    }
  )
)

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
            photo_url?: string
            language_code?: string
          }
        }
        close: () => void
        expand: () => void
        ready: () => void
        themeParams: Record<string, string>
        colorScheme: 'light' | 'dark'
      }
    }
  }
}
