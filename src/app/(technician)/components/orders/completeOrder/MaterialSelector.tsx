'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { materialUnitMap } from '@/lib/constants'
import { MaterialUnit } from '@prisma/client'
import { useState } from 'react'
import { MdDelete } from 'react-icons/md'
import SearchableSelector from '../../SearchableSelector'

type Props = {
  selected: { id: string; quantity: number }[]
  setSelected: (items: { id: string; quantity: number }[]) => void
  materials: {
    id: string
    name: string
    unit: MaterialUnit
  }[]
  technicianStock: {
    name: string
    id: string
    quantity: number
  }[]
}

/**
 * MaterialSelector component for selecting and managing used materials in an order.
 * - Allows searching and selecting a material from the database.
 * - Supports adding a specified quantity to the current selection.
 * - Renders a list of selected materials with the ability to remove items.
 * - Handles edge cases such as exceeding technician stock.
 *
 * UI details:
 * - Selected material in the combobox (button) is truncated to a single line with ellipsis.
 * - Material names in the dropdown and summary list wrap onto multiple lines for long values.
 * - Clear user feedback for out-of-stock scenarios.
 *
 */
const MaterialSelector = ({
  selected,
  setSelected,
  materials,
  technicianStock,
}: Props) => {
  // State for currently selected material and quantity input
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null
  )
  const [quantity, setQuantity] = useState<number>(1)

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId)
  const materialName = selectedMaterial?.name
  const availableQty = technicianStock
    .filter((s) => s.name === materialName)
    .reduce((sum, s) => sum + s.quantity, 0)

  /**
   * Add the currently selected material and quantity to the list.
   * If already present, increments quantity.
   * Resets the selection after addition.
   */
  const handleAdd = () => {
    if (!selectedMaterialId || quantity <= 0) return
    const existing = selected.find((m) => m.id === selectedMaterialId)
    if (existing) {
      setSelected(
        selected.map((m) =>
          m.id === selectedMaterialId
            ? { ...m, quantity: m.quantity + quantity }
            : m
        )
      )
    } else {
      setSelected([...selected, { id: selectedMaterialId, quantity }])
    }
    setSelectedMaterialId(null)
    setQuantity(1)
  }

  /**
   * Remove a material from the list by its ID.
   * @param id - The material ID to remove.
   */
  const handleRemove = (id: string) => {
    setSelected(selected.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-4 relative z-0 min-w-0 w-full">
      {/* Combobox for searching and selecting materials */}
      <SearchableSelector
        options={materials.map((m) => ({ label: m.name, value: m.id }))}
        value={selectedMaterialId}
        onChange={(val) => setSelectedMaterialId(val)}
        placeholder="Wyszukaj materiał"
        className="min-w-0"
      />

      {/* Quantity input and add button for the currently selected material */}
      {selectedMaterialId && selectedMaterial && (
        <div className="flex gap-4 items-end w-full min-w-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Material name wraps to multiple lines */}
            <span className="text-sm font-semibold text-foreground min-w-0 whitespace-normal break-words">
              {selectedMaterial.name}
            </span>
            <span className="text-xs text-muted-foreground">
              Dostępne: {availableQty} {materialUnitMap[selectedMaterial.unit]}
            </span>
          </div>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-24 flex-shrink-0"
          />
          <Button size="sm" onClick={handleAdd} className="flex-shrink-0">
            Dodaj
          </Button>
        </div>
      )}

      {/* Render list of added materials */}
      {selected.length > 0 && (
        <div className="pt-4 space-y-2">
          <p className="font-medium">Dodane materiały</p>
          <div className="space-y-2">
            {selected.map((item) => {
              const material = materials.find((m) => m.id === item.id)
              const stockQty = technicianStock
                .filter((s) => s.name === material?.name)
                .reduce((sum, s) => sum + s.quantity, 0)
              const isOver = item.quantity > stockQty

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center border rounded px-4 py-2 text-sm bg-muted text-muted-foreground min-w-0"
                >
                  <div className="flex flex-col min-w-0">
                    {/* Material name wraps to multiple lines */}
                    <span className="font-semibold text-foreground whitespace-normal break-words min-w-0">
                      {material?.name}
                    </span>
                    <span className="text-xs">
                      {item.quantity}{' '}
                      {material ? materialUnitMap[material.unit] : ''}
                      {isOver && (
                        <span className="text-danger font-medium ml-2">
                          ❗Brak na stanie
                        </span>
                      )}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(item.id)}
                    className="text-danger"
                    aria-label="Usuń materiał"
                  >
                    <MdDelete />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialSelector
