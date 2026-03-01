'use client'

import {
  useCallback,
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type PlanningTab = 'planning' | 'assignments'

interface PlanningContextShape {
  activeTab: PlanningTab
  setActiveTab: (tab: PlanningTab) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const PlanningContext = createContext<PlanningContextShape | null>(null)

const parsePlanningTab = (value: string | null): PlanningTab =>
  value === 'assignments' ? 'assignments' : 'planning'

/**
 * PlanningProvider – global state for planner page (tab, date, search, actions)
 */
export const PlanningProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTabState] = useState<PlanningTab>(
    parsePlanningTab(searchParams.get('plannerTab'))
  )
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    const tabFromUrl = parsePlanningTab(searchParams.get('plannerTab'))
    setActiveTabState((prev) => (prev === tabFromUrl ? prev : tabFromUrl))
  }, [searchParams])

  const setActiveTab = useCallback(
    (tab: PlanningTab) => {
      setActiveTabState(tab)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'planning') {
        params.delete('plannerTab')
      } else {
        params.set('plannerTab', tab)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      selectedDate,
      setSelectedDate,
      searchTerm,
      setSearchTerm,
    }),
    [activeTab, selectedDate, searchTerm]
  )

  return (
    <PlanningContext.Provider value={value}>
      {children}
    </PlanningContext.Provider>
  )
}

export const usePlanningContext = (): PlanningContextShape => {
  const ctx = useContext(PlanningContext)
  if (!ctx)
    throw new Error('usePlanningContext must be used within <PlanningProvider>')
  return ctx
}
