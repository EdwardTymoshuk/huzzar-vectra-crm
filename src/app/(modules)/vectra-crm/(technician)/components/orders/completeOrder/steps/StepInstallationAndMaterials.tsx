'use client'

import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { IssuedItemMaterial, VectraActivatedService } from '@/types/vectra-crm'
import { VectraMaterialUnit, VectraOrderType } from '@prisma/client'
import { AlertCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import InstallationSection from '../InstallationSection'
import MaterialSelector from '../MaterialSelector'

type UsedMaterial = { id: string; quantity: number }

interface Props {
  /** Activated services (DTV, NET, etc.) */
  activatedServices: VectraActivatedService[]

  /** Installation values */
  installValue: { pion: number; listwa: number }
  onInstallChange: (v: { pion: number; listwa: number }) => void

  /** Used materials */
  materials: UsedMaterial[]
  setMaterials: (v: UsedMaterial[]) => void

  /** Material definitions and technician stock */
  materialDefs: { id: string; name: string; unit: VectraMaterialUnit }[]
  techMaterials: IssuedItemMaterial[]

  /** Navigation handlers */
  onBack: () => void
  onNext: (data: {
    install: { pion: number; listwa: number }
    materials: UsedMaterial[]
  }) => void
  orderType?: VectraOrderType
}

/**
 * Utility: normalize strings for case-/diacritics-insensitive matching.
 * This allows robust detection of "listwa" regardless of accents/case.
 */
const normalize = (s: string): string =>
  s
    .normalize('NFD') // decompose diacritics
    .replace(/\p{Diacritic}/gu, '') // strip diacritics
    .toLowerCase()
    .trim()

/**
 * Predicate: decide whether a material name represents "listwa".
 * - By default matches any name containing substring "listwa".
 * - Adjust/extend here if you later introduce categories or codes.
 * - If you prefer strict IDs instead of name matching, you can wire a whitelist here.
 */
const isListwaName = (name: string | undefined): boolean => {
  if (!name) return false
  const n = normalize(name)
  return n.includes('listwa') // e.g., "Listwa 1m", "Listwa maskująca"
}

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
  orderType,
}: Props) => {
  const [touched, setTouched] = useState(false)
  const [showListwaWarning, setShowListwaWarning] = useState(false)

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

  /**
   * Derived flag: was any "listwa" material added?
   * - Joins selected materials with definitions to inspect names.
   * - If you need to require a specific quantity (e.g., >= installValue.listwa),
   *   you can sum quantities of listwa items here and compare against the requirement.
   */
  const hasListwaMaterial = useMemo(() => {
    if (!materials.length) return false
    const defsById = new Map(materialDefs.map((m) => [m.id, m.name]))
    return materials.some((m) => isListwaName(defsById.get(m.id)))
  }, [materials, materialDefs])

  /* Handle navigation */
  const handleNext = () => {
    setTouched(true)
    setShowListwaWarning(false)

    // Basic numeric validation
    if (installValue.pion < 0 || installValue.listwa < 0) {
      toast.error('Nieprawidłowa liczba elementów.')
      return
    }

    if (installValue.listwa > 0 && !hasListwaMaterial) {
      setShowListwaWarning(true)
      toast.error('Dodaj materiał typu "listwa", aby kontynuować.')
      return
    }

    onNext({ install: installValue, materials })
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h3 className="text-xl font-semibold text-center mt-3 mb-4">
          {`Wprowadź ${
            orderType === 'INSTALATION' ? 'elementy instalacji i' : ''
          } zużyty materiał`}
        </h3>

        {orderType === 'INSTALATION' && (
          <>
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
          </>
        )}

        <h3 className="text-xl font-semibold text-center mt-8 mb-4">
          Zużyty materiał
        </h3>

        <MaterialSelector
          selected={materials}
          setSelected={setMaterials}
          materials={selectorMaterials}
          technicianStock={selectorTechStock}
        />

        {/* Error block if listwa > 0 but no listwa material was added */}
        {showListwaWarning && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Wymagana listwa</AlertTitle>
            <AlertDescription>
              Ustawiłeś liczbę listew większą niż 0, ale w materiałach nie ma
              pozycji typu „listwa”. Dodaj odpowiednią listwę, aby przejść
              dalej.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* --- Bottom nav --- */}
      <div className="sticky bottom-0 bg-background flex gap-3 p-3">
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
