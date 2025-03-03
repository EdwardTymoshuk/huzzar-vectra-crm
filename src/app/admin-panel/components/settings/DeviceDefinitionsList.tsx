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
import { trpc } from '@/utils/trpc'
import { FC, MouseEvent, useState } from 'react'
import { MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import EditDeviceDefinitionDialog from './EditDeviceDefinitionDialog'

// Typ podkategorii (np. FunBox 6 w kategorii MODEM)
type DeviceDefinition = {
  id: string
  category: 'MODEM' | 'DECODER' | 'ONT' | 'AMPLIFIER' | 'OTHER'
  name: string
}

/**
 * DeviceDefinitionsList:
 * - Renders each category as a Card
 * - Shows subcategories as Badges (with X icon to delete, double click to edit).
 */
const DeviceDefinitionsList: FC = () => {
  // Fetch definitions
  const { data, isLoading, isError } =
    trpc.deviceDefinition.getAllDefinitions.useQuery()

  // State for editing
  const [editingItem, setEditingItem] = useState<DeviceDefinition | null>(null)

  // Delete mutation
  const utils = trpc.useUtils()
  const deleteMutation = trpc.deviceDefinition.deleteDefinition.useMutation({
    onSuccess: () => {
      toast.success('Podkategoria została usunięta.')
      utils.deviceDefinition.getAllDefinitions.invalidate()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  // Mapping from DB values (English enum) to Polish display text
  const categoryLabels: Record<DeviceDefinition['category'], string> = {
    MODEM: 'MODEM',
    DECODER: 'DEKODER',
    ONT: 'ONT',
    AMPLIFIER: 'WZNACNIACZ',
    OTHER: 'INNE',
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  // Error alert
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się załadować danych.</AlertTitle>
      </Alert>
    )
  }

  // Group definitions by category
  const grouped = data.reduce<Record<string, DeviceDefinition[]>>(
    (acc, def) => {
      if (!acc[def.category]) {
        acc[def.category] = []
      }
      acc[def.category].push(def)
      return acc
    },
    {}
  )

  const entries = Object.entries(grouped) as [
    DeviceDefinition['category'],
    DeviceDefinition[]
  ][]

  // Render categories as Cards, subcategories as Badges
  return (
    <>
      {entries.map(([category, items]) => (
        <Card key={category} className="mb-4">
          <CardHeader>
            <CardTitle>{categoryLabels[category]}</CardTitle>
            <CardDescription>Łącznie: {items.length}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-2">
              {items.map((d) => (
                <TooltipProvider key={d.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        key={d.id}
                        variant="secondary"
                        // Cursor pointer + onDoubleClick for edit
                        className="cursor-pointer flex items-center gap-1"
                        onDoubleClick={() => setEditingItem(d)}
                      >
                        {d.name}
                        {/* X icon to delete */}
                        <MdClose
                          className="cursor-pointer text-danger"
                          onClick={(e: MouseEvent) => {
                            // Stop event so it doesn't also trigger onDoubleClick
                            e.stopPropagation()
                            deleteMutation.mutate({ id: d.id })
                          }}
                        />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-background">
                      <p className="text-xs font-light">
                        Kliknij dwukrotnie, aby edytować
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog to edit subcategory (podkategoria) */}
      {editingItem && (
        <EditDeviceDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  )
}

export default DeviceDefinitionsList
