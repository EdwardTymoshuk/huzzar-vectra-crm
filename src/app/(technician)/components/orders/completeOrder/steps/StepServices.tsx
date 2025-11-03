'use client'

import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { OrderType } from '@prisma/client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import ServicesSection from '../ServicesSection'

/**
 * StepServices
 * ------------------------------------------------------------
 * Wizard step responsible for configuring installed services.
 * - Holds the source of truth for ActivatedService[].
 * - Merges technician stock with locally freed devices.
 * - Validates that all required data for each service is complete.
 * - Includes tooltip explaining why the "Next" button is disabled.
 */
interface StepServicesProps {
  services: ActivatedService[]
  setServices: (v: ActivatedService[]) => void
  onNext: (data: ActivatedService[]) => void
  onBack: () => void
  operator: string
  /** Technician stock from backend */
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
  /** Locally tracked freed devices so they can be reused again */
  const [freedDevices, setFreedDevices] = useState<IssuedItemDevice[]>([])

  /**
   * Merge backend devices with locally freed ones,
   * so dialogs (SerialScanInput, ServiceConfigDialog) can see them again.
   */
  const mergedDevices = useMemo<IssuedItemDevice[]>(() => {
    const out = [...devices]
    freedDevices.forEach((fd) => {
      if (!out.some((d) => d.id === fd.id)) out.push(fd)
    })
    return out
  }, [devices, freedDevices])

  /** Called from ServicesSection when devices are released */
  const handleDevicesFreed = (released: IssuedItemDevice[]) => {
    setFreedDevices((prev) => {
      const next = [...prev]
      released.forEach((dev) => {
        if (!next.some((p) => p.id === dev.id)) next.push(dev)
      })
      return next
    })
  }

  /**
   * Validates that all required fields in each service are filled.
   * Allows for null values coming from backend (edit mode).
   */
  const allValid = useMemo(() => {
    if (services.length === 0) return false

    for (const s of services) {
      // --- DTV ---
      if (s.type === 'DTV') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName?.trim() || !s.serialNumber?.trim()) return false
        } else if (!s.deviceId && !s.serialNumber?.trim()) {
          return false
        }
        if (s.deviceType === 'DECODER_2_WAY') {
          if (s.usDbmDown == null || s.usDbmUp == null) return false
        }
      }

      // --- NET ---
      if (s.type === 'NET') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName?.trim() || !s.serialNumber?.trim()) return false
        } else if (!s.deviceId && !s.serialNumber?.trim()) {
          return false
        }

        if (s.deviceType === 'MODEM_GPON') {
          if (!s.speedTest || s.speedTest?.trim().length === 0) return false
        } else {
          if (
            s.usDbmDown == null ||
            s.usDbmUp == null ||
            !s.speedTest ||
            s.speedTest?.trim().length === 0
          ) {
            return false
          }
        }
      }

      // --- TEL ---
      if (s.type === 'TEL') {
        const telServices = services.filter((sv) => sv.type === 'TEL')
        const telIndex = telServices.findIndex((sv) => sv.id === s.id)
        if (telIndex > 0) {
          if (!s.serialNumber?.trim() || s.serialNumber.trim().length < 3)
            return false
        } else {
          if (s.serialNumber && s.serialNumber.trim().length < 3) return false
        }
      }
    }

    return true
  }, [services])

  /**
   * Handles the Next button click – validates and emits data upward.
   */
  const handleNext = () => {
    if (!allValid) {
      toast.error('Uzupełnij wszystkie wymagane dane przed przejściem dalej.')
      return
    }
    onNext(services)
  }

  /**
   * Returns tooltip message explaining why "Next" button is disabled.
   */
  const getTooltipMessage = (): string => {
    if (services.length === 0) return 'Dodaj co najmniej jedną usługę.'
    for (const s of services) {
      if (s.type === 'DTV') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName?.trim() || !s.serialNumber?.trim())
            return 'Uzupełnij nazwę i numer seryjny dekodera klienta.'
        } else if (!s.deviceId && !s.serialNumber?.trim()) {
          return 'Wybierz urządzenie z magazynu dla dekodera.'
        }
        if (s.deviceType === 'DECODER_2_WAY') {
          if (s.usDbmDown == null || s.usDbmUp == null)
            return 'Uzupełnij pomiary DS/US dla dekodera 2-way.'
        }
      }

      if (s.type === 'NET') {
        if (s.deviceSource === 'CLIENT') {
          if (!s.deviceName?.trim() || !s.serialNumber?.trim())
            return 'Uzupełnij nazwę i numer seryjny modemu klienta.'
        } else if (!s.deviceId && !s.serialNumber?.trim()) {
          return 'Wybierz urządzenie z magazynu dla usługi NET.'
        }

        if (s.deviceType === 'MODEM_GPON') {
          if (!s.speedTest || s.speedTest?.trim().length === 0)
            return 'Podaj wynik Speedtest dla modemu GPON.'
        } else {
          if (
            s.usDbmDown == null ||
            s.usDbmUp == null ||
            !s.speedTest ||
            s.speedTest?.trim().length === 0
          ) {
            return 'Uzupełnij pomiary DS/US oraz wynik Speedtest.'
          }
        }
      }

      if (s.type === 'TEL') {
        const telServices = services.filter((sv) => sv.type === 'TEL')
        const telIndex = telServices.findIndex((sv) => sv.id === s.id)
        if (telIndex > 0) {
          if (!s.serialNumber?.trim() || s.serialNumber.trim().length < 3)
            return 'Dla kolejnych kart SIM numer seryjny jest wymagany.'
        } else if (s.serialNumber && s.serialNumber.trim().length < 3) {
          return 'Podaj poprawny numer seryjny urządzenia TEL.'
        }
      }
    }
    return 'Uzupełnij wszystkie wymagane dane.'
  }

  /** --- Component render --- */
  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <h3 className="text-xl font-semibold text-center mb-4">
          Skonfiguruj zainstalowane usługi
        </h3>

        <ServicesSection
          operator={operator}
          devices={mergedDevices}
          value={services}
          onChangeAction={setServices}
          onDevicesFreed={handleDevicesFreed}
        />

        {services.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Brak dodanych usług. Dodaj je, korzystając z przycisków powyżej.
          </p>
        )}
      </div>

      {/* --- Footer buttons --- */}
      <div className="sticky bottom-0 bg-background flex gap-3 p-4">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-1">
                <Button
                  className="w-full h-12"
                  onClick={handleNext}
                  disabled={!allValid}
                >
                  Dalej
                </Button>
              </div>
            </TooltipTrigger>

            {!allValid && (
              <TooltipContent
                side="top"
                className="max-w-xs whitespace-normal break-words text-center"
              >
                {getTooltipMessage()}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export default StepServices
