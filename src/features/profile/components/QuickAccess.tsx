'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Target,
  Flame,
  Heart,
  Wallet,
  StickyNote,
  BookOpen,
  Calendar,
  Star,
  Download,
  ChevronRight,
  BarChart3,
  MapPin
} from 'lucide-react'
import { QUICK_ACCESS_ITEMS } from '../constants'
import type { Screen } from '@/lib/store'

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Flame,
  Heart,
  Wallet,
  StickyNote,
  BookOpen,
  Calendar,
  Star,
  Download,
  BarChart3,
  MapPin,
}

interface QuickAccessProps {
  onNavigate: (screen: Screen) => void
}

export function QuickAccess({ onNavigate }: QuickAccessProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Быстрый доступ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {QUICK_ACCESS_ITEMS.map(({ screen, label, icon, color }) => {
          const IconComponent = ICON_MAP[icon]
          return (
            <button
              key={screen}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => onNavigate(screen as Screen)}
            >
              <div className="flex items-center gap-3">
                {IconComponent && <IconComponent className={`w-5 h-5 ${color}`} />}
                <span className="font-medium">{label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
