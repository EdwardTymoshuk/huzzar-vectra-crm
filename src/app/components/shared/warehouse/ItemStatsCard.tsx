'use client'

/* ---------------------------------------------------------------------
 * ItemStatsCard
 * Pure presentation layer for item statistics used in both panels.
 * UI strings are Polish.  Behaviour is controlled by optional props:
 *  • showWarehouse   – display central / personal warehouse block
 *  • showTechnician  – display global technicians block
 * Fields set to `undefined` + flag=false → entire block is hidden.
 * ------------------------------------------------------------------- */

import { Card } from '@/app/components/ui/card'

interface Props {
  /* basic info */
  name: string
  categoryOrIndex: string
  price: string // already formatted
  isDevice: boolean

  /* warehouse block */
  warehouseQty?: number
  warehouseValue?: number
  showWarehouse?: boolean

  /* technicians block */
  technicianQty?: number
  technicianValue?: number
  technicianLabel?: string
  showTechnician?: boolean

  /* always-visible */
  usedInOrders: number
}

const ItemStatsCard = ({
  /* basic */
  name,
  categoryOrIndex,
  price,
  isDevice,
  /* warehouse */
  warehouseQty,
  warehouseValue,
  showWarehouse = true,
  /* technicians */
  technicianQty,
  technicianValue,
  technicianLabel = 'Stan techników',
  showTechnician = true,
  /* orders */
  usedInOrders,
}: Props) => (
  <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between">
    {/* ─────────────────── Left column ─ basic info ─────────────────── */}
    <div className="flex flex-col space-y-4 w-full md:w-1/2">
      <Row label="Nazwa" value={name} />
      <Row label={isDevice ? 'Kategoria' : 'Indeks'} value={categoryOrIndex} />
      <Row label="Cena jednostkowa" value={`${price} zł`} />
    </div>

    {/* ─────────────────── Right column ─ stock info ────────────────── */}
    <div className="flex flex-col space-y-4 w-full md:w-1/2">
      {showWarehouse && warehouseQty !== undefined && (
        <StockBlock
          label="Stan magazynowy"
          qty={warehouseQty}
          value={!isDevice ? warehouseValue : undefined}
        />
      )}

      {showTechnician && technicianQty !== undefined && (
        <StockBlock
          label={technicianLabel}
          qty={technicianQty}
          value={!isDevice ? technicianValue : undefined}
        />
      )}

      <Row label="Wydane na zleceniach" value={usedInOrders.toString()} />
    </div>
  </Card>
)

/* ---------- helpers ------------------------------------------------ */

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2 items-center">
    <p className="font-bold uppercase text-sm">{label}:</p>
    <p className="text-base">{value}</p>
  </div>
)

const StockBlock = ({
  label,
  qty,
  value,
}: {
  label: string
  qty: number
  value?: number
}) => (
  <div className="flex flex-col">
    <Row label={label} value={qty.toString()} />
    {value !== undefined && (
      <p className="text-xs text-muted-foreground">
        Wartość: {value.toFixed(2)} zł
      </p>
    )}
  </div>
)

export default ItemStatsCard
