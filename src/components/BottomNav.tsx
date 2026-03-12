'use client'

import { useAppStore, Screen } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Home, User, Dumbbell, Target, Flame } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'

const NAV_ITEMS: { screen: Screen; icon: typeof Home; label: string; emoji?: string }[] = [
  { screen: 'home', icon: Home, label: 'Главная', emoji: '🏠' },
  { screen: 'gym', icon: Dumbbell, label: 'GYM', emoji: '💪' },
  { screen: 'rituals', icon: Flame, label: 'Ритуалы', emoji: '🔥' },
  { screen: 'goals', icon: Target, label: 'Цели', emoji: '🎯' },
  { screen: 'profile', icon: User, label: 'Профиль', emoji: '👤' },
]

export function BottomNav() {
  const { currentScreen, setScreen } = useAppStore()
  const [pressedItem, setPressedItem] = useState<Screen | null>(null)

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        delay: 0.15
      }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Rounded container */}
      <div 
        className="mx-3 mb-2"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center justify-around gap-2 px-2 py-3">
          {NAV_ITEMS.map(({ screen, icon: Icon, label, emoji }) => {
            const isActive = currentScreen === screen
            const isPressed = pressedItem === screen
            
            return (
              <button
                key={screen}
                onClick={() => setScreen(screen)}
                onTouchStart={() => setPressedItem(screen)}
                onTouchEnd={() => setPressedItem(null)}
                onTouchCancel={() => setPressedItem(null)}
                onMouseDown={() => setPressedItem(screen)}
                onMouseUp={() => setPressedItem(null)}
                onMouseLeave={() => setPressedItem(null)}
                className={cn(
                  'relative flex flex-col items-center justify-center',
                  'w-14 h-14 rounded-2xl',
                  'transition-all duration-200 ease-out',
                  'select-none touch-manipulation',
                  isPressed && 'scale-90',
                  isActive && 'scale-105'
                )}
              >
                {/* Icon container - clean rounded */}
                <div 
                  className={cn(
                    'relative flex items-center justify-center',
                    'w-12 h-12 rounded-full',
                    'transition-all duration-200'
                  )}
                  style={{
                    background: isActive 
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.3) 100%)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: isActive 
                      ? '0 0 20px rgba(99,102,241,0.4)' 
                      : 'none',
                  }}
                >
                  {isActive && emoji ? (
                    <span className="text-xl">
                      {emoji}
                    </span>
                  ) : (
                    <Icon 
                      className={cn(
                        'w-5 h-5 transition-all duration-200',
                        isActive ? 'text-white' : 'text-white/50'
                      )}
                    />
                  )}
                </div>
                
                {/* Label */}
                <span 
                  className={cn(
                    'text-[10px] font-medium mt-0.5',
                    'transition-colors duration-200',
                    isActive ? 'text-white' : 'text-white/40'
                  )}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}
