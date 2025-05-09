import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { warehouseActionMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'
import { WarehouseAction } from '@prisma/client'

interface Props {
  actions?: WarehouseAction[]
  setActions: (val: WarehouseAction[] | undefined) => void
  performerId?: string
  setPerformerId: (val: string | undefined) => void
  startDate?: string
  setStartDate: (val: string | undefined) => void
  endDate?: string
  setEndDate: (val: string | undefined) => void
}

const HistoryFilters = ({
  actions,
  setActions,
  performerId,
  setPerformerId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: Props) => {
  const { data: users = [] } = trpc.user.getAdmins.useQuery()

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Action filter */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs text-muted-foreground">Typ operacji</label>
        <Select
          onValueChange={(val) =>
            setActions(val ? [val as WarehouseAction] : undefined)
          }
          value={actions?.[0] ?? ''}
        >
          <SelectTrigger
            className={cn('w-[180px]', actions && 'border-2 border-primary')}
          >
            <SelectValue placeholder="Wszystkie" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(warehouseActionMap).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Performer filter */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs text-muted-foreground">Wykonane przez</label>
        <Select
          onValueChange={(val) => setPerformerId(val || undefined)}
          value={performerId || ''}
        >
          <SelectTrigger
            className={cn(
              'w-[200px]',
              performerId && 'border-2 border-primary'
            )}
          >
            <SelectValue placeholder="Wszyscy użytkownicy" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs text-muted-foreground">Od</label>
        <Input
          type="date"
          value={startDate ?? ''}
          onChange={(e) => setStartDate(e.target.value || undefined)}
          className={cn(startDate && 'border-2 border-primary')}
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-xs text-muted-foreground">Do</label>
        <Input
          type="date"
          value={endDate ?? ''}
          onChange={(e) => setEndDate(e.target.value || undefined)}
          className={cn(endDate && 'border-2 border-primary')}
        />
      </div>

      <Button
        variant="secondary"
        onClick={() => {
          setActions(undefined)
          setPerformerId(undefined)
          setStartDate(undefined)
          setEndDate(undefined)
        }}
      >
        Wyczyść filtry
      </Button>
    </div>
  )
}

export default HistoryFilters
