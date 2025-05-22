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

const TechnicianSelect = ({ value, onChange }: Props) => {
  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery()

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-xs text-muted-foreground">Technik</label>
      <Select
        value={value ?? ''}
        onValueChange={(val) => onChange(val || undefined)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Wszyscy technicy" />
        </SelectTrigger>
        <SelectContent>
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              {tech.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default TechnicianSelect
