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
  value: { id: string; name: string } | null
  onChange: (loc: { id: string; name: string } | null) => void
  excludeCurrent?: boolean
  currentLocationId?: string
}

/**
 * LocationSelector
 * – Dropdown to choose a warehouse location (excluding current if needed).
 */
const LocationSelector = ({
  value,
  onChange,
  excludeCurrent,
  currentLocationId,
}: Props) => {
  const { data: locations = [] } = trpc.core.user.getAllLocations.useQuery()

  const filtered =
    excludeCurrent && currentLocationId
      ? locations.filter((l) => l.id !== currentLocationId)
      : locations

  return (
    <Select
      value={value?.id ?? ''}
      onValueChange={(val) => {
        const loc = filtered.find((l) => l.id === val) ?? null
        onChange(loc)
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Wybierz magazyn" />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LocationSelector
