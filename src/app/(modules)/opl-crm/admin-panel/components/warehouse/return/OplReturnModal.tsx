'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { useState } from 'react'
import ReturnFromTechnician from './OplReturnFromTechnician'
import ReturnToOperator from './OplReturnToOperator'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * OplReturnModal component:
 * - Allows handling returns to warehouse from technicians or back to operator.
 * - Uses tabbed layout for two types of returns.
 */
const OplReturnModal = ({ open, onCloseAction }: Props) => {
  const [activeTab, setActiveTab] = useState('fromTechnician')
  const [hasDraftFromTechnician, setHasDraftFromTechnician] = useState(false)
  const [hasDraftToOperator, setHasDraftToOperator] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const hasAnyDraft = hasDraftFromTechnician || hasDraftToOperator

  const resetAndClose = () => {
    setActiveTab('fromTechnician')
    setHasDraftFromTechnician(false)
    setHasDraftToOperator(false)
    setConfirmCloseOpen(false)
    onCloseAction()
  }

  const handleAttemptClose = () => {
    if (hasAnyDraft) {
      setConfirmCloseOpen(true)
      return
    }
    resetAndClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
      <DialogContent className="w-[96vw] max-w-[1500px] h-auto overflow-y-auto md:h-[92vh] md:max-h-[92vh] md:overflow-hidden space-y-4">
        <DialogHeader>
          <DialogTitle>Zwrot sprzętu</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="fromTechnician"
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col md:h-[calc(92vh-170px)]"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-2">
            <TabsTrigger value="fromTechnician">Od technika</TabsTrigger>
            <TabsTrigger value="toOperator">Do operatora</TabsTrigger>
          </TabsList>

          <TabsContent value="fromTechnician" className="flex-1 overflow-visible md:overflow-hidden">
            <ReturnFromTechnician
              onClose={resetAndClose}
              onDraftChange={setHasDraftFromTechnician}
            />
          </TabsContent>

          <TabsContent value="toOperator" className="flex-1 overflow-visible md:overflow-hidden">
            <ReturnToOperator
              onClose={resetAndClose}
              onDraftChange={setHasDraftToOperator}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Masz dodane pozycje, które nie zostały zwrócone. Czy na pewno chcesz zamknąć?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndClose}>
              Zamknij bez zapisu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplReturnModal
