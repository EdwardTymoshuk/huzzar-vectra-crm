'use client'

import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { collectOrderEquipment } from '@/utils/orders/collectOrderEquipment'
import { DeviceCategory, OrderStatus, Prisma } from '@prisma/client'
import React from 'react'

/** Exact payload returned by getOrderById */
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    assignedTo: { select: { id: true; name: true } }
    settlementEntries: {
      include: {
        rate: true
      }
    }
    usedMaterials: { include: { material: true } }
    assignedEquipment: {
      include: {
        warehouse: {
          include: {
            history: true
          }
        }
      }
    }
    services: {
      include: {
        extraDevices: true
      }
    }
  }
}>

type Props = {
  order: OrderWithDetails
  hideTechnician?: boolean
  isConfirmed?: boolean
}

/**
 * OrderDetailsContent
 * Displays detailed information about a single order (for both admin and technician views).
 * - Shows codes, materials, issued and collected equipment, services, notes, etc.
 * - Automatically handles both INSTALLATION and SERVICE/OUTAGE orders.
 */
const OrderDetailsContent = ({ order }: Props) => {
  const {
    status,
    completedAt,
    settlementEntries,
    usedMaterials,
    assignedEquipment,
    services,
    failureReason,
    notes,
    attemptNumber,
    operator,
  } = order

  // Collected = sprzęt odebrany od klienta
  const collected = assignedEquipment.filter((e) =>
    e.warehouse.history.some((h) => h.action === 'COLLECTED_FROM_CLIENT')
  )

  return (
    <div className="space-y-6 text-sm w-full">
      {/* ===== Header ===== */}
      <div className="space-y-1">
        {completedAt && (
          <HeaderRow
            label="Data zakończenia"
            value={new Date(completedAt).toLocaleString()}
          />
        )}
        {attemptNumber && <HeaderRow label="Wejście" value={attemptNumber} />}
        <HeaderRow label="Operator" value={operator} />
      </div>

      {/* ===== Work codes ===== */}
      <Section
        title="Kody pracy"
        list={settlementEntries.map((s) => `${s.code} × ${s.quantity}`)}
      />

      {/* ===== Issued equipment ===== */}
      <section className="pt-4 border-t border-border space-y-1">
        <h4 className="font-semibold">Sprzęt wydany</h4>

        {(() => {
          const equipment = collectOrderEquipment(order)

          if (equipment.length === 0)
            return <span className="text-muted-foreground">—</span>

          return (
            <ul className="list-none list-inside">
              {equipment.map((e) => {
                const category =
                  e.category && e.category !== 'OTHER' ? e.displayCategory : ''

                return (
                  <li key={e.id} className="mt-1">
                    {category}
                    {e.name.toUpperCase()}
                    {e.serial && ` (SN: ${e.serial.toUpperCase()})`}
                    {e.client && ' [sprzęt klienta]'}
                  </li>
                )
              })}
            </ul>
          )
        })()}
      </section>

      {/* ===== Collected equipment ===== */}
      <Section
        title="Sprzęt odebrany od klienta"
        list={collected.map((e) => {
          const showCat = e.warehouse.category !== 'OTHER'
          const prefix = showCat
            ? devicesTypeMap[
                (e.warehouse.category || 'OTHER') as DeviceCategory
              ]
            : ''
          const name = e.warehouse.name?.toUpperCase() || ''
          const sn = e.warehouse.serialNumber
            ? ` (SN: ${e.warehouse.serialNumber.toUpperCase()})`
            : ''
          return `${showCat ? `${prefix} ` : ''}${name}${sn}`
        })}
      />

      {/* ===== Materials ===== */}
      <Section
        title="Zużyty materiał"
        list={usedMaterials.map(
          (m) => `${m.material.name} × ${m.quantity} ${materialUnitMap[m.unit]}`
        )}
      />

      {/* ===== Activated services ===== */}
      <section className="pt-4 border-t border-border space-y-1">
        <h4 className="font-semibold">Uruchomione usługi</h4>

        {services.length ? (
          <ul className="list-none list-inside">
            {Object.entries(
              services.reduce<
                Record<string, { count: number; notes: string[] }>
              >((acc, s) => {
                if (!acc[s.type]) acc[s.type] = { count: 0, notes: [] }
                acc[s.type].count++
                if (s.notes) acc[s.type].notes.push(s.notes)
                return acc
              }, {})
            ).map(([type, data]) => (
              <li key={type} className="mt-1">
                {/* Type name + count */}
                <div className="font-medium">
                  {type} {data.count > 1 && `× ${data.count}`}
                </div>

                {/* Notes for services of this type */}
                {data.notes.length > 0 && (
                  <div className="text-xs text-muted-foreground ml-4 space-y-0.5">
                    {data.notes.map((note, i) => (
                      <div key={i}>{note}</div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </section>

      {/* ===== Not completed reason ===== */}
      {status === OrderStatus.NOT_COMPLETED && (
        <Section title="Powód niewykonania" list={[failureReason ?? '—']} />
      )}

      {/* ===== Notes ===== */}
      {notes && <Section title="Uwagi" list={[notes]} />}

      <div className="pt-4 border-t border-border font-semibold">
        Kwota:{' '}
        {settlementEntries
          .reduce(
            (acc, e) => acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
            0
          )
          .toFixed(2)}{' '}
        zł
      </div>
    </div>
  )
}

export default OrderDetailsContent

/** Utility section component
 * Renders a titled list; shows a dash when the list is empty.
 */
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

/** HeaderRow helper
 * Displays a label-value pair in a clean horizontal layout.
 */
const HeaderRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="flex items-center gap-2">
    <span className="font-semibold">{label}:</span>
    <span className="inline-flex items-center">{!!value ? value : '-'}</span>
  </div>
)
