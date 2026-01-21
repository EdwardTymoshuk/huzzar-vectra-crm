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
import { VectraOperatorDefinition } from '@prisma/client'
import { FC, MouseEvent, useState } from 'react'
import { MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import EditOperatorDialog from './EditOperatorDefinitionDialog'

const OperatorDefinitionsList: FC = () => {
  const { data, isLoading, isError } =
    trpc.vectra.operatorDefinition.getAllDefinitions.useQuery()

  const [editingItem, setEditingItem] =
    useState<VectraOperatorDefinition | null>(null)

  const utils = trpc.useUtils()
  const deleteMutation =
    trpc.vectra.operatorDefinition.deleteDefinition.useMutation({
      onSuccess: () => {
        toast.success('Operator został usunięty.')
        utils.vectra.operatorDefinition.getAllDefinitions.invalidate()
      },
      onError: () => toast.error('Błąd podczas usuwania.'),
    })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się załadować operatorów.</AlertTitle>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operatorzy</CardTitle>
        <CardDescription>Łącznie: {data.length}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((operator) => (
            <TooltipProvider key={operator.operator}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer flex items-center gap-1"
                    onDoubleClick={() => setEditingItem(operator)}
                  >
                    {operator.operator}
                    <MdClose
                      className="cursor-pointer text-danger"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        deleteMutation.mutate({ operator: operator.operator })
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

        <EditOperatorDialog
          open={!!editingItem}
          item={editingItem ?? { operator: '' }}
          onClose={() => setEditingItem(null)}
        />
      </CardContent>
    </Card>
  )
}

export default OperatorDefinitionsList
