'use client'

import PageControlBar from '@/app/components/PageControlBar'
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
import { MdNotes } from 'react-icons/md'

interface TechnicianOplPlanerHeaderBarProps {
  title: string
  searchTerm: string
  setSearchTerm: (v: string) => void
}

/**
 * TechnicianOplPlanerHeaderBar
 */
const TechnicianOplPlanerHeaderBar = ({
  title,
  searchTerm,
  setSearchTerm,
}: TechnicianOplPlanerHeaderBarProps) => {
  const [isAddressNotesOpen, setAddressNotesOpen] = useState(false)
  const [addressNotesQuery, setAddressNotesQuery] = useState('')
  const { data: addressNotes = [], isFetching: isAddressNotesLoading } =
    trpc.opl.order.searchAddressNotes.useQuery(
      { query: addressNotesQuery.trim() || undefined, limit: 50 },
      { enabled: isAddressNotesOpen }
    )

  return (
    <>
      <PageControlBar title={title}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddressNotesOpen(true)}
            className="whitespace-nowrap"
          >
            <MdNotes className="mr-1" />
            Baza uwag
          </Button>

          <SearchInput
            placeholder="Szukaj po adresie lub numerze zlecenia..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-64 w-fit"
          />
        </div>
      </PageControlBar>

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

export default TechnicianOplPlanerHeaderBar
