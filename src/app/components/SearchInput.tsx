'use client'

import { Input } from '@/app/components/ui/input'
import { useEffect, useState } from 'react'
import { MdOutlineSearch } from 'react-icons/md'

/**
 * Universal SearchInput component:
 * - Can be used in different modules (Orders, Warehouse, Employees)
 * - Uses debounce to optimize search requests
 */
interface SearchInputProps {
  placeholder: string
  onSearch: (value: string) => void // Function to handle search input changes
}

const SearchInput: React.FC<SearchInputProps> = ({ placeholder, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Debounce logic: Delays search execution until user stops typing
  useEffect(() => {
    const delay = setTimeout(() => {
      onSearch(searchTerm)
    }, 300) // Delay of 300ms

    return () => clearTimeout(delay)
  }, [searchTerm, onSearch])

  return (
    <div className="relative w-full sm:w-1/2 lg:w-1/4">
      <MdOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder={placeholder}
        className="pl-10"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  )
}

export default SearchInput
