'use client'

import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { materialUnitMap } from '@/lib/constants'
import { MaterialDefinition } from '@/types'
import { trpc } from '@/utils/trpc'
import { FC, MouseEvent, useState } from 'react'
import { MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import EditMaterialDefinitionDialog from './EditMaterialDefinitionDialog'

/**
 * MaterialDefinitionsList:
 * - Displays all material definitions as badges
 * - Supports double-click editing and inline deletion
 */
const MaterialDefinitionsList: FC = () => {
  const { data, isLoading, isError } = trpc.materialDefinition.getAll.useQuery()
  const [editingItem, setEditingItem] = useState<MaterialDefinition | null>(
    null
  )

  const utils = trpc.useUtils()

  const deleteMutation = trpc.materialDefinition.delete.useMutation({
    onSuccess: () => {
      toast.success('Materiał został usunięty.')
      utils.materialDefinition.getAll.invalidate()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się załadować danych materiałów.</AlertTitle>
      </Alert>
    )
  }

  // Apply default values in case something is missing
  const safeData: MaterialDefinition[] = data.map((item) => ({
    ...item,
    index: item.index ?? '',
    unit: item.unit ?? 'PIECE',
    warningAlert: item.warningAlert ?? 10,
    alarmAlert: item.alarmAlert ?? 5,
  }))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Materiały</CardTitle>
          <CardDescription>Łącznie: {safeData.length}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2">
            {safeData.map((material) => (
              <TooltipProvider key={material.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer flex items-center gap-1"
                      onDoubleClick={() => setEditingItem(material)}
                    >
                      {material.name} ({materialUnitMap[material.unit]})
                      <MdClose
                        className="text-danger"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation()
                          deleteMutation.mutate({ id: material.id })
                        }}
                      />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Kliknij dwukrotnie, aby edytować</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      {editingItem && (
        <EditMaterialDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  )
}

export default MaterialDefinitionsList
