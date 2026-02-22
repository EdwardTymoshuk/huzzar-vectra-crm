'use client'

import PageControlBar from '@/app/components/PageControlBar'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { BsThreeDotsVertical } from 'react-icons/bs'
import { CgArrowsExchangeAlt } from 'react-icons/cg'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd, MdDescription, MdHistory } from 'react-icons/md'
import { PiUserListFill } from 'react-icons/pi'
import { TbListSearch } from 'react-icons/tb'
import { ReactNode } from 'react'
import WarehouseFilter from './WarehouseFilter'

interface WarehouseHeaderBarProps {
  searchTerm: string
  setSearchTerm: (v: string) => void
  setCategoryFilter: (v: string | null) => void

  /** Callbacks for actions */
  onAddManual: () => void
  onIssue: () => void
  onReturn: () => void
  onStockCheck: () => void
  onSerialCheck: () => void
  onTransfer: () => void
  onHistory: () => void
  onReports: () => void
  centerContent?: ReactNode
}

/**
 * WarehouseHeaderBar
 * ------------------------------------------------------
 * Unified top control bar for the warehouse page.
 * - Shows search and category filter.
 * - Shows main actions (add, import, issue) on xl+.
 * - Additional actions are grouped in a dropdown menu.
 */
const WarehouseHeaderBar = ({
  searchTerm,
  setSearchTerm,
  setCategoryFilter,
  onAddManual,
  onIssue,
  onReturn,
  onStockCheck,
  onSerialCheck,
  onTransfer,
  onHistory,
  onReports,
  centerContent,
}: WarehouseHeaderBarProps) => {
  const rightActions = (
    <div className="hidden xl:flex items-center gap-2">
      {/* Main actions on xl+ */}
      <Button variant="default" onClick={onAddManual}>
        <MdAdd className="text-lg" />
        <span className="ml-1">Dostawa</span>
      </Button>

      <Button variant="default" onClick={onIssue}>
        <HiOutlineArrowUpOnSquare className="text-lg" />
        <span className="ml-1">Wydaj</span>
      </Button>

      {/* Dropdown for secondary actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <BsThreeDotsVertical className="text-xl" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background">
          <DropdownMenuItem onClick={onReturn} className="hover:cursor-pointer">
            <div className="flex items-center gap-2">
              <HiOutlineArrowDownOnSquare className="text-lg" />
              <span>Zwrot</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onStockCheck}
            className="hover:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <PiUserListFill className="text-lg" />
              <span>Stan technika</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onSerialCheck}
            className="hover:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <TbListSearch className="text-lg" />
              <span>Sprawdź SN/MAC</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onTransfer}
            className="hover:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CgArrowsExchangeAlt className="text-lg" />
              <span>Przekazanie</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onReports}
            className="hover:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MdDescription className="text-lg" />
              <span>Raporty</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onHistory}
            className="hover:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MdHistory className="text-lg" />
              <span>Historia magazynu</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <PageControlBar
      title="Magazyn"
      rightActions={rightActions}
      centerContent={centerContent}
      enableHorizontalScroll
    >
      <div className="flex items-center justify-between md:justify-end gap-2 w-full min-w-[340px]">
        <WarehouseFilter setCategoryFilter={setCategoryFilter} />
        <SearchInput
          placeholder="Szukaj urządzenia lub materiału..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="max-w-60 min-w-[220px]"
        />
      </div>
    </PageControlBar>
  )
}

export default WarehouseHeaderBar
