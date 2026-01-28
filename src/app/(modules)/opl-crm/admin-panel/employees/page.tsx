'use client'

import UnauthorizedPage from '@/app/components/UnauthorizedPage'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import EmployeesHeaderBar from '../components/employees/OplEmployeesHeaderBar'
import EmployeesTable from '../components/employees/OplEmployeesTable'

/**
 * OplEmployeesPage (Admin)
 * --------------------------------------------------
 * - xl+: header button to add employee
 * - <xl: floating button
 * - Tabs for active / archived workers
 */
const OplEmployeesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { isWarehouseman, isLoading } = useRole()
  if (isLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      {/* Header */}
      <EmployeesHeaderBar searchTerm={searchTerm} onSearch={setSearchTerm} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4">
        <Tabs defaultValue="active" className="w-full mt-2">
          <div className="w-full flex justify-center mb-2">
            <TabsList className="w-full md:w-1/2 lg:w-1/4 justify-center">
              <TabsTrigger value="active" className="w-full">
                Aktywni
              </TabsTrigger>
              <TabsTrigger value="archived" className="w-full">
                Zarchiwizowani
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-2">
            <EmployeesTable searchTerm={searchTerm} status="ACTIVE" />
          </TabsContent>

          <TabsContent value="archived" className="space-y-2">
            <EmployeesTable searchTerm={searchTerm} status="INACTIVE" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default OplEmployeesPage
