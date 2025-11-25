'use client'

import FloatingActionMenu from '@/app/components/shared/FloatingActionMenu'
import { CgArrowsExchangeAlt } from 'react-icons/cg'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd, MdHistory, MdUploadFile } from 'react-icons/md'
import { PiUserListFill } from 'react-icons/pi'
import { TbListSearch } from 'react-icons/tb'

interface WarehouseFloatingActionsProps {
  onAddManual: () => void
  onImportExcel: () => void
  onIssue: () => void
  onReturn: () => void
  onStockCheck: () => void
  onSerialCheck: () => void
  onTransfer: () => void
  onHistory: () => void
}

const WarehouseFloatingActions = ({
  onAddManual,
  onImportExcel,
  onIssue,
  onReturn,
  onStockCheck,
  onSerialCheck,
  onTransfer,
  onHistory,
}: WarehouseFloatingActionsProps) => {
  return (
    <FloatingActionMenu
      position="bottom-right"
      disableOverlay
      mainTooltip="Akcje magazynowe"
      actions={[
        {
          label: 'Dostawa ręczna',
          icon: <MdAdd />,
          colorClass: 'bg-success hover:bg-success/90',
          onClick: onAddManual,
        },
        {
          label: 'Import z Excela',
          icon: <MdUploadFile />,
          colorClass: 'bg-success hover:bg-success/90',
          onClick: onImportExcel,
        },
        {
          label: 'Wydaj sprzęt',
          icon: <HiOutlineArrowUpOnSquare />,
          colorClass: 'bg-warning hover:bg-warning/90',
          onClick: onIssue,
        },
        {
          label: 'Zwrot',
          icon: <HiOutlineArrowDownOnSquare />,
          colorClass: 'bg-danger hover:bg-danger/90',
          onClick: onReturn,
        },
        {
          label: 'Stan technika',
          icon: <PiUserListFill />,
          colorClass: 'bg-secondary hover:bg-secondary/90',
          onClick: onStockCheck,
        },
        {
          label: 'Sprawdź SN/MAC',
          icon: <TbListSearch />,
          colorClass: 'bg-secondary hover:bg-secondary/90',
          onClick: onSerialCheck,
        },
        {
          label: 'Przekazanie',
          icon: <CgArrowsExchangeAlt />,
          colorClass: 'bg-secondary hover:bg-secondary/90',
          onClick: onTransfer,
        },
        {
          label: 'Historia magazynu',
          icon: <MdHistory />,
          colorClass: 'bg-secondary hover:bg-secondary/90',
          onClick: onHistory,
        },
      ]}
    />
  )
}

export default WarehouseFloatingActions
