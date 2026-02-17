'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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

/**
 * PlanningProvider – global state for planner page (tab, date, search, actions)
 */
export const PlanningProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<PlanningTab>('planning')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState<string>('')

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
