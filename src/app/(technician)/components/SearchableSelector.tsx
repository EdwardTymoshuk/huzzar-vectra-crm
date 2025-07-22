'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

type Option = {
  label: string
  value: string
}

interface Props {
  options: Option[]
  value: string | null
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

/**
 * SearchableSelector is a custom combobox-style selector component
 * designed for use inside modals and dialogs (without portals).
 *
 * Features:
 * - Shows the selected option in a button (single line, truncated).
 * - Clicking the button opens a searchable dropdown.
 * - User can filter options by typing (search input is always at the top).
 * - Options in the dropdown wrap to multiple lines if too long.
 */
const SearchableSelector = ({
  options,
  value,
  onChange,
  placeholder = 'Wyszukaj...',
  className,
}: Props) => {
  // State for dropdown visibility and search input
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Ref for container to handle clicks outside (closes the dropdown)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resolve label of currently selected value (single line, truncate)
  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? 'Wybierz...'

  /**
   * Filter options based on the search term (case-insensitive substring match).
   */
  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(lower))
  }, [search, options])

  /**
   * Effect: Close dropdown when clicking outside the component.
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      className={cn('relative w-full min-w-0', className)}
      ref={containerRef}
    >
      {/* Selector button (shows selected label, always single line with ellipsis) */}
      <Button
        variant="outline"
        className="w-full max-w-full min-w-0 flex items-center gap-2 overflow-hidden"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span className="truncate flex-1 min-w-0 text-left">
          {selectedLabel}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </Button>

      {/* Dropdown with search input and option list */}
      {open && (
        <div className="absolute my-2 w-full z-50 bg-background border rounded shadow max-h-64 overflow-auto min-w-0">
          {/* Search input (always at the top, autofocused) */}
          <div className="sticky top-0 z-10 bg-background p-2 border-b min-w-0">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full min-w-0"
              autoFocus
            />
          </div>
          {/* Option list */}
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <div
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setSearch('')
                }}
                className={cn(
                  'px-3 py-2 text-sm z-10 cursor-pointer hover:bg-muted',
                  o.value === value && 'bg-muted/50 font-medium'
                )}
              >
                {/* Option label (wraps onto multiple lines if too long) */}
                <span className="block min-w-0 whitespace-normal break-words">
                  {o.label}
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-muted-foreground text-sm">
              Brak wyników
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchableSelector
