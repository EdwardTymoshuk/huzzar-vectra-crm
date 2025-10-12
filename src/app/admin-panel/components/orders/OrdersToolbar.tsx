'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import AddOrderModal from './AddOrderModal'

/**
 * OrdersToolbarManual:
 * - Toolbar for the "Orders" page.
 * - Allows manual order creation only.
 * - Keeps search input on the right side.
 */
const OrdersToolbar = ({
  searchTerm,
  setSearchTerm,
}: {
  searchTerm: string
  setSearchTerm: (value: string) => void
}) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)

  // Role-based gating for administrative actions
  const { isAdmin, isCoordinator, isLoading } = useRole()
  if (isLoading) return <LoaderSpinner />
  const canManageOrders = isAdmin || isCoordinator

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left actions: manual add only */}
      {canManageOrders && (
        <Button variant="success" onClick={() => setAddModalOpen(true)}>
          <MdAdd />
          <span className="hidden lg:inline">Dodaj ręcznie</span>
        </Button>
      )}

      {/* Right side: search input */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* Modal: manual order creation */}
      {canManageOrders && (
        <AddOrderModal
          open={isAddModalOpen}
          onCloseAction={() => setAddModalOpen(false)}
        />
      )}
    </div>
  )
}

export default OrdersToolbar
