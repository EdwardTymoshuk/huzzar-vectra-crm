'use client'

import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import {
  Card,
  CardContent,
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
import EditRateDefinitionDialog from './EditRateDefinitionDialog'

/**
 * Represents a single rate definition in the system.
 * 'code' stands for the work code (e.g. 'W1'),
 * and 'amount' is the payment in zł.
 */
type RateDefinition = {
  id: string
  code: string
  amount: number
}

/**
 * RatesList component:
 * - Fetches and displays a list of rates (code + amount) as badges inside a card.
 * - Double-click a badge to edit the rate.
 * - Click on the 'X' icon to remove the rate.
 * - Includes a tooltip with an edit hint.
 */
const RatesList: FC = () => {
  // Retrieve all rates from the tRPC procedure
  const {
    data: rates,
    isLoading,
    isError,
  } = trpc.rateDefinition.getAllRates.useQuery()
  // Local state to store the rate being edited
  const [editingItem, setEditingItem] = useState<RateDefinition | null>(null)

  // tRPC mutation to delete a rate
  const utils = trpc.useUtils()
  const deleteMutation = trpc.rateDefinition.deleteRate.useMutation({
    onSuccess: () => {
      toast.success('Stawka została usunięta.')
      utils.rateDefinition.getAllRates.invalidate()
    },
    onError: () => {
      toast.error('Błąd podczas usuwania stawki.')
    },
  })

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  // Error state
  if (isError || !rates) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się załadować stawek.</AlertTitle>
      </Alert>
    )
  }

  // Render all rates as badges within a single card
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle> Lista aktualnych stawek (kod | kwota)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {rates.map((rate) => (
              <TooltipProvider key={rate.id}>
                <Tooltip>
                  {/* 
                    TooltipTrigger asChild -> 
                    means the <Badge> acts as the hoverable element 
                  */}
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer flex items-center gap-1 uppercase"
                      onDoubleClick={() => setEditingItem(rate)}
                    >
                      {/* Display code + amount (2 decimal points) */}
                      {rate.code} | {rate.amount.toFixed(2)} zł
                      <MdClose
                        className="cursor-pointer text-danger"
                        onClick={(e: MouseEvent) => {
                          // Avoid double-click triggering
                          e.stopPropagation()
                          deleteMutation.mutate({ id: rate.id })
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

      {/* Dialog to edit a rate */}
      {editingItem && (
        <EditRateDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  )
}

export default RatesList
