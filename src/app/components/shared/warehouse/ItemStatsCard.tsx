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
  warehouseByLocation?: { id: string; name: string; qty: number }[]
  showWarehouse?: boolean

  /* technicians block */
  technicianQty?: number
  technicianValue?: number
  technicianLabel?: string
  showTechnician?: boolean

  /* always-visible */
  usedInOrders: number
  totalAvailable?: number
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
  warehouseByLocation,
  showWarehouse = true,
  /* technicians */
  technicianQty,
  technicianValue,
  technicianLabel = 'Stan techników',
  showTechnician = true,
  /* orders */
  usedInOrders,
  totalAvailable,
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
          breakdown={warehouseByLocation}
        />
      )}

      {showTechnician && technicianQty !== undefined && (
        <StockBlock
          label={technicianLabel}
          qty={technicianQty}
          value={!isDevice ? technicianValue : undefined}
        />
      )}

      {totalAvailable !== undefined && (
        <Row label="Stan ogólny" value={totalAvailable.toString()} />
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
  breakdown,
}: {
  label: string
  qty: number
  value?: number
  breakdown?: { id: string; name: string; qty: number }[]
}) => (
  <div className="flex flex-col space-y-1">
    <Row label={label} value={qty.toString()} />
    {value !== undefined && (
      <p className="text-xs text-muted-foreground">
        Wartość: {value.toFixed(2)} zł
      </p>
    )}
    {breakdown && breakdown.length > 0 && (
      <div className="pl-4 space-y-0.5">
        {breakdown.map((loc) => (
          <p key={loc.id} className="text-sm text-muted-foreground">
            - {loc.name}: {loc.qty}
          </p>
        ))}
      </div>
    )}
  </div>
)

export default ItemStatsCard
