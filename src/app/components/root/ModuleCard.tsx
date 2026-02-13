'use client'

import { Card } from '@/app/components/ui/card'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { MdKeyboardArrowRight } from 'react-icons/md'
import LoaderSpinner from '../LoaderSpinner'
import { Separator } from '../ui/separator'

type Props = {
  module: {
    code: string
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    enabled: boolean
  }
}

/**
 * ModuleCard
 * --------------------------------------------------------------
 * Hover + click-persistent CTA card.
 * After click, card stays in "hovered" state until navigation.
 */
const ModuleCard = ({ module }: Props) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const Icon = module.icon

  /** hover OR loading */
  const isActive = isHovered || isLoading

  const card = (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isLoading && setIsHovered(false)}
      className={cn(
        'relative mx-auto flex h-64 w-60 flex-col items-center justify-center overflow-hidden border-2 transition-all',
        module.enabled
          ? 'cursor-pointer'
          : 'cursor-not-allowed opacity-60 grayscale',
        isActive && module.enabled
          ? 'border-primary shadow-lg scale-[1.02]'
          : 'border-border'
      )}
    >
      {/* Icon */}
      <div className="flex flex-1 items-center justify-center">
        <Icon className="h-20 w-20 text-primary" />
      </div>

      <Separator className="w-3/4" />

      <div className="w-full px-4 py-4 text-center">
        <h3 className="text-base font-semibold uppercase tracking-wide">
          {module.name}
        </h3>
      </div>

      {/* CTA overlay */}
      {module.enabled && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-background/95 backdrop-blur py-4 text-sm font-medium text-primary transition-all duration-200',
            isActive
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none'
          )}
        >
          {isLoading ? (
            <LoaderSpinner className="mt-[-20px]" />
          ) : (
            <>
              Przejdź do {module.name}
              <MdKeyboardArrowRight className="h-4 w-4" />
            </>
          )}
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

  if (!module.enabled || !module.href) return card

  return (
    <Link
      href={module.href}
      onClick={() => setIsLoading(true)}
      className="block"
    >
      {card}
    </Link>
  )
}

export default ModuleCard
