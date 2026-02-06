'use client'

import MaterialSelector from '@/app/(modules)/vectra-crm/(technician)/components/orders/completeOrder/MaterialSelector'
import { VectraMaterialUnit, VectraWarehouse } from '@prisma/client'

type MaterialDef = {
  id: string
  name: string
  unit: VectraMaterialUnit
}

type TechnicianMaterial = VectraWarehouse

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
