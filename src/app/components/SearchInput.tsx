'use client'

import { Input } from '@/app/components/ui/input'
import { cn } from '@/lib/utils'
import { MdOutlineSearch } from 'react-icons/md'

interface SearchInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

/**
 * Reusable controlled SearchInput component.
 * Fully decoupled from global state – use per-module/local state.
 * Supports optional external className override.
 */
const SearchInput = ({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) => {
  return (
    <div className={cn('relative w-full', className)}>
      <MdOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder ?? 'Szukaj'}
        className="pl-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default SearchInput
