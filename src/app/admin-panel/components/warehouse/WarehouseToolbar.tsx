'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { NavLink } from '@/app/components/shared/navigation-progress'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { useState } from 'react'
import { CgArrowsExchangeAlt } from 'react-icons/cg'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd, MdUploadFile } from 'react-icons/md'
import { PiDotsThreeOutlineVerticalFill, PiUserListFill } from 'react-icons/pi'
import { TbHistory, TbListSearch } from 'react-icons/tb'
import TechnicianStockSheet from './TechnicianStockSheet'
import AddModal from './add/AddModal'
import ImportDevicesModal from './add/ImportDevicesModal'
import DeviceCheckSheet from './deviceCheck/DeviceCheckSheet'
import IssueModal from './issue/IssueModal'
import ReturnModal from './return/ReturnModal'
import LocationTransferModal from './warehouseLocalizations/LocationTransferModal'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

/**
 * WarehouseToolbar
 * ------------------------------------------------------
 * Top toolbar for warehouse operations.
 * Provides access to delivery (manual/import), issue, return, stock check,
 * device verification, and history. Uses sheets and modals for clean UX.
 */
const WarehouseToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)
  const [isIssueModalOpen, setIssueModalOpen] = useState(false)
  const [isReturnModalOpen, setReturnModalOpen] = useState(false)
  const [isTransferModalOpen, setTransferModalOpen] = useState(false)
  const [isStockSheetOpen, setStockSheetOpen] = useState(false)
  const [isSerialSheetOpen, setSerialSheetOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left section: main actions + dropdown */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Dropdown for delivery options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="success">
              <MdAdd />
              <span className="hidden lg:inline">Dostawa</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background text-foreground border border-border shadow-md cursor-pointer">
            <DropdownMenuItem
              onClick={() => setAddModalOpen(true)}
              className="cursor-pointer"
            >
              <MdAdd className="mr-2 h-4 w-4" />
              Dodaj ręcznie
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setImportModalOpen(true)}
              className="cursor-pointer"
            >
              <MdUploadFile className="mr-2 h-4 w-4" />
              Wczytaj z Excela
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Issue and Return buttons */}
        <Button onClick={() => setIssueModalOpen(true)} variant="warning">
          <HiOutlineArrowUpOnSquare />
          <span className="hidden lg:inline">Wydaj</span>
        </Button>

        <Button onClick={() => setReturnModalOpen(true)} variant="destructive">
          <HiOutlineArrowDownOnSquare />
          <span className="hidden lg:inline">Zwrot</span>
        </Button>

        {/* Additional tools dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Więcej">
              <PiDotsThreeOutlineVerticalFill className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background text-foreground border border-border shadow-md cursor-pointer">
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
              <NavLink
                href="/admin-panel/warehouse/history"
                className="flex items-center"
                prefetch
              >
                <TbHistory className="mr-2 h-4 w-4" />
                Historia magazynu
              </NavLink>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTransferModalOpen(true)}
              className="cursor-pointer"
            >
              <CgArrowsExchangeAlt className="mr-2 h-4 w-4" />
              Przekazanie między oddziałami
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right section: search bar */}
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
      <ImportDevicesModal
        open={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <IssueModal
        open={isIssueModalOpen}
        onCloseAction={() => setIssueModalOpen(false)}
      />
      <ReturnModal
        open={isReturnModalOpen}
        onCloseAction={() => setReturnModalOpen(false)}
      />
      <LocationTransferModal
        open={isTransferModalOpen}
        onCloseAction={() => setTransferModalOpen(false)}
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
