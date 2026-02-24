'use client'

import OplReturnFromTechnician from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/return/OplReturnFromTechnician'
import OplReturnToOperator from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/return/OplReturnToOperator'
import PageControlBar from '@/app/components/PageControlBar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { OPL_PATH } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImSpinner2 } from 'react-icons/im'
import { MdChevronLeft } from 'react-icons/md'

const OplWarehouseReturnPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('fromTechnician')
  const [hasDraftFromTechnician, setHasDraftFromTechnician] = useState(false)
  const [hasDraftToOperator, setHasDraftToOperator] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)

  const hasAnyDraft = hasDraftFromTechnician || hasDraftToOperator

  const goBack = () => {
    setIsNavigatingBack(true)
    router.push(`${OPL_PATH}/admin-panel?tab=warehouse`)
  }

  const resetAndClose = () => {
    setActiveTab('fromTechnician')
    setHasDraftFromTechnician(false)
    setHasDraftToOperator(false)
    setConfirmCloseOpen(false)
    goBack()
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
      <div className="grid w-full flex-1 h-[calc(100dvh-143px)] min-h-[calc(100dvh-143px)] max-h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] md:min-h-[calc(100dvh-80px)] md:max-h-[calc(100dvh-80px)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PageControlBar
          title="Zwrot sprzętu"
          leftStart={
            <Button variant="ghost" size="sm" className="gap-1" onClick={handleAttemptClose} disabled={isNavigatingBack}>
              {isNavigatingBack ? <ImSpinner2 className="text-sm animate-spin" /> : <MdChevronLeft className="text-lg" />}
              {isNavigatingBack ? 'Powrót...' : 'Powrót'}
            </Button>
          }
          centerContent={
            <Tabs value={activeTab} onValueChange={setActiveTab} className="shrink-0">
              <TabsList className="grid grid-cols-2 w-[320px]">
                <TabsTrigger value="fromTechnician">Od technika</TabsTrigger>
                <TabsTrigger value="toOperator">Do operatora</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        <div className="min-h-0 overflow-hidden px-2 pb-2">
          <div className="rounded-xl border p-3 md:p-4 h-full min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsContent value="fromTechnician" className="mt-0 flex-1 min-h-0 overflow-hidden">
                <OplReturnFromTechnician onClose={resetAndClose} onDraftChange={setHasDraftFromTechnician} />
              </TabsContent>
              <TabsContent value="toOperator" className="mt-0 flex-1 min-h-0 overflow-hidden">
                <OplReturnToOperator onClose={resetAndClose} onDraftChange={setHasDraftToOperator} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masz dodane pozycje, które nie zostały zwrócone. Czy na pewno chcesz zamknąć?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndClose}>Zamknij bez zapisu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default OplWarehouseReturnPage
