'use client'

import { Button } from '@/app/components/ui/button'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { OrderType } from '@prisma/client'
import { useMemo } from 'react'
import { toast } from 'sonner'
import ServicesSection from '../ServicesSection'

interface StepServicesProps {
  services: ActivatedService[]
  setServices: (v: ActivatedService[]) => void
  onNext: (data: ActivatedService[]) => void
  onBack: () => void
  operator: string
  devices: IssuedItemDevice[]
  orderType?: OrderType
}

/**
 * StepServices
 * Step 2 of CompleteOrderWizard – service configuration.
 *
 * - Displays the ServicesSection (no "add service" buttons).
 * - Validates required fields before proceeding (serial numbers, DS/US, speedtest).
 * - Disables "Next" button until all required data is filled in.
 */
const StepServices = ({
  services,
  setServices,
  onNext,
  onBack,
  operator,
  devices,
}: StepServicesProps) => {
  // Determine whether all service fields are valid
  const allValid = useMemo(() => {
    if (services.length === 0) return false

    const isTMobile =
      operator.trim().toUpperCase().replace(/\s+/g, '').includes('TMOBILE') ||
      operator === 'TMPL'

    for (const s of services) {
      if (s.type === 'DTV') {
        if (!s.deviceId && !s.serialNumber) return false
        if (s.deviceType === 'DECODER_2_WAY') {
          if (s.usDbmDown === undefined || s.usDbmUp === undefined) return false
        }
      }

      if (s.type === 'NET') {
        if (!s.deviceId && !s.serialNumber) return false
        if (isTMobile && !s.deviceId2 && !s.serialNumber2) return false
        if (
          s.usDbmDown === undefined ||
          s.usDbmUp === undefined ||
          !s.speedTest
        )
          return false
      }
    }

    return true
  }, [services, operator])

  const handleNext = () => {
    if (!allValid) {
      toast.error(
        'Uzupełnij wszystkie wymagane dane dla każdej usługi (urządzenie, DS/US, Speedtest itp.).'
      )
      return
    }

    onNext(services)
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <h3 className="text-xl font-semibold text-center mb-4">
          Dodaj zainstalwoane uslugi
        </h3>

        <ServicesSection
          operator={operator}
          devices={devices}
          value={services}
          onChangeAction={setServices}
          mode="complete"
        />

        {services.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Brak dodanych usług. Dodaj je wybierając powyżej.
          </p>
        )}
      </div>

      {/* Bottom buttons */}
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
