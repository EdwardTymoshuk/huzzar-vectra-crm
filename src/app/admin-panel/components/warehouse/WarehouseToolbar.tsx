'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import Link from 'next/link'
import { useState } from 'react'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd } from 'react-icons/md'
import { PiDotsThreeOutlineVerticalFill, PiUserListFill } from 'react-icons/pi'
import { TbHistory, TbListSearch } from 'react-icons/tb'
import DeviceCheckSheet from './DeviceCheckSheet'
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
 * - Top action panel for warehouse: delivery, issue, return, plus sheets for extra tools.
 */
const WarehouseToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isIssueModalOpen, setIssueModalOpen] = useState(false)
  const [isReturnModalOpen, setReturnModalOpen] = useState(false)

  const [isStockSheetOpen, setStockSheetOpen] = useState(false)
  const [isSerialSheetOpen, setSerialSheetOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left section: core actions + dropdown */}
      <div className="flex flex-wrap gap-2 items-center">
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

        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Więcej">
              <PiDotsThreeOutlineVerticalFill className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background text-foreground border border-border shadow-md cursor-pointer !bg-opacity-100 !backdrop-blur-none">
            <DropdownMenuItem
              onClick={() => setStockSheetOpen(true)}
              className="cursor-pointer"
            >
              <PiUserListFill className="mr-2 h-4 w-4" />
              Stan technika
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setSerialSheetOpen(true)}
              className="cursor-pointer"
            >
              <TbListSearch className="mr-2 h-4 w-4" />
              Sprawdź urządzenie (SN)
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/admin-panel/warehouse/history"
                className="flex items-center"
              >
                <TbHistory className="mr-2 h-4 w-4" />
                Historia magazynu
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search input */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj urządzenie lub materiał"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* Action modals */}
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

      {/* Sheets */}
      <TechnicianStockSheet
        open={isStockSheetOpen}
        setOpen={setStockSheetOpen}
      />
      <DeviceCheckSheet
        open={isSerialSheetOpen}
        onClose={() => setSerialSheetOpen(false)}
      />
    </div>
  )
}

export default WarehouseToolbar
