'use client'

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

/** Exact payload returned by getOrderById */
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    assignedTo: { select: { id: true; name: true } }
    settlementEntries: true
    usedMaterials: { include: { material: true } }
    assignedEquipment: { include: { warehouse: true } }
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
const OrderDetailsContent = ({
  order,
  hideTechnician = false,
  isConfirmed = false,
}: Props) => {
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

  // Split assigned equipment into issued vs collected
  const issued = assignedEquipment.filter(
    (e) => e.warehouse.status !== 'COLLECTED_FROM_CLIENT'
  )
  const collected = assignedEquipment.filter(
    (e) => e.warehouse.status === 'COLLECTED_FROM_CLIENT'
  )

  // Services without linked device (standalone)
  const standalone = services.filter(
    (s) => !s.deviceId && s.deviceSource !== 'CLIENT'
  )

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

      {/* ===== Issued equipment ===== */}
      <section className="pt-4 border-t border-border space-y-1">
        <h4 className="font-semibold">Sprzęt wydany</h4>

        {/* --- If services exist (INSTALLATION) --- */}
        {services.length > 0 ? (
          <ul className="list-none list-inside">
            {/* NET group (modem + router + extender + measurements) */}
            {services
              .filter((s) => s.type === 'NET')
              .reduce<typeof services>((acc, cur) => {
                if (
                  !acc.some(
                    (a) =>
                      a.serialNumber?.toUpperCase() ===
                      cur.serialNumber?.toUpperCase()
                  )
                )
                  acc.push(cur)
                return acc
              }, [])
              .map((s) => (
                <li key={s.id} className="space-y-1 mt-2">
                  {/* Main modem */}
                  <div>
                    {s.deviceType !== 'OTHER' &&
                      `${devicesTypeMap[s.deviceType as DeviceCategory]} `}
                    {s.deviceName?.toUpperCase()}
                    {s.serialNumber && ` (SN: ${s.serialNumber.toUpperCase()})`}
                    {s.deviceSource === 'CLIENT' && ' [sprzęt klienta]'}
                  </div>

                  {/* Router */}
                  {s.deviceId2 && (
                    <div className="ml-4">
                      {s.deviceType2 !== 'OTHER' &&
                        `${devicesTypeMap[s.deviceType2 as DeviceCategory]} `}
                      {s.deviceName2?.toUpperCase()}
                      {s.serialNumber2 &&
                        ` (SN: ${s.serialNumber2.toUpperCase()})`}
                    </div>
                  )}

                  {/* Extenders */}
                  {s.extraDevices?.length > 0 && (
                    <div className="ml-4 space-y-0.5">
                      {s.extraDevices.map((ex) => (
                        <div key={ex.id}>
                          {ex.category && ex.category !== 'OTHER'
                            ? `${devicesTypeMap[ex.category]} `
                            : ''}
                          {ex.name?.toUpperCase()}
                          {ex.serialNumber &&
                            ` (SN: ${ex.serialNumber.toUpperCase()})`}
                          {ex.source === 'CLIENT' && ' [sprzęt klienta]'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Measurements */}
                  {(s.usDbmDown || s.usDbmUp || s.speedTest) && (
                    <div className="text-xs text-muted-foreground ml-4 space-y-0.5">
                      {(s.usDbmDown || s.usDbmUp) && (
                        <div>
                          {s.usDbmDown && <>DS: {s.usDbmDown} dBm </>}
                          {s.usDbmUp && <>US: {s.usDbmUp} dBm</>}
                        </div>
                      )}
                      {s.speedTest && <div>Speedtest: {s.speedTest}</div>}
                    </div>
                  )}
                </li>
              ))}

            {/* DTV (decoders) */}
            {services
              .filter((s) => s.type === 'DTV')
              .map((s) => (
                <li key={s.id} className="mt-2">
                  {s.deviceType !== 'OTHER' &&
                    `${devicesTypeMap[s.deviceType as DeviceCategory]} `}
                  {s.deviceName?.toUpperCase()}
                  {s.serialNumber && ` (SN: ${s.serialNumber.toUpperCase()})`}
                  {s.deviceSource === 'CLIENT' && ' [sprzęt klienta]'}
                </li>
              ))}

            {/* TEL (SIM card) */}
            {services.some((s) => s.type === 'TEL' && !!s.serialNumber) && (
              <li className="mt-2">
                KARTA SIM (SN:{' '}
                {services
                  .find((s) => s.type === 'TEL')
                  ?.serialNumber?.toUpperCase() ?? ''}
                )
              </li>
            )}

            {/* CLIENT devices */}
            {services
              .filter(
                (s) =>
                  s.deviceSource === 'CLIENT' &&
                  !['NET', 'DTV', 'TEL'].includes(s.type)
              )
              .map((s) => (
                <li key={s.id} className="mt-2">
                  {s.deviceType !== 'OTHER' &&
                    `${devicesTypeMap[s.deviceType as DeviceCategory]} `}
                  {s.deviceName?.toUpperCase()}
                  {s.serialNumber &&
                    ` (SN: ${s.serialNumber.toUpperCase()})`}{' '}
                  [sprzęt klienta]
                </li>
              ))}
          </ul>
        ) : issued.length > 0 ? (
          /* --- If no services but issued equipment exists (SERVICE/OUTAGE) --- */
          <ul className="list-none list-inside">
            {issued.map((e) => {
              const cat = (e.warehouse.category || 'OTHER') as DeviceCategory
              const prefix = cat !== 'OTHER' ? `${devicesTypeMap[cat]} ` : ''
              const name = e.warehouse.name?.toUpperCase() ?? ''
              const sn = e.warehouse.serialNumber
                ? ` (SN: ${e.warehouse.serialNumber.toUpperCase()})`
                : ''
              return (
                <li key={e.warehouse.id} className="mt-2">
                  {prefix}
                  {name}
                  {sn}
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

      {/* ===== Additional standalone services ===== */}
      {standalone.length > 0 && (
        <Section
          title="Dodatkowe usługi"
          list={(() => {
            const grouped: Record<string, number> = {}
            standalone.forEach((s) => {
              const label =
                s.type === 'ATV' ? 'ATV' : s.type === 'TEL' ? 'TEL' : s.type
              grouped[label] = (grouped[label] || 0) + 1
            })
            return Object.entries(grouped).map(([label, count]) =>
              count > 1 ? `${label} × ${count}` : label
            )
          })()}
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
    <span className="inline-flex items-center">{value}</span>
  </div>
)
