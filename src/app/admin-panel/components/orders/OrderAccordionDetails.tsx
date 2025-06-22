'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Badge } from '@/app/components/ui/badge'
import { statusColorMap, statusMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'

type Props = { order: { id: string } }

const OrderAccordionDetails = ({ order }: Props) => {
  // 📦 Fetch order details
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: order.id,
  })

  // 🔄 Loading state
  if (isLoading)
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )

  // ❌ Error or no data
  if (isError || !data)
    return (
      <div className="p-4 text-danger">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )

  // 🧩 Extract order data
  const {
    assignedTo,
    settlementEntries,
    usedMaterials,
    assignedEquipment,
    notes,
    failureReason,
    closedAt,
    status,
  } = data

  // 📌 Helper to render fallback if content is missing
  const renderOrDash = (content: React.ReactNode) =>
    content ? content : <span className="text-muted-foreground">—</span>

  // 🖼️ UI layout
  return (
    <div className="p-4 bg-muted rounded-md shadow-inner space-y-3 text-sm">
      {/* ✅ Status, technician and close date */}
      <div className="space-y-1">
        <p>
          <strong>Status:</strong>{' '}
          <Badge className={statusColorMap[status] + ' w-fit'}>
            {statusMap[status]}
          </Badge>
        </p>
        <p>
          <strong>Technik:</strong> {assignedTo?.name || 'Nieznany'}
        </p>
        {closedAt && (
          <p>
            <strong>Data zakończenia:</strong>{' '}
            {new Date(closedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* 🧾 Work codes */}
      <div>
        <strong>Kody pracy:</strong>
        <ul className="list-disc pl-5 space-y-0.5">
          {settlementEntries.length
            ? settlementEntries.map((s) => (
                <li key={s.id}>
                  {s.code} × {s.quantity}
                </li>
              ))
            : renderOrDash(null)}
        </ul>
      </div>

      {/* 🧱 Used materials */}
      <div>
        <strong>Zużyty materiał:</strong>
        <ul className="list-disc pl-5 space-y-0.5">
          {usedMaterials.length
            ? usedMaterials.map((m) => (
                <li key={m.id}>
                  {m.material.name} – {m.quantity} {m.unit.toLowerCase()}
                </li>
              ))
            : renderOrDash(null)}
        </ul>
      </div>

      {/* 🖥️ Assigned equipment */}
      <div>
        <strong>Sprzęt:</strong>
        <ul className="list-disc pl-5 space-y-0.5">
          {assignedEquipment.length
            ? assignedEquipment.map((entry) => (
                <li key={entry.id}>
                  {entry.warehouse.name}
                  {entry.warehouse.serialNumber &&
                    ` — ${entry.warehouse.serialNumber}`}
                </li>
              ))
            : renderOrDash(null)}
        </ul>
      </div>

      {/* ❗ Failure reason (only when NOT_COMPLETED) */}
      {status === OrderStatus.NOT_COMPLETED && (
        <p>
          <strong>Powód niewykonania:</strong>{' '}
          {renderOrDash(failureReason || null)}
        </p>
      )}

      {/* 📝 Notes (always visible) */}
      <p>
        <strong>Uwagi:</strong> {renderOrDash(notes || null)}
      </p>
    </div>
  )
}

export default OrderAccordionDetails
