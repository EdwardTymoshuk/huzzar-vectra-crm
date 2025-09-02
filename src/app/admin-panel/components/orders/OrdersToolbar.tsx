'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import SearchInput from '@/app/components/shared/SearchInput'
import { NavLink } from '@/app/components/shared/navigation-progress'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { useRole } from '@/utils/roleHelpers/useRole'
import { useState } from 'react'
import {
  MdAdd,
  MdCalendarMonth,
  MdDownload,
  MdUploadFile,
} from 'react-icons/md'
import AddOrderModal from './AddOrderModal'
import ImportOrdersModal from './ImportOrdersModal'
import ReportDialog from './ReportDialog'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

const OrdersToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isReportDialogOpen, setReportDialogOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)

  // Extract current user's role from session for role-based access control
  const { isAdmin, isCoordinator, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return <LoaderSpinner />
  const canManageOrders = isAdmin || isCoordinator

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* LEFT ACTIONS */}
      {canManageOrders && (
        <div className="flex flex-wrap gap-2">
          {/* ADD DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="success">
                <MdAdd />
                <span className="hidden lg:inline">Dodaj</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setAddModalOpen(true)}>
                <MdAdd />
                Dodaj ręcznie
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                <MdUploadFile />
                Wczytaj z Excela
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PLANOWANIE */}
          <NavLink href="/admin-panel/orders?tab=planning" prefetch>
            <Button variant="warning">
              <MdCalendarMonth />
              <span className="hidden lg:inline">Planowanie</span>
            </Button>
          </NavLink>

          {/* RAPORT */}
          <Button variant="default" onClick={() => setReportDialogOpen(true)}>
            <MdDownload />
            <span className="hidden lg:inline">Raport</span>
          </Button>
        </div>
      )}

      {/* SEARCH */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {canManageOrders && (
        <>
          {/* MODAL: Dodaj ręcznie */}
          <AddOrderModal
            open={isAddModalOpen}
            onCloseAction={() => setAddModalOpen(false)}
          />

          {/* DIALOG: Raport */}
          <ReportDialog
            open={isReportDialogOpen}
            onClose={() => setReportDialogOpen(false)}
          />

          <ImportOrdersModal
            open={isImportModalOpen}
            onClose={() => setImportModalOpen(false)}
          />
        </>
      )}
    </div>
  )
}

export default OrdersToolbar
