'use client'

import { Input } from '@/app/components/ui/input'
import { MdOutlineSearch } from 'react-icons/md'

interface SearchInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

/**
 * Reusable controlled SearchInput component.
 * Fully decoupled from global state – use per-module/local state.
 */
const SearchInput = ({ value, onChange, placeholder }: SearchInputProps) => {
  return (
    <div className="relative w-full">
      <MdOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder}
        className="pl-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default SearchInput
