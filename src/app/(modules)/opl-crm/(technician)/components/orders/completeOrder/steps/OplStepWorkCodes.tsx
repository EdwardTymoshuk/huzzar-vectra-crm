'use client'

import { useOplWorkCodes } from '@/app/(modules)/opl-crm/utils/hooks/useOplWorkCodes'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { OplBaseWorkCode, OplOrderStandard } from '@prisma/client'
import { useState } from 'react'

import {
  ALL_ACTIVATION_CODES,
  ALL_ADDON_CODES,
  ALL_BASE_CODES,
} from '@/app/(modules)/opl-crm/utils/order/completeOrderHelper'
import { ActivationSection } from '../ActivationSection'
import { AddonsSection } from '../AddonsSection'
import { BaseWorkSection } from '../BaseWorkSection'
import { DigInputDialog } from '../DigInputDialog'
import { SelectedCodesSummary } from '../SelectedCodesSummary'

type Props = {
  standard?: OplOrderStandard
  onNext: () => void
  onBack: () => void
}

/**
 * Wizard step for selecting OPL work codes.
 */
const OplStepWorkCodes = ({ standard, onNext, onBack }: Props) => {
  const {
    state,

    basePrimary,
    activationPrimary,
    addonsPrimary,

    showAllBase,
    setShowAllBase,
    showAllActivation,
    setShowAllActivation,
    showAllAddons,
    setShowAllAddons,

    setBase,
    setActivation,
    incMr,
    toggleUmz,
    toggleAddon,
    setDigInput,
    resetAll,
  } = useOplWorkCodes(standard)

  const [digDialog, setDigDialog] = useState<
    { open: false } | { open: true; type: 'ZJD' | 'ZJK' | 'ZJN' }
  >({ open: false })

  /**
   * Handles base work code selection.
   * Opens DIG input dialog for ZJ bases.
   */
  const onBaseChange = (base: OplBaseWorkCode) => {
    setBase(base)

    if (base === 'ZJD' || base === 'ZJK' || base === 'ZJN') {
      setDigDialog({ open: true, type: base })
    }
  }

  /**
   * Resets entire work codes step including UI state.
   */
  const handleReset = () => {
    resetAll()

    setShowAllBase(false)
    setShowAllActivation(false)
    setShowAllAddons(false)

    setDigDialog({ open: false })
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6 p-4">
        {/* BASE CODES */}
        <Card className="p-4">
          <BaseWorkSection
            value={state.base}
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
            value={state.activation}
            primary={activationPrimary}
            all={ALL_ACTIVATION_CODES}
            showAll={showAllActivation}
            onToggleShowAll={() => setShowAllActivation((v) => !v)}
            onChange={setActivation}
            base={state.base}
          />
        </Card>

        {/* ADDITIONAL CODES */}
        <Card className="p-4">
          <AddonsSection
            base={state.base}
            primary={addonsPrimary}
            all={ALL_ADDON_CODES}
            showAll={showAllAddons}
            activation={state.activation}
            mrCount={state.mrCount}
            umz={state.umz}
            onToggleShowAll={() => setShowAllAddons((v) => !v)}
            onMr={incMr}
            onToggleAddon={toggleAddon}
            onToggleUmz={toggleUmz}
            selected={state.addons}
          />
        </Card>

        {/* SUMMARY */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Wybrane kody</h3>
          </div>
          <SelectedCodesSummary state={state} />
        </Card>
        <div className="w-full">
          <Button
            variant="default"
            size="sm"
            onClick={handleReset}
            disabled={
              !state.base &&
              !state.activation &&
              state.addons.length === 0 &&
              state.mrCount === 0 &&
              !state.umz &&
              !state.digInput
            }
            className="w-full"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Wstecz
        </Button>
        <Button
          className="flex-1"
          disabled={
            !state.base &&
            !state.activation &&
            state.addons.length === 0 &&
            state.mrCount === 0 &&
            !state.umz &&
            !state.digInput
          }
          onClick={() => console.log('dalej')}
        >
          Dalej
        </Button>
      </div>

      {/* DIG INPUT DIALOG */}
      {digDialog.open && (
        <DigInputDialog
          type={digDialog.type}
          open
          onClose={() => setDigDialog({ open: false })}
          onConfirm={(value) => {
            if (digDialog.type === 'ZJN') {
              setDigInput({ type: 'ZJN', points: value })
            } else {
              setDigInput({ type: digDialog.type, meters: value })
            }

            setDigDialog({ open: false })
          }}
        />
      )}
    </div>
  )
}

export default OplStepWorkCodes
