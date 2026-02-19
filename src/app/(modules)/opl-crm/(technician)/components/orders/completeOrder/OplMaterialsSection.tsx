'use client'

import MaterialSelector from '@/app/(modules)/opl-crm/(technician)/components/orders/completeOrder/OplMaterialSelector'
import { OplBaseWorkCode, OplMaterialUnit, OplOrderType } from '@prisma/client'

type MaterialDef = {
  id: string
  name: string
  unit: OplMaterialUnit
}

type TechnicianMaterial = {
  id: string
  name: string
  materialDefinitionId: string
  quantity: number
  sourceLabel?: string
}

type Props = {
  selected: { id: string; quantity: number }[]
  onChange: (next: { id: string; quantity: number }[]) => void
  materialDefs: MaterialDef[]
  technicianStock: TechnicianMaterial[]
  baseCode?: OplBaseWorkCode | string
  orderType: OplOrderType
}

/**
 * OplMaterialsSection
 * -----------------------------------------------------------------------------
 * Thin wrapper around MaterialSelector to keep headings and wiring out of the
 * main modal file. Keeps parent focused on business rules and submit logic.
 */

const OplMaterialsSection: React.FC<Props> = ({
  selected,
  onChange,
  materialDefs,
  technicianStock,
  baseCode,
  orderType,
}) => {
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Zużyte materiały</h4>
      <MaterialSelector
        selected={selected}
        setSelected={onChange}
        materials={materialDefs ?? []}
        technicianStock={technicianStock ?? []}
        baseCode={baseCode}
        orderType={orderType}
      />
    </div>
  )
}

export default OplMaterialsSection
