'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Skeleton } from '@/app/components/ui/skeleton'
import { IssuedItemMaterial } from '@/types'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  /** Source warehouse location to fetch materials from.
   * If not provided, fallback to technician mode (self stock).
   */
  fromLocationId?: string
  onAdd: (material: IssuedItemMaterial) => void
  picked: IssuedItemMaterial[]
}

/**
 * MaterialTransferTable
 * --------------------------------------------------------
 * • Universal: can fetch from warehouse (locationId) or technician stock.
 * • Allows searching, expanding row to input quantity, and adding to selection.
 */
const MaterialTransferTable = ({ fromLocationId, onAdd, picked }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<string[]>([])
  const [quantityById, setQuantityById] = useState<Record<string, number>>({})
  const [addingId, setAddingId] = useState<string | null>(null)

  /** Backend fetch:
   * - If fromLocationId given → fetch warehouse stock
   * - Otherwise → fetch technician stock (self)
   */
  const { data: stock, isLoading } = fromLocationId
    ? trpc.warehouse.getAll.useQuery({
        locationId: fromLocationId,
        itemType: 'MATERIAL',
      })
    : trpc.warehouse.getTechnicianStock.useQuery({
        technicianId: 'self',
        itemType: 'MATERIAL',
      })

  /** Filter results by search term */
  const visibleMaterials = useMemo(
    () =>
      (stock ?? []).filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [stock, searchTerm]
  )

  /** Initialise quantity = 1 for every row when list changes */
  useEffect(() => {
    const initial: Record<string, number> = {}
    visibleMaterials.forEach((m) => (initial[m.id] = 1))
    setQuantityById(initial)
  }, [visibleMaterials])

  const toggleRow = (id: string) =>
    setExpandedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handleAdd = (id: string) => {
    const material = visibleMaterials.find((m) => m.id === id)
    if (!material) return

    const alreadyPicked = picked.find((m) => m.id === id)?.quantity ?? 0
    const remaining = material.quantity - alreadyPicked
    const qty = quantityById[id] ?? 1

    if (qty <= 0 || qty > remaining) {
      toast.error('Nieprawidłowa ilość.')
      return
    }

    if (!material.materialDefinitionId) {
      console.error('Material without materialDefinitionId in warehouse!', material)
      return
    }

    setAddingId(id)

    onAdd({
      id: material.id,
      type: 'MATERIAL',
      name: material.name,
      materialDefinitionId: material.materialDefinitionId, 
      quantity: qty,
    })
    setQuantityById((prev) => ({ ...prev, [id]: 1 }))
    setExpandedMaterialIds((prev) => prev.filter((x) => x !== id))
    setAddingId(null)
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4 mt-6">
      <SearchInput
        placeholder="Szukaj materiał"
        value={searchTerm}
        onChange={setSearchTerm}
      />

      {visibleMaterials.map((material) => {
        const alreadyPicked =
          picked.find((p) => p.id === material.id)?.quantity ?? 0
        const remaining = material.quantity - alreadyPicked
        const rowDisabled = remaining <= 0

        return (
          <div
            key={material.id}
            className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${
              rowDisabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {/* Left side: name + remaining stock */}
            <span className="flex flex-col">
              <Highlight
                searchWords={[searchTerm]}
                autoEscape
                textToHighlight={material.name}
              />
              <Badge variant="secondary" className="w-fit">
                Stan: {remaining}
              </Badge>
            </span>

            {/* Right side: quantity input or expand button */}
            {expandedMaterialIds.includes(material.id) ? (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  max={remaining}
                  className="w-20 h-8 text-sm"
                  value={quantityById[material.id] ?? 1}
                  onChange={(e) =>
                    setQuantityById((prev) => ({
                      ...prev,
                      [material.id]: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAdd(material.id)}
                  disabled={addingId === material.id}
                >
                  {addingId === material.id ? 'Dodawanie…' : 'Dodaj'}
                </Button>
              </div>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => toggleRow(material.id)}
                disabled={rowDisabled}
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

export default MaterialTransferTable
