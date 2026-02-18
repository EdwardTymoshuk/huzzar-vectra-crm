'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import { CgArrowsExchangeAlt } from 'react-icons/cg'
import {
  HiOutlineArrowDownOnSquare,
  HiOutlineArrowUpOnSquare,
} from 'react-icons/hi2'
import { MdAdd, MdDescription, MdHistory, MdUploadFile } from 'react-icons/md'
import { PiUserListFill } from 'react-icons/pi'
import { TbListSearch } from 'react-icons/tb'

interface WarehouseFloatingActionsProps {
  onAddManual: () => void
  onImportExcel?: () => void
  onIssue: () => void
  onReturn: () => void
  onStockCheck: () => void
  onSerialCheck: () => void
  onTransfer: () => void
  onHistory: () => void
  onReports: () => void
  showImport?: boolean
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
  onReports,
  showImport = true,
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
          colorClass:
            'bg-primary text-primary-foreground hover:bg-primary-hover',
          onClick: onAddManual,
        },
        ...(showImport && onImportExcel
          ? [
              {
                label: 'Import z Excela',
                icon: <MdUploadFile />,
                colorClass:
                  'bg-primary text-primary-foreground hover:bg-primary-hover',
                onClick: onImportExcel,
              },
            ]
          : []),
        {
          label: 'Wydaj sprzęt',
          icon: <HiOutlineArrowUpOnSquare />,
          colorClass:
            'bg-primary text-primary-foreground hover:bg-primary-hover',
          onClick: onIssue,
        },
        {
          label: 'Zwrot',
          icon: <HiOutlineArrowDownOnSquare />,
          colorClass:
            'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
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
          label: 'Raporty',
          icon: <MdDescription />,
          colorClass: 'bg-secondary hover:bg-secondary/90',
          onClick: onReports,
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
