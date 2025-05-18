'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddEmployeeDialog from '../components/employees/AddEmployeeDialog'
import EmployeesTable from '../components/employees/EmployeesTable'

const EmployeesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

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

      <AddEmployeeDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </MaxWidthWrapper>
  )
}

export default EmployeesPage
