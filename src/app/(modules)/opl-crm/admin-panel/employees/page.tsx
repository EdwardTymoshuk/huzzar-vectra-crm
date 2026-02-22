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
  const [employeesTab, setEmployeesTab] = useState<
    'active' | 'blocked' | 'archived'
  >('active')

  const { isWarehouseman, isLoading } = useRole()
  if (isLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 pb-2 overflow-hidden">
      {/* Header */}
      <EmployeesHeaderBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        centerContent={
          <Tabs
            value={employeesTab}
            onValueChange={(value) =>
              setEmployeesTab(value as 'active' | 'blocked' | 'archived')
            }
            className="shrink-0"
          >
            <TabsList className="grid h-auto grid-cols-3 gap-1 p-1 w-[360px]">
              <TabsTrigger value="active">Aktywni</TabsTrigger>
              <TabsTrigger value="blocked">Zablokowani</TabsTrigger>
              <TabsTrigger value="archived">Zarchiwizowani</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4">
        <Tabs value={employeesTab} className="w-full mt-2">

          <TabsContent value="active" className="space-y-2">
            <EmployeesTable searchTerm={searchTerm} status="ACTIVE" />
          </TabsContent>

          <TabsContent value="blocked" className="space-y-2">
            <EmployeesTable searchTerm={searchTerm} status="SUSPENDED" />
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
