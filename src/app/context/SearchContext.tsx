'use client'

import { createContext, useContext, useState } from 'react'

/**
 * Context to manage search functionality across components.
 */
interface SearchContextType {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

// Create context with default values
const SearchContext = createContext<SearchContextType | undefined>(undefined)

/**
 * SearchProvider component:
 * - Provides the search state to its children.
 */
export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  )
}

/**
 * Custom hook to access the SearchContext
 */
export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within an SearchProvider')
  }
  return context
}
