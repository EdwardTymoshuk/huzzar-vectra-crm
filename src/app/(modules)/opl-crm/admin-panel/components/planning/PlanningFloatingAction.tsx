'use client'

import FloatingActionMenu from '@/app/components/FloatingActionMenu'
import SearchInput from '@/app/components/SearchInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { MdAdd, MdEdit, MdNotes, MdUploadFile } from 'react-icons/md'
import AddOplOrderModal from '../orders/AddOplOrderModal'
import ImportOrdersModal from '../orders/ImportOrdersModal'

/**
 * PlanningFloatingAction
 * --------------------------------------------------
 * Wrapper for FloatingActionMenu, specific to the planning page.
 * Handles modal logic and role gating.
 */
const PlanningFloatingAction = () => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)
  const [isAddressNotesOpen, setAddressNotesOpen] = useState(false)
  const [addressNotesQuery, setAddressNotesQuery] = useState('')

  const { isAdmin, isCoordinator, isLoading } = useRole()
  const { data: addressNotes = [], isFetching: isAddressNotesLoading } =
    trpc.opl.order.searchAddressNotes.useQuery(
      { query: addressNotesQuery.trim() || undefined, limit: 50 },
      { enabled: isAddressNotesOpen }
    )

  if (isLoading) return null
  const canManage = isAdmin || isCoordinator
  if (!canManage) return null

  return (
    <div className="xl:hidden">
      <FloatingActionMenu
        actions={[
          {
            label: 'Dodaj ręcznie',
            icon: <MdEdit className="text-lg" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setAddModalOpen(true),
          },
          {
            label: 'Wczytaj z Excela',
            icon: <MdUploadFile className="text-lg" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setImportModalOpen(true),
          },
          {
            label: 'Baza uwag',
            icon: <MdNotes className="text-lg" />,
            colorClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
            onClick: () => setAddressNotesOpen(true),
          },
        ]}
        mainIcon={<MdAdd className="text-3xl" />}
        mainTooltip="Dodaj lub importuj zlecenia"
      />

      <AddOplOrderModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />
      <ImportOrdersModal
        open={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      <Dialog open={isAddressNotesOpen} onOpenChange={setAddressNotesOpen}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[85dvh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Baza uwag do adresów</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <SearchInput
              placeholder="Szukaj po mieście, ulicy lub treści uwagi..."
              value={addressNotesQuery}
              onChange={setAddressNotesQuery}
            />

            <div className="max-h-[60dvh] overflow-y-auto rounded-md border">
              {isAddressNotesLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Wczytywanie...
                </div>
              ) : addressNotes.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Brak wyników.
                </div>
              ) : (
                <div className="divide-y">
                  {addressNotes.map((row) => (
                    <div key={row.id} className="p-3 text-sm">
                      <div className="font-medium">
                        {row.city}, {row.street}
                      </div>
                      {row.buildingScope && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Zakres: {row.buildingScope}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap mt-2">{row.note}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(row.createdAt).toLocaleString('pl-PL')} •{' '}
                        {row.createdBy.name || 'Nieznany użytkownik'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PlanningFloatingAction
