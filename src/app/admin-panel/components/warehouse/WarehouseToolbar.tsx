'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useSearch } from '@/app/context/SearchContext'
import { useState } from 'react'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd } from 'react-icons/md'
import AddModal from './AddModal'

/**
 * WarehouseToolbar component:
 * - Contains top action buttons with a responsive layout.
 * - Uses a universal SearchInput component for filtering.
 */
const WarehouseToolbar = () => {
  // Local state to manage search term
  const { setSearchTerm } = useSearch()

  // Local state controlling modal visibility
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isIssueModalOpen, setIssueModalOpen] = useState(false)
  const [isReturnModalOpen, setReturnModalOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAddModalOpen(true)} variant="success">
          <MdAdd />
          <span className="hidden lg:inline">Dostawa</span>
        </Button>

        <Button onClick={() => setIssueModalOpen(true)} variant="warning">
          <HiOutlineArrowUpOnSquare />
          <span className="hidden lg:inline">Wydaj</span>
        </Button>

        <Button onClick={() => setReturnModalOpen(true)} variant="danger">
          <HiOutlineArrowDownOnSquare />
          <span className="hidden lg:inline">Zwrot</span>
        </Button>
      </div>

      {/* Search input field */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj urządzenie lub materiał"
          onSearch={setSearchTerm}
        />
      </div>

      {/* Add (Delivery) Modal */}
      <AddModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />

      {/* Issue Modal */}
      {/* <IssueModal
        open={isIssueModalOpen}
        onCloseAction={() => setIssueModalOpen(false)}
      /> */}

      {/* Return Modal */}
      {/* <ReturnModal
        open={isReturnModalOpen}
        onCloseAction={() => setReturnModalOpen(false)}
      /> */}
    </div>
  )
}

export default WarehouseToolbar
