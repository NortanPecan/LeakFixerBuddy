'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, ExternalLink, Coffee } from 'lucide-react'
import { DONATE_URL } from '../constants'

export function DonateCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Coffee className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Поддержать проект</p>
            <p className="text-xs text-muted-foreground">Помочь развитию LeakFixer</p>
          </div>
          <Button
            variant="default"
            className="bg-primary"
            onClick={() => window.open(DONATE_URL, '_blank')}
          >
            <Heart className="w-4 h-4 mr-1" />
            Донат
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
