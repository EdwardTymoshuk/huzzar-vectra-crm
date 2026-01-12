'use client'

import { Card } from '@/app/components/ui/card'
import { PlatformModule } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { MdKeyboardArrowRight } from 'react-icons/md'
import { Separator } from '../ui/separator'

/**
 * ModuleCard
 * --------------------------------------------------------------
 * Vertical platform-style card with clear hover CTA overlay.
 */
export default function ModuleCard({ module }: { module: PlatformModule }) {
  const Icon = module.icon

  const content = (
    <Card
      className={cn(
        'group relative flex h-64 min-w-48 md:max-w-60 flex-col items-center justify-center mx-auto overflow-hidden border-2 transition-all',
        module.enabled
          ? 'hover:border-primary hover:shadow-lg hover:scale-[1.02] cursor-pointer'
          : 'opacity-60 cursor-not-allowed grayscale'
      )}
    >
      {/* Main content */}
      <div className="flex flex-1 items-center justify-center">
        {' '}
        <Icon className="h-20 w-20 text-primary" />
      </div>

      <Separator className="w-3/4" />

      <div className="w-full px-4 py-4 text-center">
        <h3 className="text-base font-semibold uppercase tracking-wide">
          {module.name}
        </h3>
      </div>

      {/* Hover CTA overlay */}
      {module.enabled && (
        <div
          className="
            pointer-events-none
            absolute inset-x-0 bottom-0
            flex items-center justify-center gap-2
            bg-background/95 backdrop-blur
            py-4 text-sm font-medium text-primary
            opacity-0 translate-y-2
            transition-all duration-200
            group-hover:opacity-100 group-hover:translate-y-0 border-none
          "
        >
          Przejdź do {module.name}
          <MdKeyboardArrowRight className="h-4 w-4" />
        </div>
      )}

      {/* Disabled badge */}
      {!module.enabled && (
        <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />W przygotowaniu
        </div>
      )}
    </Card>
  )

  if (!module.enabled || !module.href) return content

  return <Link href={module.href}>{content}</Link>
}
