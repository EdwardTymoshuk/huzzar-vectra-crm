'use client'

import { Button } from '@/app/components/ui/button'
import { ActivatedService, IssuedItemMaterial } from '@/types'
import { MaterialUnit } from '@prisma/client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import InstallationSection from '../InstallationSection'
import MaterialSelector from '../MaterialSelector'

type UsedMaterial = { id: string; quantity: number }

interface Props {
  /** Activated services (DTV, NET, etc.) */
  activatedServices: ActivatedService[]

  /** Installation values */
  installValue: { pion: number; listwa: number }
  onInstallChange: (v: { pion: number; listwa: number }) => void

  /** Used materials */
  materials: UsedMaterial[]
  setMaterials: (v: UsedMaterial[]) => void

  /** Material definitions and technician stock */
  materialDefs: { id: string; name: string; unit: MaterialUnit }[]
  techMaterials: IssuedItemMaterial[]

  /** Navigation handlers */
  onBack: () => void
  onNext: (data: {
    install: { pion: number; listwa: number }
    materials: UsedMaterial[]
  }) => void
}

/**
 * StepInstallationAndMaterials
 * - Handles installation elements and used materials.
 * - Validates positive numeric inputs.
 * - Optimized for mobile (scrollable + sticky nav).
 */
const StepInstallationAndMaterials = ({
  activatedServices,
  installValue,
  onInstallChange,
  materials,
  setMaterials,
  materialDefs,
  techMaterials,
  onBack,
  onNext,
}: Props) => {
  const [touched, setTouched] = useState(false)

  /* Prepare data for MaterialSelector */
  const selectorMaterials = useMemo(
    () => materialDefs.map((d) => ({ id: d.id, name: d.name, unit: d.unit })),
    [materialDefs]
  )

  const selectorTechStock = useMemo(() => {
    const defById = new Map(materialDefs.map((d) => [d.id, d]))
    const qtyByDefId = new Map<string, number>()
    for (const item of techMaterials) {
      const prev = qtyByDefId.get(item.materialDefinitionId) ?? 0
      qtyByDefId.set(item.materialDefinitionId, prev + (item.quantity ?? 0))
    }
    const rows: { id: string; name: string; quantity: number }[] = []
    for (const [defId, qty] of qtyByDefId.entries()) {
      const def = defById.get(defId)
      if (def) rows.push({ id: def.id, name: def.name, quantity: qty })
    }
    return rows
  }, [materialDefs, techMaterials])

  /* Handle navigation */
  const handleNext = () => {
    setTouched(true)

    if (installValue.pion < 0 || installValue.listwa < 0) {
      toast.error('Nieprawidłowa liczba elementów.')
      return
    }

    onNext({ install: installValue, materials })
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* --- Installation --- */}
        <h3 className="text-xl font-semibold text-center mt-3 mb-4">
          Wprowadź elementy instalacji i materiał
        </h3>
        <InstallationSection
          activatedServices={activatedServices}
          value={installValue}
          onChangeAction={onInstallChange}
        />

        {touched && (installValue.pion < 0 || installValue.listwa < 0) && (
          <p className="text-danger text-sm text-center mt-3">
            Wartości nie mogą być ujemne.
          </p>
        )}

        {/* --- Materials --- */}
        <h3 className="text-xl font-semibold text-center mt-8 mb-4">
          Zużyty materiał
        </h3>

        <MaterialSelector
          selected={materials}
          setSelected={setMaterials}
          materials={selectorMaterials}
          technicianStock={selectorTechStock}
        />
      </div>

      {/* --- Bottom nav --- */}
      <div className="sticky bottom-0 bg-background border-t p-3 flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>
        <Button className="flex-1 h-12" onClick={handleNext}>
          Dalej
        </Button>
      </div>
    </div>
  )
}

export default StepInstallationAndMaterials
