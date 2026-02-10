'use client'

import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import {
  OplActivationType,
  OplBaseWorkCode,
  OplOrderStandard,
} from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'

import {
  ALL_ACTIVATION_CODES,
  ALL_ADDON_CODES,
  ALL_BASE_CODES,
  getPrimaryActivationCodes,
  getPrimaryAddonCodes,
  getPrimaryBaseCodes,
} from '@/app/(modules)/opl-crm/utils/order/completeOrderHelper'

import { ALL_PKI_DEFS } from '@/app/(modules)/opl-crm/lib/constants'
import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { calculateDigAddons } from '@/app/(modules)/opl-crm/utils/order/calculateDigAddons'
import { resolvePkiCodes } from '@/app/(modules)/opl-crm/utils/order/resolvePkiCodes'
import { sortPkiByPriority } from '@/app/(modules)/opl-crm/utils/order/sortPkiByPriority'
import { PrimaryAddonCode } from '@/types/opl-crm'
import { PkiDefinition } from '@/types/opl-crm/orders'
import { ActivationSection } from '../ActivationSection'
import { AddonsSection } from '../AddonsSection'
import { BaseWorkSection } from '../BaseWorkSection'
import { DigInputDialog } from '../DigInputDialog'
import { SelectedCodesSummary } from '../SelectedCodesSummary'
import PkiQuantityDialog from '../pki/PkiQuantityDialog'
import PkiSelector from '../pki/PkiSelector'

type Props = {
  standard?: OplOrderStandard
  onBack: () => void
  onNext: () => void
}

/**
 * Step for selecting work codes.
 * All direct selections are written immediately to context.
 * DIG input is stored in context, but DIG addons are derived on commit.
 */
const OplStepWorkCodes = ({ standard, onBack, onNext }: Props) => {
  const {
    state,
    addWorkCode,
    removeWorkCode,
    resetWorkCodes,
    setDigInput,
    clearPkiCodes,
  } = useCompleteOplOrder()
  const [pkiEnabled, setPkiEnabled] = useState(false)
  const [pkiDialogOpen, setPkiDialogOpen] = useState(false)
  const [pendingPki, setPendingPki] = useState<PkiDefinition | null>(null)

  /* ---------------- UI STATE ONLY ---------------- */

  const [showAllBase, setShowAllBase] = useState(false)
  const [showAllActivation, setShowAllActivation] = useState(false)
  const [showAllAddons, setShowAllAddons] = useState(false)

  const [digDialog, setDigDialog] = useState<
    { open: false } | { open: true; type: 'ZJD' | 'ZJK' | 'ZJN' }
  >({ open: false })

  /* ---------------- STATE VARIABLES ---------------- */
  const value = state.workCodes
  const digInput = state.digInput

  /* ---------------- HELPERS ---------------- */

  const has = (code: string) => value.some((v) => v.code === code)
  const qty = (code: string) =>
    value.find((v) => v.code === code)?.quantity ?? 0

  /* ---------------- DERIVED ---------------- */

  const base = value.find((v) =>
    ALL_BASE_CODES.includes(v.code as OplBaseWorkCode)
  )?.code as OplBaseWorkCode | undefined

  const activation = value.find((v) =>
    ALL_ACTIVATION_CODES.some((a) => a.code === v.code)
  )?.code as OplActivationType | undefined

  const basePrimary = getPrimaryBaseCodes(standard)
  const activationPrimary = getPrimaryActivationCodes(base)
  const addonPrimary = getPrimaryAddonCodes(
    base,
    activation,
    ALL_ADDON_CODES,
    false
  )

  const selectedAddons = value
    .map((v) => v.code)
    .filter((c): c is PrimaryAddonCode =>
      ALL_ADDON_CODES.includes(c as PrimaryAddonCode)
    )

  /**
   * Final payload shown in summary and committed on "Next".
   * DIG addons are derived here.
   */
  const finalWorkCodes = useMemo(() => {
    const digAddons = digInput ? calculateDigAddons(digInput) : {}

    return [
      ...value.filter((v) => !['ZJDD', 'ZJKD', 'ZJND'].includes(v.code)),
      ...Object.entries(digAddons).map(([code, quantity]) => ({
        code,
        quantity,
      })),
    ]
  }, [value, digInput])

  /* ---------------- HANDLERS ---------------- */

  const onBaseChange = (next: OplBaseWorkCode) => {
    ALL_BASE_CODES.forEach(removeWorkCode)
    ALL_ACTIVATION_CODES.forEach((a) => removeWorkCode(a.code))

    setDigInput(null)
    addWorkCode(next, 1)

    if (next === 'ZJD' || next === 'ZJK' || next === 'ZJN') {
      setDigDialog({ open: true, type: next })
    }
  }

  const onActivationChange = (code: OplActivationType) => {
    ALL_ACTIVATION_CODES.forEach((a) => removeWorkCode(a.code))
    addWorkCode(code, 1)
  }

  const onMr = () => {
    const current = qty('MR')

    if (current === 0) {
      addWorkCode('MR', 1)
      return
    }

    if (current < 3) {
      addWorkCode('MR', current + 1)
      return
    }

    removeWorkCode('MR')
  }

  const toggleAddon = (code: PrimaryAddonCode) => {
    has(code) ? removeWorkCode(code) : addWorkCode(code, 1)
  }

  const handleTogglePki = (enabled: boolean) => {
    setPkiEnabled(enabled)

    if (!enabled) {
      clearPkiCodes()
    }
  }

  const mrCount = qty('MR')
  const pkiPriority = useMemo(() => {
    return resolvePkiCodes({
      base,
      mrCount,
    })
  }, [base, mrCount])

  const sortedPkiDefs = useMemo(() => {
    return sortPkiByPriority(ALL_PKI_DEFS, pkiPriority)
  }, [pkiPriority])

  const handleReset = () => {
    resetWorkCodes()
    setDigInput(null)
    setShowAllBase(false)
    setShowAllActivation(false)
    setShowAllAddons(false)
  }

  /* -------- AUTO ZJWEW -------- */

  useEffect(() => {
    const isZjBase = base === 'ZJD' || base === 'ZJK' || base === 'ZJN'

    if (isZjBase) {
      addWorkCode('ZJWEW', 1)
    } else {
      removeWorkCode('ZJWEW')
    }
  }, [base, addWorkCode, removeWorkCode])

  /* -------- SYNC PKI SWITCH WITH CONTEXT -------- */

  useEffect(() => {
    const hasAnyPki = state.workCodes.some((v) => v.code.startsWith('PKI'))

    setPkiEnabled(hasAnyPki)
  }, [state.workCodes])

  /* ---------------- RENDER ---------------- */

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6 p-4">
        {/* BASE */}
        <Card className="p-4">
          <BaseWorkSection
            value={base ?? null}
            primary={basePrimary}
            all={ALL_BASE_CODES}
            showAll={showAllBase}
            onToggleShowAll={() => setShowAllBase((v) => !v)}
            onChange={onBaseChange}
          />
        </Card>

        {/* ACTIVATION */}
        <Card className="p-4">
          <ActivationSection
            value={activation ?? null}
            base={base ?? null}
            primary={activationPrimary}
            all={ALL_ACTIVATION_CODES}
            showAll={showAllActivation}
            onToggleShowAll={() => setShowAllActivation((v) => !v)}
            onChange={onActivationChange}
          />
        </Card>

        {/* ADDONS */}
        <Card className="p-4">
          <AddonsSection
            base={base ?? null}
            primary={addonPrimary}
            all={ALL_ADDON_CODES}
            showAll={showAllAddons}
            activation={activation ?? null}
            mrCount={qty('MR')}
            umz={has('UMZ')}
            onToggleShowAll={() => setShowAllAddons((v) => !v)}
            onMr={onMr}
            onToggleAddon={toggleAddon}
            onToggleUmz={() => toggleAddon('UMZ')}
            selected={selectedAddons}
          />
        </Card>

        {/* PKI */}
        <Card className="p-4">
          <PkiSelector
            enabled={pkiEnabled}
            onToggle={handleTogglePki}
            available={sortedPkiDefs}
            onSelect={(pki) => {
              setPendingPki(pki)
              setPkiDialogOpen(true)
            }}
          />
        </Card>

        {/* SUMMARY */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Wybrane kody</h3>
          <SelectedCodesSummary value={finalWorkCodes} digInput={digInput} />
        </Card>

        <Button
          variant="default"
          size="sm"
          onClick={handleReset}
          disabled={value.length === 0}
          className="w-full"
        >
          Reset
        </Button>
      </div>

      {/* FOOTER */}
      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Wstecz
        </Button>
        <Button
          className="flex-1"
          disabled={!base}
          onClick={() => {
            resetWorkCodes()
            finalWorkCodes.forEach((v) => addWorkCode(v.code, v.quantity))
            onNext()
          }}
        >
          Dalej
        </Button>
      </div>

      {/* DIG DIALOG */}
      {digDialog.open && (
        <DigInputDialog
          open
          type={digDialog.type}
          onClose={() => setDigDialog({ open: false })}
          onConfirm={(qty) => {
            if (digDialog.type === 'ZJN') {
              setDigInput({ type: 'ZJN', points: qty })
            } else {
              setDigInput({ type: digDialog.type, meters: qty })
            }

            setDigDialog({ open: false })
          }}
        />
      )}

      {/* PKI DIALOG */}
      <PkiQuantityDialog
        open={pkiDialogOpen}
        pki={pendingPki}
        onClose={() => {
          setPendingPki(null)
          setPkiDialogOpen(false)
        }}
        onConfirm={(code, quantity) => {
          addWorkCode(code, quantity)
        }}
      />
    </div>
  )
}

export default OplStepWorkCodes
