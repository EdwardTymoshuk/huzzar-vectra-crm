'use client'

import SearchableSelector from '@/app/components/fields/SearchableSelector'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { materialUnitMap } from '@/lib/constants'
import { OplMaterialUnit, OplOrderType } from '@prisma/client'
import { useMemo, useState } from 'react'
import { MdAdd, MdDelete, MdOutlineAutoAwesome, MdRemove } from 'react-icons/md'

type MaterialRow = {
  id: string
  name: string
  unit: OplMaterialUnit
}

type StockRow = {
  id: string
  name: string
  quantity: number
  materialDefinitionId?: string
  sourceLabel?: string
}

type Props = {
  selected: { id: string; quantity: number }[]
  setSelected: (items: { id: string; quantity: number }[]) => void
  materials: MaterialRow[]
  technicianStock: StockRow[]
  baseCode?: string
  orderType: OplOrderType
}

const FREQUENT_BY_BASE: Record<string, string[]> = {
  ZJD: [
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'GNI.ŚWIATŁ.ABON-2xSCA',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/25M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/35M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/45M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/55M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/1M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/3M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/5M/BIAŁY',
    'TAŚMA OSTRZEGAWCZA TO-OPT/10 UW.KAB.OPTO',
    'MUFA NAPRAWCZA KABLA DAC',
    'PESZEL NIEPALNY Z PILOTEM FI 25/19',
    'RURA RL FI18',
    'UCHWYT DO RUR PCV FI18',
    'ZŁĄCZKA DO RUR RL FI18',
  ],
  W1: [
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/15M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/25M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/35M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/45M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/55M/BIAŁY',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'KAB.ABON.SC/APC/657B3/1M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/3M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/5M/BIAŁY',
  ],
  W4: [
    'KAB.ABON.SC/APC/657B3/1M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/3M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/5M/BIAŁY',
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'GNI.ŚWIATŁ.ABON-2xSCA',
  ],
  W5: [
    'KAB.ABON.SC/APC/657B3/1M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/3M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/5M/BIAŁY',
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'GNI.ŚWIATŁ.ABON-2xSCA',
    'PRZEW.KOMP.UTP LSOH 100OM 4X2X0,5 KAT.5E',
    'WTYK MODULARNY PRZEW.PŁ.WM 8P8C FD RJ45',
  ],
  ZJN: [
    'ZAWIESIE ODCIĄGOWE UOAT-MAŁPKA',
    'KAB.ABON.MADC 3,5MM ZŁĄCZ.SC/APC DŁ.50M',
    'KAB.ABON.MADC 3,5MM ZŁĄCZ.SC/APC DŁ.100M',
    'KAB.ABON.MADC 3,5MM ZŁĄCZ.SC/APC DŁ.150M',
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'GNI.ŚWIATŁ.ABON-2xSCA',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/25M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/35M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/45M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/55M/BIAŁY',
    'PESZEL NIEPALNY Z PILOTEM FI 25/19',
    'RURA RL FI18',
    'UCHWYT DO RUR PCV FI18',
    'ZŁĄCZKA DO RUR RL FI18',
  ],
  DEFAULT: [
    'OSŁONKA SPAWU ŚWIATŁ.OS-45',
    'PIGTAIL 652 0,9 SC/APC DŁ.2,5M',
    'GNI.ŚWIATŁ.ABON-2xSCA',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/25M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/35M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/45M/BIAŁY',
    'GNI.ŚWIATŁ-PIGT/B3/1XAPC/1J/55M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/1M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/3M/BIAŁY',
    'KAB.ABON.SC/APC/657B3/5M/BIAŁY',
  ],
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

const resolvePriorityNames = (baseCode?: string): string[] => {
  const base = (baseCode ?? '').toUpperCase()
  if (base === 'W1' || base === 'W2' || base === 'W3') {
    return FREQUENT_BY_BASE.W1
  }
  return FREQUENT_BY_BASE[base] ?? FREQUENT_BY_BASE.DEFAULT
}

const OplMaterialSelector = ({
  selected,
  setSelected,
  materials,
  technicianStock,
  baseCode,
  orderType,
}: Props) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  )
  const [quantityInput, setQuantityInput] = useState<string>('1')

  const stockById = useMemo(() => {
    const map = new Map<string, number>()
    technicianStock.forEach((row) => {
      const key = row.materialDefinitionId ?? row.id
      map.set(key, (map.get(key) ?? 0) + (row.quantity ?? 0))
    })
    return map
  }, [technicianStock])

  const stockByIdBySource = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    technicianStock.forEach((row) => {
      const key = row.materialDefinitionId ?? row.id
      const source = row.sourceLabel ?? 'Stan technika'
      const bySource = map.get(key) ?? new Map<string, number>()
      bySource.set(source, (bySource.get(source) ?? 0) + (row.quantity ?? 0))
      map.set(key, bySource)
    })
    return map
  }, [technicianStock])

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId)
  const materialName = selectedMaterial?.name

  const availableQty = useMemo(() => {
    if (!selectedMaterialId) return 0
    const direct = stockById.get(selectedMaterialId) ?? 0
    if (direct > 0) return direct

    return technicianStock
      .filter((s) => normalize(s.name) === normalize(materialName ?? ''))
      .reduce((sum, s) => sum + (s.quantity ?? 0), 0)
  }, [selectedMaterialId, stockById, technicianStock, materialName])

  const availableQtyBySource = useMemo(() => {
    if (!selectedMaterialId) return []
    const rows = stockByIdBySource.get(selectedMaterialId)
    if (rows) return Array.from(rows.entries())

    const fallback = new Map<string, number>()
    technicianStock
      .filter((s) => normalize(s.name) === normalize(materialName ?? ''))
      .forEach((s) => {
        const source = s.sourceLabel ?? 'Stan technika'
        fallback.set(source, (fallback.get(source) ?? 0) + (s.quantity ?? 0))
      })

    return Array.from(fallback.entries())
  }, [selectedMaterialId, stockByIdBySource, technicianStock, materialName])

  const priorityRows = useMemo(() => {
    const priorityNames = resolvePriorityNames(baseCode)
    const normalizedPriority = priorityNames.map(normalize)
    const byName = new Map(materials.map((m) => [normalize(m.name), m]))
    const ordered: MaterialRow[] = []

    normalizedPriority.forEach((name) => {
      const found = byName.get(name)
      if (found) ordered.push(found)
    })

    return ordered
  }, [materials, baseCode])

  const prioritySet = useMemo(
    () => new Set(priorityRows.map((row) => row.id)),
    [priorityRows],
  )

  const sortedOptions = useMemo(() => {
    return [...materials].sort((a, b) => {
      const ap = prioritySet.has(a.id) ? 0 : 1
      const bp = prioritySet.has(b.id) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.name.localeCompare(b.name, 'pl')
    })
  }, [materials, prioritySet])

  const addMaterial = (materialId: string, qty: number) => {
    if (!materialId || qty <= 0) return

    const existing = selected.find((m) => m.id === materialId)
    if (existing) {
      setSelected(
        selected.map((m) =>
          m.id === materialId ? { ...m, quantity: m.quantity + qty } : m,
        ),
      )
      return
    }

    setSelected([...selected, { id: materialId, quantity: qty }])
  }

  const getSelectedQty = (materialId: string): number =>
    selected.find((m) => m.id === materialId)?.quantity ?? 0

  const setMaterialQty = (materialId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setSelected(selected.filter((m) => m.id !== materialId))
      return
    }

    const exists = selected.some((m) => m.id === materialId)
    if (!exists) {
      setSelected([...selected, { id: materialId, quantity: nextQty }])
      return
    }

    setSelected(
      selected.map((m) =>
        m.id === materialId ? { ...m, quantity: nextQty } : m,
      ),
    )
  }

  const handleAdd = () => {
    const parsedQty = Number(quantityInput)
    if (!selectedMaterialId || !Number.isFinite(parsedQty) || parsedQty <= 0)
      return
    addMaterial(selectedMaterialId, parsedQty)
    setSelectedMaterialId(null)
    setQuantityInput('1')
  }

  const handleRemove = (id: string) => {
    setSelected(selected.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-4">
      {priorityRows.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <MdOutlineAutoAwesome className="h-5 w-5 text-primary" />
            <p className="font-medium">
              {orderType === 'SERVICE'
                ? 'Najczęściej używane dla serwisu'
                : `Najczęściej używane przy ${baseCode ?? 'standardzie'}`}
            </p>
          </div>

          <div className="space-y-2">
            {priorityRows.map((row) => {
              const available = stockById.get(row.id) ?? 0
              const availableBySource = Array.from(
                stockByIdBySource.get(row.id)?.entries() ?? []
              )
              const selectedQty = getSelectedQty(row.id)
              return (
                <div
                  key={`fav-${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      {row.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stan: {available} {materialUnitMap[row.unit]}
                    </p>
                    {availableBySource.map(([source, qty]) => (
                      <p key={`${row.id}-${source}`} className="text-xs text-muted-foreground">
                        {source}: {qty} {materialUnitMap[row.unit]}
                      </p>
                    ))}
                  </div>
                  {selectedQty <= 0 ? (
                    <Button size="sm" onClick={() => addMaterial(row.id, 1)}>
                      Dodaj
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant={selectedQty === 1 ? 'ghost' : 'outline'}
                        className="h-8 w-8"
                        onClick={() =>
                          setMaterialQty(
                            row.id,
                            selectedQty === 1 ? 0 : selectedQty - 1,
                          )
                        }
                      >
                        {selectedQty === 1 ? (
                          <MdDelete className="text-danger h-4 w-4" />
                        ) : (
                          <MdRemove className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="w-8 text-center text-sm font-semibold">
                        {selectedQty}
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setMaterialQty(row.id, selectedQty + 1)}
                      >
                        <MdAdd className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-3">
        <p className="font-medium">Wyszukaj materiał</p>
        <SearchableSelector
          options={sortedOptions.map((m) => ({ label: m.name, value: m.id }))}
          value={selectedMaterialId}
          onChange={(val) => setSelectedMaterialId(val)}
          placeholder="Wpisz nazwę materiału"
          className="min-w-0"
        />

        {selectedMaterialId && selectedMaterial && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,90px,auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold break-words">
                {selectedMaterial.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Dostępne: {availableQty}{' '}
                {materialUnitMap[selectedMaterial.unit]}
              </p>
              {availableQtyBySource.map(([source, qty]) => (
                <p key={`${selectedMaterial.id}-${source}`} className="text-xs text-muted-foreground">
                  {source}: {qty} {materialUnitMap[selectedMaterial.unit]}
                </p>
              ))}
            </div>

            <Input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setQuantityInput('')
                  return
                }

                const digitsOnly = raw.replace(/[^\d]/g, '')
                const normalized = digitsOnly.replace(/^0+(\d)/, '$1')
                setQuantityInput(normalized)
              }}
            />

            <Button
              onClick={handleAdd}
              disabled={!quantityInput || Number(quantityInput) <= 0}
            >
              Dodaj
            </Button>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Dodane materiały</p>
          <div className="space-y-2">
            {selected.map((item) => {
              const material = materials.find((m) => m.id === item.id)
              if (!material) return null

              const stockQty = stockById.get(item.id) ?? 0
              const stockQtyBySource = Array.from(
                stockByIdBySource.get(item.id)?.entries() ?? []
              )

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{material.name}</p>
                    {stockQty <= 0 ? (
                      <p className="text-xs text-warning font-medium">
                        ! Brak na stanie
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          Stan: {stockQty} {materialUnitMap[material.unit]}
                        </p>
                        {stockQtyBySource.map(([source, qty]) => (
                          <p
                            key={`${item.id}-${source}`}
                            className="text-xs text-muted-foreground"
                          >
                            {source}: {qty} {materialUnitMap[material.unit]}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium">
                      {item.quantity} {materialUnitMap[material.unit]}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(item.id)}
                      className="text-danger hover:text-danger"
                      aria-label="Usuń materiał"
                    >
                      <MdDelete />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default OplMaterialSelector
