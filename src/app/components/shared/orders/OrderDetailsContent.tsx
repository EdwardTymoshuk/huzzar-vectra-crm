'use client'

/* -------------------------------------------------------------------------- */
/*  OrderDetailsContent – read-only block for presenting order details        */
/*  – No transfer / mutation logic inside                                     */
/*  – Props:                                                                  */
/*      • order – full object (shape = getOrderById)                          */
/*      • hideTechnician – when true, hides the “Technik” row (technician UI) */
/* -------------------------------------------------------------------------- */

import { Badge } from '@/app/components/ui/badge'
import {
  devicesTypeMap,
  materialUnitMap,
  statusColorMap,
  statusMap,
} from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { DeviceCategory, OrderStatus, Prisma, TimeSlot } from '@prisma/client'
import React from 'react'

/* exact payload returned by getOrderById */
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    assignedTo: { select: { id: true; name: true } }
    settlementEntries: true
    usedMaterials: { include: { material: true } }
    assignedEquipment: { include: { warehouse: true } }
    services: true
  }
}>

type Props = {
  order: OrderWithDetails
  hideTechnician?: boolean
  isConfirmed?: boolean
}

/* -------------------------------------------------------------------------- */

const OrderDetailsContent = ({
  order,
  hideTechnician = false,
  isConfirmed = false,
}: Props) => {
  // Destructure order (read-only view model)
  const {
    orderNumber,
    city,
    street,
    operator,
    date,
    timeSlot,
    status,
    assignedTo,
    closedAt,
    settlementEntries,
    usedMaterials,
    assignedEquipment,
    services,
    failureReason,
    notes,
  } = order

  // Split equipment into issued vs collected
  const issued = assignedEquipment.filter(
    (e) => e.warehouse.status !== 'COLLECTED_FROM_CLIENT'
  )
  const collected = assignedEquipment.filter(
    (e) => e.warehouse.status === 'COLLECTED_FROM_CLIENT'
  )

  // Services without device link (e.g., ATV, TEL)
  const standalone = services.filter((s) => !s.deviceId)

  return (
    <div className="space-y-6 text-sm w-full">
      {/* ===== Header ===== */}
      <div className="space-y-1">
        <HeaderRow label="Nr zlecenia" value={orderNumber} />
        <HeaderRow label="Adres" value={`${city}, ${street}`} />
        <HeaderRow label="Operator" value={operator} />
        <HeaderRow label="Data" value={new Date(date).toLocaleDateString()} />
        <HeaderRow
          label="Slot czasowy"
          value={getTimeSlotLabel(timeSlot as TimeSlot)}
        />
        <HeaderRow
          label="Status"
          value={
            <div className="flex items-center gap-2">
              <Badge className={statusColorMap[status] + ' w-fit'}>
                {statusMap[status]}
              </Badge>
              {isConfirmed && (
                <Badge className="bg-success w-fit">ZATWIERDZONE</Badge>
              )}
            </div>
          }
        />
        {!hideTechnician && (
          <HeaderRow label="Technik" value={assignedTo?.name || 'Nieznany'} />
        )}
        {closedAt && (
          <HeaderRow
            label="Data zakończenia"
            value={new Date(closedAt).toLocaleString()}
          />
        )}
      </div>

      {/* ===== Work codes ===== */}
      <Section
        title="Kody pracy"
        list={settlementEntries.map((s) => `${s.code} × ${s.quantity}`)}
      />

      {/* ===== Materials ===== */}
      <Section
        title="Zużyty materiał"
        list={usedMaterials.map(
          (m) => `${m.material.name} × ${m.quantity} ${materialUnitMap[m.unit]}`
        )}
      />

      {/* ===== Issued equipment (+ measurements) ===== */}
      <section className="pt-4 border-t border-border space-y-1">
        <h4 className="font-semibold">Sprzęt wydany</h4>
        {issued.length ? (
          <ul className="list-none list-inside">
            {issued.map((entry) => {
              const meas = services.find(
                (s) => s.deviceId === entry.warehouse.id
              )
              return (
                <li key={entry.id} className="space-y-0.5">
                  {
                    devicesTypeMap[
                      (entry.warehouse.category || 'OTHER') as DeviceCategory
                    ]
                  }{' '}
                  {entry.warehouse.name}
                  {entry.warehouse.serialNumber &&
                    ` (SN: ${entry.warehouse.serialNumber})`}
                  {/* measurement sub-row */}
                  {meas && (
                    <div className="text-xs text-muted-foreground ml-4">
                      {meas.speedTest && (
                        <div>Prędkość: {meas.speedTest} Mb/s</div>
                      )}
                      {(meas.usDbmDown !== null || meas.usDbmUp !== null) && (
                        <div>
                          {meas.usDbmDown !== null && (
                            <>DS: {meas.usDbmDown} dBm </>
                          )}
                          {meas.usDbmUp !== null && <>US: {meas.usDbmUp} dBm</>}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </section>

      {/* ===== Collected equipment ===== */}
      <Section
        title="Sprzęt odebrany od klienta"
        list={collected.map((e) => {
          const prefix =
            devicesTypeMap[(e.warehouse.category || 'OTHER') as DeviceCategory]
          const sn = e.warehouse.serialNumber
            ? ` (SN: ${e.warehouse.serialNumber})`
            : ''
          return `${prefix} ${e.warehouse.name}${sn}`
        })}
      />

      {/* ===== Additional standalone services ===== */}
      {standalone.length > 0 && (
        <Section
          title="Dodatkowe usługi"
          list={standalone.map((s) => {
            const label =
              s.type === 'ATV' ? 'ATV' : s.type === 'TEL' ? 'TEL' : s.type
            return s.notes ? `${label}: ${s.notes}` : label
          })}
        />
      )}

      {/* ===== Not completed reason ===== */}
      {status === OrderStatus.NOT_COMPLETED && (
        <Section title="Powód niewykonania" list={[failureReason ?? '—']} />
      )}

      {/* ===== Notes ===== */}
      {notes && <Section title="Uwagi" list={[notes]} />}
    </div>
  )
}

export default OrderDetailsContent

/* Utility section component ------------------------------------------------- */
// Renders a titled list; shows a dash when the list is empty.
const Section = ({ title, list }: { title: string; list: string[] }) => (
  <section className="pt-4 border-t border-border space-y-1">
    <h4 className="font-semibold">{title}</h4>
    {list.length ? (
      <ul className="list-none list-inside">
        {list.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    ) : (
      <span className="text-muted-foreground">—</span>
    )}
  </section>
)

/* HeaderRow helper ---------------------------------------------------------- */
// Use <div> instead of <p> so that block elements (e.g. Badge) are valid children.
const HeaderRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="flex items-center gap-2">
    <span className="font-semibold">{label}:</span>
    <span className="inline-flex items-center">{value}</span>
  </div>
)
