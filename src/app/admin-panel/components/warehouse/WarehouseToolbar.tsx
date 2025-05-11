'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import Link from 'next/link'
import { useState } from 'react'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { LiaHistorySolid } from 'react-icons/lia'
import { MdAdd } from 'react-icons/md'
import TechnicianStockSheet from './TechnicianStockSheet'
import AddModal from './add/AddModal'
import IssueModal from './issue/IssueModal'
import ReturnModal from './return/ReturnModal'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

/**
 * WarehouseToolbar:
 * - Top action panel for warehouse: delivery, issue, return, technician stock, and history.
 */
const WarehouseToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isIssueModalOpen, setIssueModalOpen] = useState(false)
  const [isReturnModalOpen, setReturnModalOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left side: actions and grouped buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-center md:justify-none">
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

        {/* Grouped extra actions */}
        <div className="flex items-center gap-2 ml-8">
          <TechnicianStockSheet />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/admin-panel/warehouse/history">
                  <Button
                    variant="ghost"
                    className="p-2"
                    aria-label="Historia magazynu"
                  >
                    <LiaHistorySolid className="!w-6 !h-6 text-muted-foreground" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-white">
                <p>Sprawdź całą historię</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search field */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj urządzenie lub materiał"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* Modals */}
      <AddModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />
      <IssueModal
        open={isIssueModalOpen}
        onCloseAction={() => setIssueModalOpen(false)}
      />
      <ReturnModal
        open={isReturnModalOpen}
        onCloseAction={() => setReturnModalOpen(false)}
      />
    </div>
  )
}

export default WarehouseToolbar
