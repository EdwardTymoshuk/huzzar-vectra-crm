'use client'

import SearchInput from '@/app/components/SearchInput'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Skeleton } from '@/app/components/ui/skeleton'
import { OplIssuedItemMaterial } from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  technicianId: string
  onAddMaterial: (material: OplIssuedItemMaterial) => void
  issuedMaterials: OplIssuedItemMaterial[]
}

const MaterialIssueTable = ({
  onAddMaterial,
  issuedMaterials,
  technicianId,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number | undefined>
  >({})
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  const activeLocationId = useActiveLocation()
  const { data: warehouseItems, isLoading } =
    trpc.opl.warehouse.getAll.useQuery(
      activeLocationId ? { locationId: activeLocationId } : undefined
    )

  const materials = useMemo(() => {
    return (
      warehouseItems?.filter(
        (item) =>
          item.itemType === 'MATERIAL' &&
          item.status === 'AVAILABLE' &&
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
    )
  }, [warehouseItems, searchTerm])

  const groupedMaterials = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        name: string
        materialDefinitionId: string | null
        quantity: number
        rows: typeof materials
      }
    >()

    materials.forEach((item) => {
      const key = item.materialDefinitionId ?? item.name
      const existing = groups.get(key)

      if (existing) {
        existing.quantity += item.quantity
        existing.rows.push(item)
        return
      }

      groups.set(key, {
        key,
        name: item.name,
        materialDefinitionId: item.materialDefinitionId,
        quantity: item.quantity,
        rows: [item],
      })
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
    )
  }, [materials])

  const technicianStock = useMemo(() => {
    return (
      warehouseItems?.filter(
        (item) =>
          item.itemType === 'MATERIAL' &&
          item.status === 'ASSIGNED' &&
          item.assignedToId === technicianId
      ) || []
    )
  }, [warehouseItems, technicianId])

  // Initialize quantities for visible grouped materials
  useEffect(() => {
    const initial: Record<string, number> = {}
    groupedMaterials.forEach((m) => {
      initial[m.key] = 1
    })
    setMaterialQuantities(initial)
  }, [groupedMaterials])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const handleAddMaterial = (groupKey: string) => {
    const group = groupedMaterials.find((m) => m.key === groupKey)
    if (!group) return

    const alreadyIssued = issuedMaterials
      .filter(
        (m) =>
          (group.materialDefinitionId &&
            m.materialDefinitionId === group.materialDefinitionId) ||
          m.name === group.name
      )
      .reduce((acc, m) => acc + m.quantity, 0)

    const remaining = group.quantity - alreadyIssued

    const quantityToIssue = materialQuantities[groupKey]
    if (
      quantityToIssue == null ||
      quantityToIssue <= 0 ||
      isNaN(quantityToIssue)
    ) {
      toast.warning('Podaj poprawną ilość.')
      return
    }

    if (quantityToIssue > remaining) {
      toast.warning('Nie można wydać więcej niż dostępne w magazynie.')
      return
    }

    let leftToAllocate = quantityToIssue

    for (const row of group.rows) {
      if (leftToAllocate <= 0) break

      const issuedInRow =
        issuedMaterials.find((m) => m.id === row.id)?.quantity ?? 0
      const rowRemaining = row.quantity - issuedInRow
      if (rowRemaining <= 0) continue

      const qty = Math.min(leftToAllocate, rowRemaining)
      onAddMaterial({
        id: row.id,
        type: 'MATERIAL',
        name: row.name,
        materialDefinitionId: row.materialDefinitionId!,
        quantity: qty,
      })
      leftToAllocate -= qty
    }

    if (leftToAllocate > 0) {
      toast.warning('Nie udało się rozdzielić ilości na stany magazynowe.')
      return
    }

    setMaterialQuantities((prev) => ({
      ...prev,
      [groupKey]: 1, // reset input after issuing
    }))

    // collapse row after issuing
    setExpandedRows((prev) => prev.filter((r) => r !== groupKey))
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4 mt-6">
      <SearchInput
        placeholder="Szukaj materiał"
        value={searchTerm}
        onChange={setSearchTerm}
      />

      {groupedMaterials.map((item) => {
        const alreadyIssued =
          issuedMaterials
            .filter(
              (m) =>
                (item.materialDefinitionId &&
                  m.materialDefinitionId === item.materialDefinitionId) ||
                m.name === item.name
            )
            .reduce((acc, m) => acc + m.quantity, 0)
        const remaining = item.quantity - alreadyIssued
        const isDisabled = remaining <= 0
        const technicianQuantity = technicianStock
          .filter((stockItem) => stockItem.name === item.name)
          .reduce((acc, stockItem) => acc + (stockItem.quantity ?? 0), 0)

        return (
          <div
            key={item.key}
            className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${
              isDisabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <span className="flex flex-col">
              <Highlight
                highlightClassName="bg-yellow-200"
                searchWords={[searchTerm]}
                autoEscape={true}
                textToHighlight={item.name}
              />
              <div className="flex gap-2">
                <Badge variant="secondary" className="w-fit">
                  Magazyn: {remaining}
                </Badge>

                <Badge variant="outline" className="w-fit">
                  Technik: {technicianQuantity}
                </Badge>
              </div>
            </span>

            {expandedRows.includes(item.key) ? (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  max={remaining}
                  className="w-20 h-8 text-sm"
                  value={materialQuantities[item.key] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setMaterialQuantities((prev) => ({
                      ...prev,
                      [item.key]: val === '' ? undefined : Number(val),
                    }))
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddMaterial(item.key)}
                  disabled={isDisabled}
                  className="transition-all duration-300"
                >
                  Dodaj
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => toggleRow(item.key)}
                disabled={isDisabled}
                className="transition-all duration-300"
              >
                <MdAdd />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MaterialIssueTable
