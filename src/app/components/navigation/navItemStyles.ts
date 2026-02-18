import { cn } from '@/lib/utils'

const topNavBase =
  'relative rounded-md border border-transparent px-3 py-2 text-sm after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity'

const mobileNavBase =
  'relative flex h-full min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-none border-t border-transparent px-1 pb-2 pt-1 text-xs font-medium leading-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-inset focus-visible:ring-offset-0 after:absolute after:left-3 after:right-3 after:top-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity'

export const getTopNavItemClass = (isActive: boolean) =>
  cn(
    topNavBase,
    isActive
      ? 'bg-background/10 text-secondary-foreground after:opacity-100'
      : 'text-secondary-foreground/90 hover:bg-background/5 hover:text-secondary-foreground'
  )

export const getMobileNavItemClass = (isActive: boolean) =>
  cn(
    mobileNavBase,
    isActive
      ? 'bg-background/10 text-secondary-foreground after:opacity-100'
      : 'text-secondary-foreground/80 hover:bg-background/5 hover:text-secondary-foreground'
  )

export const getSettingsNavItemClass = (isActive: boolean) =>
  cn(
    'w-full justify-start border border-transparent',
    isActive
      ? 'bg-primary text-primary-foreground font-medium'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  )
