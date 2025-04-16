'use client'

import SearchInput from '@/app/components/SearchInput'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Skeleton } from '@/app/components/ui/skeleton'
import { IssuedItemMaterial } from '@/types'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdAdd } from 'react-icons/md'

type Props = {
  onAddMaterial: (material: IssuedItemMaterial) => void
  issuedMaterials: IssuedItemMaterial[] // ⬅️ Dodane!
}

const MaterialIssueTable = ({ onAddMaterial, issuedMaterials }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number>
  >({})
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  const { data: warehouseItems, isLoading } = trpc.warehouse.getAll.useQuery()

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

  // Initialize quantities for new material list
  useEffect(() => {
    const initial: Record<string, number> = {}
    materials.forEach((m) => {
      initial[m.id] = 1
    })
    setMaterialQuantities(initial)
  }, [materials])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const handleAddMaterial = (id: string) => {
    const item = materials.find((m) => m.id === id)
    if (!item) return

    const alreadyIssued =
      issuedMaterials.find((m) => m.id === item.id)?.quantity ?? 0
    const remaining = item.quantity - alreadyIssued

    const quantityToIssue = materialQuantities[id] ?? 1
    if (quantityToIssue > remaining || quantityToIssue <= 0) return

    onAddMaterial({
      id: item.id,
      type: 'MATERIAL',
      name: item.name,
      quantity: quantityToIssue,
    })

    setMaterialQuantities((prev) => ({
      ...prev,
      [id]: 1, // reset input after issuing
    }))

    // collapse row after issuing
    setExpandedRows((prev) => prev.filter((r) => r !== id))
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4 mt-6">
      <SearchInput
        placeholder="Szukaj materiał"
        value={searchTerm}
        onChange={setSearchTerm}
      />

      {materials.map((item) => {
        const alreadyIssued =
          issuedMaterials.find((m) => m.id === item.id)?.quantity ?? 0
        const remaining = item.quantity - alreadyIssued
        const isDisabled = remaining <= 0

        return (
          <div
            key={item.id}
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
              <Badge variant="outline" className="w-fit">
                Dostępne: {remaining}
              </Badge>
            </span>

            {expandedRows.includes(item.id) ? (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  max={remaining}
                  className="w-20 h-8 text-sm"
                  value={materialQuantities[item.id] ?? 1}
                  onChange={(e) =>
                    setMaterialQuantities((prev) => ({
                      ...prev,
                      [item.id]: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddMaterial(item.id)}
                  disabled={isDisabled}
                  className="transition-all duration-300"
                >
                  Wydaj
                </Button>
              </div>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => toggleRow(item.id)}
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
