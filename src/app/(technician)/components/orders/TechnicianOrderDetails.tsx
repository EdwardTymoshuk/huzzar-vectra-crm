'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { materialUnitMap } from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useState } from 'react'
import { BsSendCheck } from 'react-icons/bs'
import { CgArrowsExchange } from 'react-icons/cg'
import TransferOrderModal from './TransferOrderModal'
import CompleteOrderModal from './completeOrder/CompleteOrderModal'

/* -------------------------------------------------- */
interface Props {
  orderId: string
  orderStatus: OrderStatus
  disableTransfer?: boolean
  /** true → show Accept / Reject inside details */
  incomingTransfer?: boolean
  /** optional message shown on top of card */
  pendingMessage?: string
  onAccept?: () => void
  onReject?: () => void
}
/* -------------------------------------------------- */
const TechnicianOrderDetails = ({
  orderId,
  orderStatus,
  disableTransfer = false,
  incomingTransfer,
  pendingMessage,
  onAccept,
  onReject,
}: Props) => {
  /* lazy-load full details */
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery(
    { id: orderId },
    { staleTime: 60_000 }
  )

  /* local modal state */
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  /* async / error states */
  if (isLoading) return <LoaderSpinner />
  if (isError || !data)
    return <p className="text-destructive">Błąd ładowania danych.</p>

  /* view-models */
  const codes =
    data.settlementEntries?.map((e) => `${e.code} × ${e.quantity}`) ?? []
  const materials =
    data.usedMaterials?.map(
      (m) => `${m.material.name} × ${m.quantity} ${materialUnitMap[m.unit]}`
    ) ?? []
  const equipment =
    data.assignedEquipment?.map(
      (e) =>
        `${e.warehouse.name}${
          e.warehouse.serialNumber ? ` (SN: ${e.warehouse.serialNumber})` : ''
        }`
    ) ?? []

  /* ---------------- render ---------------- */
  return (
    <div className="space-y-6 text-sm bg-slate-100 p-4 rounded-lg">
      {/* optional alert */}
      {pendingMessage && (
        <Alert variant="destructive" className="!pl-3">
          <AlertDescription>{pendingMessage}</AlertDescription>
        </Alert>
      )}

      {/* header */}
      <div className="space-y-1">
        <HeaderRow label="Nr zlecenia" value={data.orderNumber} />
        <HeaderRow label="Adres" value={`${data.city}, ${data.street}`} />
        <HeaderRow label="Nr kontaktowy" value={`${data.clientPhoneNumber}`} />
        <HeaderRow
          label="Data"
          value={new Date(data.date).toLocaleDateString()}
        />
        <HeaderRow
          label="Slot czasowy"
          value={getTimeSlotLabel(data.timeSlot)}
        />
      </div>

      {/* status-specific parts */}
      {orderStatus === 'COMPLETED' && (
        <>
          <Section title="Kody pracy" list={codes} />
          <Section title="Zużyty materiał" list={materials} />
          <Section title="Sprzęt" list={equipment} />
        </>
      )}

      {orderStatus === 'NOT_COMPLETED' && (
        <Section
          title="Powód niewykonania"
          list={[data.failureReason ?? '—']}
        />
      )}

      {data.notes && <Section title="Uwagi" list={[data.notes]} />}

      {/* incoming transfer action buttons */}
      {incomingTransfer && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={onAccept}>
            Akceptuj
          </Button>
          <Button size="sm" variant="secondary" onClick={onReject}>
            Odrzuć
          </Button>
        </div>
      )}

      {/* regular “Odpisz / Przekaż” when allowed */}
      {orderStatus === 'ASSIGNED' && !disableTransfer && !incomingTransfer && (
        <div className="flex gap-2">
          <Button variant="success" onClick={() => setShowCompleteModal(true)}>
            <BsSendCheck />
            Odpisz
          </Button>
          <Button variant="default" onClick={() => setShowTransfer(true)}>
            <CgArrowsExchange />
            Przekaż
          </Button>
        </div>
      )}

      {/* transfer modal */}
      <TransferOrderModal
        open={showTransfer}
        orderId={orderId}
        onClose={() => setShowTransfer(false)}
      />

      {/* Complte order modal */}
      <CompleteOrderModal
        open={showCompleteModal}
        orderId={orderId}
        onClose={() => setShowCompleteModal(false)}
        orderType={data.type}
      />
    </div>
  )
}

export default TechnicianOrderDetails

/* ------------- helpers ------------- */
const HeaderRow = ({ label, value }: { label: string; value: string }) => (
  <p>
    <span className="font-semibold">{label}:</span> {value}
  </p>
)

const Section = ({ title, list }: { title: string; list: string[] }) => (
  <section className="pt-4 border-t border-slate-200 space-y-1">
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
