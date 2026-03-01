'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Button } from '@/app/components/ui/button'
import { statusMap } from '@/lib/constants'
import { OplIssuedItemDevice } from '@/types/opl-crm'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { format } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoCheckmarkDone } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { toast } from 'sonner'
import CompleteOplOrderWizard from '../../../(technician)/components/orders/completeOrder/CompleteOplOrderWizard'
import { oplDevicesTypeMap, oplNetworkMap, oplTimeSlotMap } from '../../../lib/constants'
import OplOrderDetailsContent from '../../../components/order/OplOrderDetailsContent'
import { CompleteOplOrderProvider } from '../../../utils/context/order/CompleteOplOrderContext'
import { parseMeasurementsFromNotes } from '../../../utils/order/notesFormatting'
import OplOrderTimeline from '../order/OplOrderTimeline'

type Props = { order: { id: string } }

/**
 * OplOrderAccordionDetails (Admin/Coordinator view)
 *
 * Displays full order details inside accordion row.
 * - Admin/coordinator can:
 *   • approve completed SERVICE/OUTAGE orders,
 *   • re-edit finished orders (no time limit),
 * - Merges technician stock with devices assigned directly to the order
 *   to avoid missing serial numbers during admin edit.
 */
const OplOrderAccordionDetails = ({ order }: Props) => {
  /** Local state for admin edit modal */
  const [openEdit, setOpenEdit] = useState<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /** tRPC utils used for post-mutation invalidation */
  const utils = trpc.useUtils()
  /** Role flags (used to control available actions) */
  const { isWarehouseman, isAdmin, isCoordinator } = useRole()
  /** Current session, used to append user name in approval notes */
  const session = useSession()

  /** Mutation used to update order (for "Zatwierdź") */
  const editOrder = trpc.opl.order.editOrder.useMutation()

  /* ---------------- Fetch order details (base) ---------------- */
  const { data, isLoading, isError } = trpc.opl.order.getOrderById.useQuery({
    id: order.id,
  })
  const { data: addressNotes = [] } = trpc.opl.order.getAddressNotesForOrder.useQuery(
    { orderId: order.id },
    { enabled: Boolean(order.id) }
  )

  const primaryAssignment = data?.assignments?.[0]
  const secondaryAssignment = data?.assignments?.[1]

  const primaryTechnicianId = primaryAssignment?.technicianId ?? 'self'
  const secondaryTechnicianId = secondaryAssignment?.technicianId
  const hasSecondTechnician =
    Boolean(secondaryTechnicianId) &&
    secondaryTechnicianId !== primaryTechnicianId

  const primarySourceLabel = primaryAssignment
    ? `Stan technika: ${primaryAssignment.technician.user.name}`
    : 'Stan technika'
  const secondarySourceLabel = secondaryAssignment
    ? `Stan technika: ${secondaryAssignment.technician.user.name}`
    : null

  /* ---------------- Fetch dictionaries / stock ---------------- */
  // NOTE: these hooks must stay at the top-level to preserve hook order
  const { data: materialDefs } =
    trpc.opl.settings.getAllOplMaterialDefinitions.useQuery()
  const { data: rawPrimaryMaterials } =
    trpc.opl.warehouse.getTechnicianStock.useQuery(
      {
        technicianId: primaryTechnicianId,
        itemType: 'MATERIAL',
      },
      {
        enabled: Boolean(data),
      }
    )
  const { data: rawSecondaryMaterials } =
    trpc.opl.warehouse.getTechnicianStock.useQuery(
      {
        technicianId: secondaryTechnicianId ?? 'self',
        itemType: 'MATERIAL',
      },
      {
        enabled: Boolean(data && hasSecondTechnician),
      }
    )

  const { data: rawPrimaryDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: primaryTechnicianId,
      itemType: 'DEVICE',
    },
    {
      enabled: Boolean(data),
    }
  )
  const { data: rawSecondaryDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: secondaryTechnicianId ?? 'self',
      itemType: 'DEVICE',
    },
    {
      enabled: Boolean(data && hasSecondTechnician),
    }
  )
  const { data: workCodeDefs } = trpc.opl.settings.getAllOplRates.useQuery()

  /* ---------------- Loading / error states ---------------- */
  if (isLoading || !data) {
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 text-destructive">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )
  }

  if (
    !materialDefs ||
    rawPrimaryMaterials === undefined ||
    rawPrimaryDevices === undefined ||
    (hasSecondTechnician &&
      (rawSecondaryMaterials === undefined || rawSecondaryDevices === undefined)) ||
    workCodeDefs === undefined
  ) {
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )
  }

  /* ---------------- Data preparation (no extra hooks) ---------------- */

  // Check if order was already approved by admin
  const isConfirmed =
    data.notes?.toLowerCase().includes('zatwierdzone przez') ?? false

  // Technician materials mapped to wizard's structure
  const techMaterials = [
    ...(rawPrimaryMaterials ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId ?? '',
      quantity: m.quantity ?? 0,
      sourceLabel: primarySourceLabel,
      type: 'MATERIAL' as const,
    })),
    ...((rawSecondaryMaterials ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId ?? '',
      quantity: m.quantity ?? 0,
      sourceLabel: secondarySourceLabel ?? undefined,
      type: 'MATERIAL' as const,
    })) ?? []),
  ]

  // Devices from technician stock (normal case)
  const technicianDevices = [rawPrimaryDevices ?? [], rawSecondaryDevices ?? []]
    .flatMap((rows, index) => {
      const sourceLabel =
        index === 0 ? primarySourceLabel : (secondarySourceLabel ?? undefined)

      return rows.map((row) => ({ ...row, sourceLabel }))
    })
    .filter(
      (d): d is typeof d & { serialNumber: string } =>
        typeof d.serialNumber === 'string'
    )
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
      deviceDefinitionId: d.deviceDefinitionId ?? null,
      status: d.status,
      sourceLabel: d.sourceLabel,
      type: 'DEVICE' as const,
    }))

  // Devices already assigned directly to this order (ASSIGNED_TO_ORDER) – we must show them too
  const devicesFromOrder = (data.assignedEquipment ?? [])
    .map((ae) => ae.warehouse)
    .filter(
      (w): w is NonNullable<typeof w> & { serialNumber: string } =>
        !!w &&
        typeof w.serialNumber === 'string' &&
        w.status === 'ASSIGNED_TO_ORDER'
    )
    .map((w) => ({
      id: w.id,
      name: w.name,
      serialNumber: w.serialNumber,
      category: w.category ?? 'OTHER',
      deviceDefinitionId: w.deviceDefinitionId ?? null,
      status: w.status,
      sourceLabel: 'Pozycja przypisana w zleceniu',
      type: 'DEVICE' as const,
    }))

  // Merge technician devices with devices assigned to the order
  // and remove possible duplicates by serial number.
  const allDevices: OplIssuedItemDevice[] = (() => {
    const merged: OplIssuedItemDevice[] = [
      ...technicianDevices,
      ...devicesFromOrder,
    ]

    const unique: OplIssuedItemDevice[] = []
    const seen = new Set<string>()

    for (const dev of merged) {
      const sn = dev.serialNumber
      if (!sn) {
        unique.push(dev)
        continue
      }
      if (!seen.has(sn)) {
        seen.add(sn)
        unique.push(dev)
      }
    }

    return unique
  })()

  /* ---------------- Logic flags ---------------- */
  const canApprove =
    (isAdmin || isCoordinator) &&
    (data.type === 'SERVICE' || data.type === 'OUTAGE') &&
    data.status === OplOrderStatus.COMPLETED &&
    !isConfirmed

  const canAdminEdit =
    (isAdmin || isCoordinator) &&
    (data.status === OplOrderStatus.COMPLETED ||
      data.status === OplOrderStatus.NOT_COMPLETED)
  const isClosed =
    data.status === OplOrderStatus.COMPLETED ||
    data.status === OplOrderStatus.NOT_COMPLETED
  const completionEvent = (data.history ?? []).find(
    (entry) =>
      entry.statusAfter === OplOrderStatus.COMPLETED ||
      entry.statusAfter === OplOrderStatus.NOT_COMPLETED
  )
  const completedByName = completionEvent?.changedBy?.user?.name ?? null
  const assignedTechniciansLabel = Array.from(
    new Set(
      (data.assignments ?? [])
        .map((assignment) => assignment.technician?.user?.name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).join(' + ')
  const assignedTechniciansValue = assignedTechniciansLabel || 'Nieprzypisane'
  const completedByLabel = assignedTechniciansLabel || completedByName || '-'
  const parsedNotes = parseMeasurementsFromNotes(data.notes)
  const completedAtLabel = data.completedAt
    ? formatDateTime(data.completedAt)
    : data.closedAt
      ? formatDateTime(data.closedAt)
      : '-'

  /* ---------------- Render ---------------- */
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
      <div className="space-y-4 xl:pr-5 xl:border-r xl:border-border">
        <h3 className="text-base font-semibold">Informacje ogólne</h3>
        <div className="space-y-2 text-sm leading-5">
          <DetailsRow label="Nr zlecenia" value={data.orderNumber} />
          <DetailsRow
            label="Adres"
            value={[data.city, data.street].filter(Boolean).join(', ')}
          />
          <DetailsRow
            label="Data umówienia i slot"
            value={`${format(data.date, 'dd.MM.yyyy')} • ${
              oplTimeSlotMap[data.timeSlot] ?? data.timeSlot
            }`}
          />
          <DetailsRow label="Wejście" value={String(data.attemptNumber)} />
          <DetailsRow label="Status" value={statusMap[data.status] ?? data.status} />
          <DetailsRow label="Przypisani technicy" value={assignedTechniciansValue} />
          <DetailsRow label="Operator" value={data.operator || '-'} />
          <DetailsRow
            label="Operator sieci"
            value={oplNetworkMap[data.network] ?? data.network}
          />
          <div className="space-y-1 border-t border-border pt-3">
            <h4 className="text-sm font-medium">Uwagi do adresu</h4>
            {addressNotes.length ? (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="address-notes"
                  className="rounded border border-border px-2"
                >
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    {`Pokaż uwagi (${addressNotes.length})`}
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <ul className="space-y-2">
                      {addressNotes.map((n) => (
                        <li key={n.id} className="rounded border border-border p-2 text-sm">
                          <p>{n.note}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {`Adres wpisu: ${n.city}, ${n.street}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {n.buildingScope ? `Zakres: ${n.buildingScope} • ` : ''}
                            {n.createdBy.name} •{' '}
                            {new Date(n.createdAt).toLocaleString('pl-PL')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 2xl:pr-5 2xl:border-r 2xl:border-border">
        <h3 className="text-base font-semibold">
          {isClosed ? 'Odpis i podsumowanie' : 'Informacje realizacyjne'}
        </h3>

        {isClosed && data.status === OplOrderStatus.COMPLETED ? (
          <>
            <DetailsRow label="Data zakończenia" value={completedAtLabel} />
            <DetailsRow label="Technik realizujący" value={completedByLabel} />
            <OplOrderDetailsContent
              order={data}
              isConfirmed={isConfirmed}
              amountMode="full"
              showTechnicianBreakdown
              hideHeaderInfo
              omitEmptySections
            />
          </>
        ) : isClosed && data.status === OplOrderStatus.NOT_COMPLETED ? (
          <>
            <DetailsRow label="Data zakończenia" value={completedAtLabel} />
            <DetailsRow label="Technik realizujący" value={completedByLabel} />
            <DetailsSection
              title="Powód niewykonania"
              lines={data.failureReason ? [data.failureReason] : []}
            />
            <DetailsSection
              title="Uwagi"
              lines={parsedNotes.plainNotes ? [parsedNotes.plainNotes] : []}
            />
          </>
        ) : (
          <>
            <DetailsRow label="Standard zlecenia" value={data.standard || '-'} />
            <DetailsSection
              title="Sprzęty do wydania"
              lines={data.equipmentRequirements.map((req) => {
                const type =
                  oplDevicesTypeMap[req.deviceDefinition.category] ??
                  req.deviceDefinition.category
                return `${req.deviceDefinition.name} (${type}) x ${req.quantity}`
              })}
            />
            <DetailsSection
              title="Uwagi"
              lines={[parsedNotes.plainNotes || '—']}
            />
          </>
        )}

        {(canAdminEdit || canApprove) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {canAdminEdit && !isWarehouseman && (
              <Button
                variant="default"
                onClick={() => {
                  utils.opl.order.getOrderById.invalidate({ id: order.id })
                  setOpenEdit(true)
                }}
              >
                <MdEdit className="mr-1" />
                Edytuj zakończone zlecenie
              </Button>
            )}

            {canApprove && (
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    const now = new Date()
                    const dateFormatted = formatDateTime(now)
                    const updatedNotes = `${
                      data.notes ? data.notes + '\n' : ''
                    }Zatwierdzone przez ${
                      session.data?.user?.name
                    } (${dateFormatted})`

                    await editOrder.mutateAsync({
                      id: data.id,
                      operator: data.operator === 'OA' ? 'OA' : 'ORANGE',
                      serviceId: data.serviceId ?? undefined,
                      type: data.type,
                      notes: updatedNotes,
                      orderNumber: data.orderNumber,
                      date: data.date.toISOString().split('T')[0],
                      timeSlot: data.timeSlot,
                      status: data.status,
                      city: data.city,
                      street: data.street,
                      assignedTechnicianIds: data.assignments
                        .map((a) => a.technicianId)
                        .slice(0, 2),
                    })

                    toast.success('Zlecenie zostało zatwierdzone.')
                    await utils.opl.order.getOrderById.invalidate({
                      id: data.id,
                    })
                    await utils.opl.order.getOrders.invalidate()
                  } catch {
                    toast.error('Nie udało się zatwierdzić zlecenia.')
                  }
                }}
              >
                <IoCheckmarkDone className="mr-1" />
                Zatwierdź
              </Button>
            )}
          </div>
        )}

        <CompleteOplOrderProvider orderId={data.id}>
          <CompleteOplOrderWizard
            key={order.id}
            open={openEdit}
            onCloseAction={async () => {
              setOpenEdit(false)
              await utils.opl.order.getOrders.invalidate()
              await utils.opl.order.getOrderById.invalidate({ id: order.id })
            }}
            order={data}
            orderType={data.type}
            materialDefs={materialDefs}
            techMaterials={techMaterials}
            devices={allDevices}
            mode="adminEdit"
            workCodeDefs={workCodeDefs}
          />
        </CompleteOplOrderProvider>
      </div>

      <div>
        <h3 className="text-base font-semibold mb-2">Historia zlecenia</h3>
        <OplOrderTimeline
          order={data}
          onOpenOrder={(orderId) => {
            const currentQuery = searchParams.toString()
            const baseFrom = searchParams.get('from')
            const from = baseFrom
              ? decodeURIComponent(baseFrom)
              : currentQuery
                ? `${pathname}?${currentQuery}`
                : pathname
            router.push(
              `/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`
            )
          }}
        />
      </div>
    </div>
  )
}

export default OplOrderAccordionDetails

const DetailsRow = ({
  label,
  value,
}: {
  label: string
  value: string
}) => (
  <div className="flex items-start gap-2 text-sm leading-5">
    <span className="font-medium text-muted-foreground min-w-[170px]">{label}:</span>
    <span className="text-foreground font-normal">{value || '-'}</span>
  </div>
)

const DetailsSection = ({
  title,
  lines,
}: {
  title: string
  lines: string[]
}) => (
  <div className="space-y-1 border-t border-border pt-3">
    <h4 className="text-sm font-medium">{title}</h4>
    {lines.length > 0 ? (
      <ul className="space-y-1 text-sm">
        {lines.map((line, idx) => (
          <li key={`${title}-${idx}`} className="whitespace-pre-line">
            {line}
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    )}
  </div>
)
