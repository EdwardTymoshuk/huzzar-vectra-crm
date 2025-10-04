'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import SearchInput from '@/app/components/shared/SearchInput'
import UnauthorizedPage from '@/app/components/shared/UnauthorizedPage'
import AddUserDialog from '@/app/components/shared/users/AddUserDialog'
import { Button } from '@/app/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import EmployeesTable from '../components/employees/EmployeesTable'

const EmployeesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return null
  if (isWarehouseman) return <UnauthorizedPage />

  return (
    <MaxWidthWrapper>
      <PageHeader title="Pracownicy" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 my-4">
        <Button variant="success" onClick={() => setIsAddDialogOpen(true)}>
          <MdAdd className="mr-2" />
          Dodaj pracownika
        </Button>
        <SearchInput
          className="w-full sm:w-1/2 lg:w-1/3"
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Szukaj pracownika"
        />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="w-full flex justify-center">
          <TabsList className="w-full md:w-1/2 lg:w-1/4 justify-center">
            <TabsTrigger value="active" className="w-full">
              Aktywni
            </TabsTrigger>
            <TabsTrigger value="archived" className="w-full">
              Zarchiwizowani
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active">
          <EmployeesTable searchTerm={searchTerm} status="ACTIVE" />
        </TabsContent>
        <TabsContent value="archived">
          <EmployeesTable searchTerm={searchTerm} status="INACTIVE" />
        </TabsContent>
      </Tabs>

      {isAddDialogOpen && (
        <AddUserDialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          defaultRole="TECHNICIAN"
        />
      )}
    </MaxWidthWrapper>
  )
}

export default EmployeesPage
