'use client'

import TechnicianSelector from '@/app/components/shared/TechnicianSelector'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { UserWithBasic } from '@/types'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import TransferItemsTabs from './TransferItemsTabs'

type Props = { open: boolean; onClose: () => void }

/**
 * TransferModal
 * – lets Technician A choose Technician B and pick items to send
 */
const TransferModal = ({ open, onClose }: Props) => {
  const [tech, setTech] = useState<UserWithBasic | null>(null)
  const [edit, setEdit] = useState(false)

  const resetAndClose = () => {
    setTech(null)
    setEdit(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className=" space-y-4 h-auto">
        <DialogHeader>
          <DialogTitle>Przekaż sprzęt do technika</DialogTitle>
        </DialogHeader>

        {/* technician selector */}
        {tech && !edit ? (
          <div className="flex items-center justify-between bg-muted p-3 rounded-md">
            <p className="font-semibold text-primary">
              {tech.name}
              {tech.identyficator ? ` | ${tech.identyficator}` : ''}
            </p>
            <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
              <CgArrowsExchange className="mr-1" /> Zmień
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <TechnicianSelector
                value={tech}
                onChange={(t) => {
                  setTech(t)
                  setEdit(false)
                }}
              />
            </div>
          </div>
        )}

        {/* item picker */}
        {tech && (
          <TransferItemsTabs technicianId={tech.id} onClose={resetAndClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TransferModal
