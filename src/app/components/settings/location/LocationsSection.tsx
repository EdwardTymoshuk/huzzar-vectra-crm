'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import SettingsSection from '@/app/components/settings/SettingsSection'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { MdAdd, MdDelete } from 'react-icons/md'
import { toast } from 'sonner'
import AddLocationDialog from './AddLocationDialog'

/**
 * LocationsSection:
 * - List of warehouse locations with CRUD (add/delete)
 * - Uses ConfirmDeleteDialog before deletion
 * - Shows skeleton on load and toast feedback for actions
 */
const LocationsSection = ({ title }: { title: string }) => {
  const utils = trpc.useUtils()
  const { data: locations = [], isLoading } =
    trpc.core.user.getAllLocations.useQuery()

  const deleteLocation = trpc.core.user.deleteLocation.useMutation({
    onSuccess: async () => {
      toast.success('Lokalizacja została usunięta.')
      await utils.core.user.getAllLocations.invalidate()
    },
    onError: (err) => toast.error(err.message || 'Błąd podczas usuwania.'),
  })

  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteId) {
      deleteLocation.mutate({ id: deleteId })
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <SettingsSection title={title}>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title={title}>
      <ul className="divide-y divide-border">
        {locations.map((loc) => (
          <li key={loc.id} className="flex justify-between items-center py-2">
            <span>{loc.name}</span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteLocation.isLoading && deleteId === loc.id}
                onClick={() => setDeleteId(loc.id)}
              >
                {deleteLocation.isLoading && deleteId === loc.id ? (
                  'Usuwanie...'
                ) : (
                  <>
                    <MdDelete /> Usuń
                  </>
                )}
              </Button>
            </div>
          </li>
        ))}
        {locations.length === 0 && (
          <li className="py-4 text-center text-muted-foreground">
            Brak lokalizacji do wyświetlenia.
          </li>
        )}
      </ul>

      <div className="flex justify-end mt-4">
        <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} />
        <Button onClick={() => setAddOpen(true)} variant="default">
          <MdAdd />
          Dodaj lokalizację
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        description="Ta operacja usunie lokalizację magazynu. Czy na pewno chcesz kontynuować?"
      />
    </SettingsSection>
  )
}

export default LocationsSection
