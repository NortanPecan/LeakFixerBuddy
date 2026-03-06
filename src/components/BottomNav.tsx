'use client'

import { useAppStore, Screen } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Home, User, ListTodo, StickyNote, Wallet, Trophy, Flame } from 'lucide-react'

const NAV_ITEMS: { screen: Screen; icon: typeof Home; label: string }[] = [
  { screen: 'home', icon: Home, label: 'Главная' },
  { screen: 'tasks', icon: ListTodo, label: 'Дела' },
  { screen: 'rituals', icon: Flame, label: 'Ритуалы' },
  { screen: 'goals', icon: Trophy, label: 'Цели' },
  { screen: 'profile', icon: User, label: 'Профиль' },
]

export function BottomNav() {
  const { currentScreen, setScreen } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50">
      {/* Safe area for iOS */}
      <div className="h-16 max-w-md mx-auto px-2 pb-safe">
        <div className="flex items-center justify-around h-full">
          {NAV_ITEMS.map(({ screen, icon: Icon, label }) => {
            const isActive = currentScreen === screen
            return (
              <button
                key={screen}
                onClick={() => setScreen(screen)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
