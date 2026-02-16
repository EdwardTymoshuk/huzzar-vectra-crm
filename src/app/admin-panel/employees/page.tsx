'use client'

import FloatingActionMenu from '@/app/components/shared/FloatingActionMenu'
import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import AddUserDialog from '@/app/components/shared/users/AddUserDialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import EmployeesHeaderBar from '../components/employees/EmployeesHeaderBar'
import EmployeesTable from '../components/employees/EmployeesTable'

/**
 * EmployeesPage (Admin)
 * --------------------------------------------------
 * - xl+: header button to add employee
 * - <xl: floating button
 * - Tabs for active / archived workers
 */
const EmployeesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { isWarehouseman, isLoading } = useRole()
  if (isLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      {/* Header */}
      <EmployeesHeaderBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        onAdd={() => setIsAddDialogOpen(true)}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4">
        <Tabs defaultValue="active" className="w-full mt-2">
          <div className="w-full flex justify-center mb-2">
            <TabsList className="w-full md:w-2/3 lg:w-1/3 justify-center">
              <TabsTrigger value="active" className="w-full">
                Aktywni
              </TabsTrigger>
              <TabsTrigger value="blocked" className="w-full">
                Zablokowani
              </TabsTrigger>
              <TabsTrigger value="archived" className="w-full">
                Zarchiwizowani
              </TabsTrigger>
            </TabsList>
          </div>

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

      {/* Floating button for <xl */}
      <div className="xl:hidden">
        <FloatingActionMenu
          actions={[
            {
              label: 'Dodaj pracownika',
              icon: <MdAdd className="text-xl" />,
              colorClass: 'bg-success hover:bg-success/90',
              onClick: () => setIsAddDialogOpen(true),
            },
          ]}
          mainIcon={<MdAdd className="text-3xl" />}
          mainTooltip="Dodaj pracownika"
        />
      </div>

      {/* Dialog */}
      {isAddDialogOpen && (
        <AddUserDialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          defaultRole="TECHNICIAN"
        />
      )}
    </div>
  )
}

export default EmployeesPage
