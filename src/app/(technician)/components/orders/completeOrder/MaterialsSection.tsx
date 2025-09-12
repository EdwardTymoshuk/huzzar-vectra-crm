'use client'

import MaterialSelector from '@/app/(technician)/components/orders/completeOrder/MaterialSelector'
import { MaterialUnit, Warehouse } from '@prisma/client'

type MaterialDef = {
  id: string
  name: string
  unit: MaterialUnit
}

type TechnicianMaterial = Warehouse

type Props = {
  selected: { id: string; quantity: number }[]
  onChange: (next: { id: string; quantity: number }[]) => void
  materialDefs: MaterialDef[]
  technicianStock: TechnicianMaterial[]
}

/**
 * MaterialsSection
 * -----------------------------------------------------------------------------
 * Thin wrapper around MaterialSelector to keep headings and wiring out of the
 * main modal file. Keeps parent focused on business rules and submit logic.
 */

const MaterialsSection: React.FC<Props> = ({
  selected,
  onChange,
  materialDefs,
  technicianStock,
}) => {
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Zużyte materiały</h4>
      <MaterialSelector
        selected={selected}
        setSelected={onChange}
        materials={materialDefs ?? []}
        technicianStock={technicianStock ?? []}
      />
    </div>
  )
}

export default MaterialsSection
