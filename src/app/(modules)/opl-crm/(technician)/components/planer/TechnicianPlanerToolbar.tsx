'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { MdAdd, MdNotes } from 'react-icons/md'

interface Props {
  /** Current search term */
  searchTerm: string
  /** Updates the search term */
  setSearchTerm: (val: string) => void
  /** Opens Add Order modal */
  onAddOrder: () => void
}

/**
 * TechnicianPlanerToolbar
 * -------------------------------------------------------------
 * Top toolbar for the technician daily planner.
 * - First row: "Dodaj zlecenie" (left) + "Szukaj" (right)
 * - Second row: Full-width DatePicker with prev/next buttons
 * - Fully responsive for mobile and desktop layouts.
 */
const TechnicianPlanerToolbar = ({
  searchTerm,
  setSearchTerm,
  onAddOrder,
}: Props) => {
  const [isAddressNotesOpen, setAddressNotesOpen] = useState(false)
  const [addressNotesQuery, setAddressNotesQuery] = useState('')
  const { data: addressNotes = [], isFetching: isAddressNotesLoading } =
    trpc.opl.order.searchAddressNotes.useQuery(
      { query: addressNotesQuery.trim() || undefined, limit: 50 },
      { enabled: isAddressNotesOpen }
    )

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={onAddOrder}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <MdAdd className="mr-1" />
              Dodaj zlecenie
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddressNotesOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <MdNotes className="mr-1" />
              Baza uwag
            </Button>
          </div>

          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Szukaj (nr zlecenia lub adres)..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
        </div>
      </div>

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
    </>
  )
}

export default TechnicianPlanerToolbar
