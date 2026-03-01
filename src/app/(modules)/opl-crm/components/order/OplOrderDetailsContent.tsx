'use client'

import { materialUnitMap } from '@/lib/constants'
import {
  OplNetworkOeprator,
  OplDeviceCategory,
  OplMaterialUnit,
  OplOrderStatus,
} from '@prisma/client'
import React from 'react'
import { oplDevicesTypeMap, oplNetworkMap } from '../../lib/constants'
import {
  isPkiCode,
  shouldShowWorkCodeQuantity,
  toWorkCodeLabel,
} from '../../utils/order/workCodesPresentation'
import { parseMeasurementsFromNotes } from '../../utils/order/notesFormatting'

/**
 * Order details view model used by OplOrderDetailsContent.
 * This type intentionally contains only fields required by the UI.
 */
export type OrderWithDetails = {
  id: string
  orderNumber: string
  status: OplOrderStatus
  date: Date
  completedAt: Date | null
  attemptNumber: number
  city: string
  street: string
  operator: string
  serviceId: string | null
  network: OplNetworkOeprator
  standard: string | null
  clientPhoneNumber: string | null

  equipmentRequirements: {
    id: string
    quantity: number
    deviceDefinition: {
      id: string
      name: string
      category: OplDeviceCategory
    }
  }[]

  settlementEntries: {
    id: string
    code: string
    quantity: number
    rate: {
      amount: number | null
    } | null
  }[]

  usedMaterials: {
    id: string
    quantity: number
    unit: OplMaterialUnit
    material: {
      name: string
    }
  }[]

  assignedEquipment: {
    id: string
    warehouse: {
      name: string
      serialNumber: string | null
      category: OplDeviceCategory | null
      history: {
        action: string
        assignedOrderId: string | null
      }[]
    }
  }[]

  assignments?: {
    technicianId: string
    technician?: {
      user?: {
        name?: string | null
      } | null
    } | null
  }[]

  failureReason: string | null
  notes: string | null
  history?: {
    statusBefore: OplOrderStatus | null
    statusAfter: OplOrderStatus
    changedBy: {
      user: {
        name: string | null
      }
    }
  }[]
}

type Props = {
  order: OrderWithDetails
  hideTechnician?: boolean
  isConfirmed?: boolean
  amountMode?: 'full' | 'perTechnician'
  showTechnicianBreakdown?: boolean
  hideHeaderInfo?: boolean
  omitEmptySections?: boolean
}

/**
 * OplOrderDetailsContent
 * Displays detailed information about a single order (for both admin and technician views).
 * - Shows codes, materials, issued and collected equipment, services, notes, etc.
 * - Automatically handles both INSTALLATION and SERVICE/OUTAGE orders.
 */
const OplOrderDetailsContent = ({
  order,
  amountMode = 'full',
  showTechnicianBreakdown = false,
  hideHeaderInfo = false,
  omitEmptySections = false,
}: Props) => {
  const {
    status,
    completedAt,
    settlementEntries,
    usedMaterials,
    assignedEquipment,
    failureReason,
    notes,
    attemptNumber,
    orderNumber,
    city,
    street,
    operator,
    serviceId,
    network,
    standard,
    equipmentRequirements,
    history,
  } = order

  // Collected = sprzęt odebrany od klienta
  const collected = assignedEquipment.filter((e) =>
    e.warehouse.history.some(
      (h) =>
        h.action === 'COLLECTED_FROM_CLIENT' && h.assignedOrderId === order.id,
    ),
  )

  const issued = assignedEquipment.filter((e) =>
    e.warehouse.history.some(
      (h) =>
        h.assignedOrderId === order.id &&
        (h.action === 'ASSIGNED_TO_ORDER' || h.action === 'ISSUED_TO_CLIENT'),
    ),
  )

  const workCodes = settlementEntries.filter((entry) => !isPkiCode(entry.code))
  const pkiCodes = settlementEntries.filter((entry) => isPkiCode(entry.code))
  const technicianCount = Math.max(order.assignments?.length ?? 1, 1)
  const totalAmount = settlementEntries.reduce(
    (acc, e) => acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
    0,
  )
  const amountToShow =
    amountMode === 'perTechnician' ? totalAmount / technicianCount : totalAmount
  const parsedNotes = parseMeasurementsFromNotes(notes)
  const measurementLabel =
    parsedNotes.measurements.opp || parsedNotes.measurements.go
      ? `OPP: ${parsedNotes.measurements.opp || '-'} dB, GO: ${
          parsedNotes.measurements.go || '-'
        } dB`
      : null
  const isClosed =
    status === OplOrderStatus.COMPLETED || status === OplOrderStatus.NOT_COMPLETED
  const completionEvent = (history ?? []).find(
    (entry) =>
      entry.statusAfter === OplOrderStatus.COMPLETED ||
      entry.statusAfter === OplOrderStatus.NOT_COMPLETED,
  )
  const completedByName = completionEvent?.changedBy?.user?.name ?? null
  const assignedTechniciansLabel = Array.from(
    new Set(
      (order.assignments ?? [])
        .map((assignment) => assignment.technician?.user?.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ).join(' + ')

  return (
    <div className="space-y-6 text-sm w-full">
      {/* ===== Header ===== */}
      {!hideHeaderInfo && (
        <div className="space-y-1">
          <HeaderRow label="Nr zlecenia" value={orderNumber || '-'} />
          <HeaderRow
            label="Adres"
            value={[city, street].filter(Boolean).join(', ') || '-'}
          />
          {completedAt && (
            <HeaderRow
              label="Data zakończenia"
              value={new Date(completedAt).toLocaleString()}
            />
          )}
          {isClosed && (
            <HeaderRow label="Technik realizujący" value={completedByName ?? '-'} />
          )}
          {attemptNumber && <HeaderRow label="Wejście" value={attemptNumber} />}
          <HeaderRow
            label="Przypisani technicy"
            value={assignedTechniciansLabel || 'Nieprzypisane'}
          />
          <HeaderRow label="Operator" value={operator?.trim() || '-'} />
          <HeaderRow
            label="Operator sieci"
            value={oplNetworkMap[network] ?? network}
          />
          <HeaderRow label="Standard zlecenia" value={standard ?? '-'} />
          {measurementLabel && <HeaderRow label="Pomiar" value={measurementLabel} />}
        </div>
      )}

      {!isClosed && (!omitEmptySections || equipmentRequirements.length > 0) && (
        <Section
          title="Sprzęty do wydania"
          list={equipmentRequirements.map((req) => {
            const type =
              oplDevicesTypeMap[req.deviceDefinition.category] ??
              req.deviceDefinition.category
            return `${req.deviceDefinition.name} (${type}) x ${req.quantity}`
          })}
        />
      )}

      {/* ===== Work codes ===== */}
      <Section
        title="Kody pracy"
        list={workCodes.map((s) => {
          const qty = shouldShowWorkCodeQuantity(s.code, s.quantity)
            ? ` x ${s.quantity}`
            : ''
          return `${toWorkCodeLabel(s.code)}${qty}`
        })}
        hideWhenEmpty={omitEmptySections}
      />

      {/* ===== PKI ===== */}
      <Section
        title="PKI"
        list={pkiCodes.map((s) => `${toWorkCodeLabel(s.code)} x ${s.quantity}`)}
        hideWhenEmpty={omitEmptySections}
      />

      {/* ===== Issued equipment ===== */}
      <Section
        title="Sprzęt wydany"
        list={issued.map((e) => {
          const showCat = e.warehouse.category !== 'OTHER'
          const prefix = showCat
            ? oplDevicesTypeMap[
                (e.warehouse.category || 'OTHER') as OplDeviceCategory
              ]
            : ''
          const name = e.warehouse.name?.toUpperCase() || ''
          const sn = e.warehouse.serialNumber
            ? ` (SN: ${e.warehouse.serialNumber.toUpperCase()})`
            : ''
          return `${showCat ? `${prefix} ` : ''}${name}${sn}`
        })}
        hideWhenEmpty={omitEmptySections}
      />

      {/* ===== Collected equipment ===== */}
      <Section
        title="Sprzęt odebrany od klienta"
        list={collected.map((e) => {
          const showCat = e.warehouse.category !== 'OTHER'
          const prefix = showCat
            ? oplDevicesTypeMap[
                (e.warehouse.category || 'OTHER') as OplDeviceCategory
              ]
            : ''
          const name = e.warehouse.name?.toUpperCase() || ''
          const sn = e.warehouse.serialNumber
            ? ` (SN: ${e.warehouse.serialNumber.toUpperCase()})`
            : ''
          return `${showCat ? `${prefix} ` : ''}${name}${sn}`
        })}
        hideWhenEmpty={omitEmptySections}
      />

      {/* ===== Materials ===== */}
      <Section
        title="Zużyty materiał"
        list={usedMaterials.map(
          (m) =>
            `${m.material.name} × ${m.quantity} ${materialUnitMap[m.unit]}`,
        )}
        hideWhenEmpty={omitEmptySections}
      />

      {/* ===== Not completed reason ===== */}
      {status === OplOrderStatus.NOT_COMPLETED && (
        <Section
          title="Powód niewykonania"
          list={failureReason ? [failureReason] : []}
          hideWhenEmpty={omitEmptySections}
        />
      )}

      {/* ===== Notes ===== */}
      {(parsedNotes.plainNotes || !omitEmptySections) && (
        <Section
          title="Uwagi"
          list={parsedNotes.plainNotes ? [parsedNotes.plainNotes] : []}
          hideWhenEmpty={omitEmptySections}
        />
      )}

      <div className="pt-4 border-t border-border font-semibold">
        {amountMode === 'perTechnician' ? 'Kwota : ' : 'Kwota: '}
        {amountToShow.toFixed(2)} zł
      </div>

      {showTechnicianBreakdown && technicianCount > 0 && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {(order.assignments ?? []).map((assignment, idx) => {
            const techName =
              assignment.technician?.user?.name ?? `Technik #${idx + 1}`

            return (
              <div key={`${assignment.technicianId}-${idx}`}>
                {techName}: {(totalAmount / technicianCount).toFixed(2)} zł
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default OplOrderDetailsContent

/** Utility section component
 * Renders a titled list; shows a dash when the list is empty.
 */
const Section = ({
  title,
  list,
  hideWhenEmpty = false,
}: {
  title: string
  list: string[]
  hideWhenEmpty?: boolean
}) => {
  if (hideWhenEmpty && list.length === 0) return null

  return (
    <section className="pt-4 border-t border-border space-y-1">
      <h4 className="text-sm font-medium">{title}</h4>
      {list.length ? (
        <ul className="list-none list-inside text-sm leading-5">
          {list.map((it, idx) => (
            <li key={`${it}-${idx}`} className="whitespace-pre-line normal-case">
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </section>
  )
}

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
  <div className="flex items-center gap-2 text-sm leading-5">
    <span className="font-medium text-muted-foreground min-w-[170px]">{label}:</span>
    <span className="inline-flex items-center font-normal">
      {!!value ? value : '-'}
    </span>
  </div>
)
