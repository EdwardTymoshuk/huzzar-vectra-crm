'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddEmployeeDialog from '../components/employees/AddEmployeeDialog'
import EmployeesList from '../components/employees/EmployeesList'
/**
 * EmployeesPage component:
 * - Displays a list of employees with search functionality.
 * - Allows adding new employees via a modal form.
 */
const EmployeesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState<boolean>(false)

  return (
    <MaxWidthWrapper>
      <PageHeader title="Pracownicy" />

      {/* Top Panel: Add Button & Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="success" onClick={() => setIsAddEmployeeOpen(true)}>
            <MdAdd className="" />
            Dodaj
          </Button>
        </div>
        <div className="w-full sm:w-1/2 lg:w-1/4 ">
          <SearchInput
            placeholder="Szukaj pracownika"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Employees List */}
      <EmployeesList searchTerm={searchTerm} />

      {/* Add Employee Modal */}
      <AddEmployeeDialog
        open={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
      />
    </MaxWidthWrapper>
  )
}

export default EmployeesPage
