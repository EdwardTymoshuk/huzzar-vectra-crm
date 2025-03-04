'use client'

import { createContext, useContext, useState } from 'react'

/**
 * Context to manage order search functionality across components.
 */
interface OrdersSearchContextType {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

// Create context with default values
const OrdersSearchContext = createContext<OrdersSearchContextType | undefined>(
  undefined
)

/**
 * OrdersSearchProvider component:
 * - Provides the search state to its children.
 */
export const OrdersSearchProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <OrdersSearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </OrdersSearchContext.Provider>
  )
}

/**
 * Custom hook to access the OrdersSearchContext
 */
export const useOrdersSearch = () => {
  const context = useContext(OrdersSearchContext)
  if (!context) {
    throw new Error(
      'useOrdersSearch must be used within an OrdersSearchProvider'
    )
  }
  return context
}
