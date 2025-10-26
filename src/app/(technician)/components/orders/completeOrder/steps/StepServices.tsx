'use client'

import { Button } from '@/app/components/ui/button'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { OrderType } from '@prisma/client'
import { useMemo } from 'react'
import { toast } from 'sonner'
import ServicesSection from '../ServicesSection'

/**
 * StepServices
 * ----------------------------
 * Step 2 of CompleteOrderWizard – service configuration step.
 * - Integrates ServicesSection (DTV/NET/TEL/ATV).
 * - Performs validation based on service type and source.
 * - Ensures all mandatory data is filled before proceeding.
 */
interface StepServicesProps {
  services: ActivatedService[]
  setServices: (v: ActivatedService[]) => void
  onNext: (data: ActivatedService[]) => void
  onBack: () => void
  operator: string
  devices: IssuedItemDevice[]
  orderType?: OrderType
}

const StepServices = ({
  services,
  setServices,
  onNext,
  onBack,
  operator,
  devices,
}: StepServicesProps) => {
  /**
   * Validation – ensures all required fields are completed before proceeding.
   */
  const allValid = useMemo(() => {
    if (services.length === 0) return false

    for (const s of services) {
      // --- DTV validation ---
      if (s.type === 'DTV') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName || !s.serialNumber) return false
        } else if (!s.deviceId && !s.serialNumber) {
          return false
        }

        // DECODER_2_WAY requires DS/US
        if (s.deviceType === 'DECODER_2_WAY') {
          if (s.usDbmDown === undefined || s.usDbmUp === undefined) return false
        }
      }

      // --- NET validation ---
      if (s.type === 'NET') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName || !s.serialNumber) return false
        } else if (!s.deviceId && !s.serialNumber) {
          return false
        }

        // MODEM_GPON – only speedtest required
        if (s.deviceType === 'MODEM_GPON') {
          if (!s.speedTest) return false
        } else {
          // MODEM_HFC – requires DS/US and speedtest
          if (
            s.usDbmDown === undefined ||
            s.usDbmUp === undefined ||
            !s.speedTest
          )
            return false
        }
      }

      // --- TEL validation ---
      if (s.type === 'TEL') {
        if (s.serialNumber && s.serialNumber.trim().length < 3) return false
      }

      // ATV and others have no strict requirements
    }

    return true
  }, [services])

  /**
   * Next step handler with toast-based feedback.
   */
  const handleNext = () => {
    if (!allValid) {
      toast.error('Uzupełnij wszystkie wymagane dane przed przejściem dalej.')
      return
    }
    onNext(services)
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* --- Step content --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <h3 className="text-xl font-semibold text-center mb-4">
          Skonfiguruj zainstalowane usługi
        </h3>

        <ServicesSection
          operator={operator}
          devices={devices}
          value={services}
          onChangeAction={setServices}
        />

        {services.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Brak dodanych usług. Dodaj je, korzystając z przycisków powyżej.
          </p>
        )}
      </div>

      {/* --- Bottom buttons --- */}
      <div className="sticky bottom-0 bg-background flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>
        <Button
          className="flex-1 h-12"
          onClick={handleNext}
          disabled={!allValid}
        >
          Dalej
        </Button>
      </div>
    </div>
  )
}

export default StepServices
