'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'

type Props = {
  value: string | undefined
  onChange: (val: string | undefined) => void
}

const OperatorSelect = ({ value, onChange }: Props) => {
  const { data: operators = [] } =
    trpc.vectra.operatorDefinition.getAllDefinitions.useQuery()

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-xs text-muted-foreground">Operator</label>
      <Select
        value={value ?? ''}
        onValueChange={(val) => onChange(val || undefined)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Wszyscy operatorzy" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.operator} value={op.operator}>
              {op.operator}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default OperatorSelect
