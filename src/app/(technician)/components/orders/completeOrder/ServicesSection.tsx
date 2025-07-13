'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { ActivatedService, ServiceType } from '@/types'
import { DeviceCategory } from '@prisma/client'
import { GrPowerReset } from 'react-icons/gr'
import DeviceSummaryRow from './DeviceSummaryRow'

type Props = {
  operator: string
  devices: {
    id: string
    name: string
    serialNumber: string | null
    category: string
  }[]
  value: ActivatedService[]
  onChangeAction: (services: ActivatedService[]) => void
}

/**
 * ServicesSection – Technician order services selection.
 * - Always uses DeviceSummaryRow for device presentation (as a Card).
 * - Remove always by service.id (not deviceId).
 * - During adding, shows action label and extra UI as children.
 */
export const ServicesSection = ({
  operator,
  devices,
  value,
  onChangeAction,
}: Props) => {
  // Adds a new service (DTV: multiple, others: max 1)
  const addService = (type: ServiceType) => {
    if (type === 'DTV' || !value.some((v) => v.type === type)) {
      onChangeAction([...value, { id: crypto.randomUUID(), type }])
    }
  }

  // Removes a service entry by service id
  const removeService = (id: string) => {
    onChangeAction(value.filter((v) => v.id !== id))
  }

  // Updates a specific service entry by service id
  const updateService = (id: string, partial: Partial<ActivatedService>) => {
    onChangeAction(value.map((v) => (v.id === id ? { ...v, ...partial } : v)))
  }

  // Resets all services
  const resetAll = () => onChangeAction([])

  // Confirm DTV measurements
  const confirmUsDbm = (id: string) => {
    updateService(id, { usDbmConfirmed: true })
  }

  // Confirm NET speedtest
  const confirmSpeedTest = (id: string) => {
    updateService(id, { speedTestConfirmed: true })
  }

  // Counts services of a given type
  const count = (type: ServiceType) =>
    value.filter((v) => v.type === type).length

  // Safe cast to DeviceCategory (fallback to OTHER)
  const asDeviceCategory = (cat: string | undefined | null) => {
    if (!cat || !(cat in DeviceCategory)) return DeviceCategory.OTHER
    return cat as DeviceCategory
  }

  return (
    <div>
      {/* Selection buttons */}
      <div className="grid gap-2 mb-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Button
          variant={count('DTV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={() => addService('DTV')}
        >
          DTV
          {count('DTV') > 0 && <span className="ml-1">×{count('DTV')}</span>}
        </Button>
        <Button
          variant={count('NET') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('NET') > 0}
          onClick={() => addService('NET')}
        >
          NET
        </Button>
        <Button
          variant={count('TEL') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('TEL') > 0}
          onClick={() => addService('TEL')}
        >
          TEL
        </Button>
        <Button
          variant={count('ATV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('ATV') > 0}
          onClick={() => addService('ATV')}
        >
          ATV
        </Button>
        {value.length > 0 && (
          <Button
            variant="ghost"
            className="w-full col-span-1 sm:col-span-2 md:col-span-4"
            onClick={resetAll}
          >
            <GrPowerReset /> Resetuj
          </Button>
        )}
      </div>

      {/* Render service entries */}
      <div className="space-y-4">
        {value.map((service) => {
          // ---- DTV ----
          if (service.type === 'DTV') {
            // Step 1: select decoder
            if (!service.serialNumber || !service.deviceType) {
              const candidates = devices.filter(
                (d) =>
                  d.category === 'DECODER_1_WAY' ||
                  d.category === 'DECODER_2_WAY'
              )
              return (
                <DeviceSummaryRow
                  key={service.id}
                  device={{
                    id: service.id, // Always use service.id!
                    name: '',
                    serialNumber: '',
                    category: DeviceCategory.OTHER,
                    type: 'DEVICE',
                  }}
                  label="DTV"
                  onRemove={removeService}
                >
                  <span className="text-muted-foreground text-sm mb-1">
                    Dodaj dekoder
                  </span>
                  <SerialScanInput
                    devices={candidates}
                    onAddDevice={(dev) =>
                      updateService(service.id, {
                        deviceId: dev.id,
                        serialNumber: dev.serialNumber,
                        deviceType: dev.category as
                          | 'DECODER_1_WAY'
                          | 'DECODER_2_WAY',
                      })
                    }
                    variant="block"
                  />
                </DeviceSummaryRow>
              )
            }
            // Step 2: DS/US for 2-way
            if (
              service.deviceType === 'DECODER_2_WAY' &&
              !service.usDbmConfirmed
            ) {
              const deviceObj = devices.find((d) => d.id === service.deviceId)
              return (
                <DeviceSummaryRow
                  key={service.id}
                  device={{
                    id: service.id, // Only service.id!
                    name: deviceObj?.name || '',
                    serialNumber: service.serialNumber ?? '',
                    category: asDeviceCategory(service.deviceType),
                    type: 'DEVICE',
                  }}
                  label="DTV"
                  onRemove={removeService}
                >
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="DS [dBm]"
                      value={service.usDbmDown ?? ''}
                      onChange={(e) =>
                        updateService(service.id, {
                          usDbmDown: e.target.value,
                        })
                      }
                      required
                    />
                    <Input
                      placeholder="US [dBm]"
                      value={service.usDbmUp ?? ''}
                      onChange={(e) =>
                        updateService(service.id, { usDbmUp: e.target.value })
                      }
                      required
                    />
                    <Button
                      className="h-10"
                      onClick={() => confirmUsDbm(service.id)}
                      disabled={!service.usDbmDown || !service.usDbmUp}
                    >
                      Dodaj
                    </Button>
                  </div>
                </DeviceSummaryRow>
              )
            }
            // Step 3: summary
            const deviceObj = devices.find((d) => d.id === service.deviceId)
            return (
              <DeviceSummaryRow
                key={service.id}
                device={{
                  id: service.id, // Always use service.id!
                  name: deviceObj?.name || '',
                  serialNumber: service.serialNumber ?? '',
                  category: asDeviceCategory(service.deviceType),
                  type: 'DEVICE',
                }}
                label="DTV"
                onRemove={removeService}
              >
                {service.deviceType === 'DECODER_2_WAY' && (
                  <div className="text-sm text-muted-foreground mt-1">
                    DS: {service.usDbmDown} dBm | US: {service.usDbmUp} dBm
                  </div>
                )}
              </DeviceSummaryRow>
            )
          }

          // ---- NET ----
          if (service.type === 'NET') {
            const routerNeeded = operator === 'TMPL'
            const modemSelected = !!service.serialNumber && !!service.deviceId
            const routerSelected = routerNeeded
              ? !!service.serialNumber2 && !!service.deviceId2
              : true

            // Step 1: select modem
            if (!modemSelected) {
              const modemCandidates = devices.filter(
                (d) => d.category === 'MODEM'
              )
              return (
                <DeviceSummaryRow
                  key={service.id}
                  device={{
                    id: service.id, // Only service.id!
                    name: '',
                    serialNumber: '',
                    category: DeviceCategory.OTHER,
                    type: 'DEVICE',
                  }}
                  label="NET"
                  onRemove={removeService}
                >
                  <span className="text-muted-foreground text-sm mb-1">
                    Dodaj modem
                  </span>
                  <SerialScanInput
                    devices={modemCandidates}
                    onAddDevice={(dev) =>
                      updateService(service.id, {
                        deviceId: dev.id,
                        serialNumber: dev.serialNumber,
                      })
                    }
                    variant="block"
                  />
                </DeviceSummaryRow>
              )
            }
            // Step 2: router for TMPL
            // ...początek komponentu...

            if (routerNeeded && !routerSelected) {
              const modemObj = devices.find((d) => d.id === service.deviceId)
              const routerCandidates = devices.filter(
                (d) => d.category === 'MODEM'
              )
              const routerObj = devices.find((d) => d.id === service.deviceId2)

              return (
                <>
                  {/* Modem (wybrany) */}
                  <DeviceSummaryRow
                    key={service.id}
                    device={{
                      id: service.id,
                      name: modemObj?.name || '',
                      serialNumber: service.serialNumber ?? '',
                      category: DeviceCategory.MODEM,
                      type: 'DEVICE',
                    }}
                    label="NET"
                    onRemove={removeService}
                  />

                  {/* Router – osobny Card */}
                  {!service.serialNumber2 ? (
                    <DeviceSummaryRow
                      key={service.id + '-router-add'}
                      device={{
                        id: service.id + '-router',
                        name: '',
                        serialNumber: '',
                        category: DeviceCategory.MODEM,
                        type: 'DEVICE',
                      }}
                      label="NET"
                    >
                      <span className="text-muted-foreground text-sm mb-1">
                        Dodaj router
                      </span>
                      <SerialScanInput
                        devices={routerCandidates}
                        onAddDevice={(dev) =>
                          updateService(service.id, {
                            deviceId2: dev.id,
                            serialNumber2: dev.serialNumber,
                          })
                        }
                        variant="block"
                      />
                    </DeviceSummaryRow>
                  ) : (
                    <DeviceSummaryRow
                      key={service.id + '-router'}
                      device={{
                        id: service.id + '-router',
                        name: routerObj?.name || '',
                        serialNumber: service.serialNumber2 ?? '',
                        category: DeviceCategory.MODEM,
                        type: 'DEVICE',
                      }}
                      label="NET"
                      // onRemove={...jeśli chcesz kasować router osobno...}
                    />
                  )}
                </>
              )
            }

            // Step 3: speedtest
            if (!service.speedTestConfirmed) {
              const modemObj = devices.find((d) => d.id === service.deviceId)
              const routerObj = devices.find((d) => d.id === service.deviceId2)
              return (
                <DeviceSummaryRow
                  key={service.id}
                  device={{
                    id: service.id,
                    name: modemObj?.name || '',
                    serialNumber: service.serialNumber ?? '',
                    category: DeviceCategory.MODEM,
                    type: 'DEVICE',
                  }}
                  label="NET"
                  onRemove={removeService}
                >
                  {routerNeeded && service.serialNumber2 && (
                    <DeviceSummaryRow
                      device={{
                        id: service.id + '-router', // Unikalny ID dla routera, nie do usuwania!
                        name: routerObj?.name || '',
                        serialNumber: service.serialNumber2 ?? '',
                        category: DeviceCategory.MODEM,
                        type: 'DEVICE',
                      }}
                      label="Router"
                      className="mt-2"
                      // NIE przekazuj onRemove!
                    />
                  )}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Pomiar prędkości [Mbps]"
                      value={service.speedTest ?? ''}
                      onChange={(e) =>
                        updateService(service.id, {
                          speedTest: e.target.value,
                        })
                      }
                      required
                    />
                    <Button
                      className="h-10"
                      onClick={() => confirmSpeedTest(service.id)}
                      disabled={!service.speedTest}
                    >
                      Dodaj
                    </Button>
                  </div>
                </DeviceSummaryRow>
              )
            }
            // Step 4: summary (NET + Router jeśli był)
            const modemObj = devices.find((d) => d.id === service.deviceId)
            const routerObj = devices.find((d) => d.id === service.deviceId2)
            return (
              <>
                <DeviceSummaryRow
                  key={service.id}
                  device={{
                    id: service.id,
                    name: modemObj?.name || '',
                    serialNumber: service.serialNumber ?? '',
                    category: DeviceCategory.MODEM,
                    type: 'DEVICE',
                  }}
                  label="NET"
                  onRemove={removeService}
                >
                  {service.speedTest && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Prędkość: {service.speedTest} Mbps
                    </div>
                  )}
                </DeviceSummaryRow>
                {routerNeeded && service.serialNumber2 && (
                  <DeviceSummaryRow
                    device={{
                      id: service.id + '-router', // Unikalny
                      name: routerObj?.name || '',
                      serialNumber: service.serialNumber2 ?? '',
                      category: DeviceCategory.MODEM,
                      type: 'DEVICE',
                    }}
                    label="Router"
                    className="mt-2"
                  />
                )}
              </>
            )
          }

          // ---- TEL ----
          if (service.type === 'TEL') {
            return (
              <DeviceSummaryRow
                key={service.id}
                device={{
                  id: service.id,
                  name: '',
                  serialNumber: '',
                  category: DeviceCategory.OTHER,
                  type: 'DEVICE',
                }}
                label="TEL"
                onRemove={removeService}
              />
            )
          }

          // ---- ATV ----
          if (service.type === 'ATV') {
            return (
              <DeviceSummaryRow
                key={service.id}
                device={{
                  id: service.id,
                  name: '',
                  serialNumber: '',
                  category: DeviceCategory.OTHER,
                  type: 'DEVICE',
                }}
                label="ATV"
                onRemove={removeService}
              >
                <Textarea
                  placeholder="Uwagi (opcjonalnie)"
                  value={service.notes ?? ''}
                  onChange={(e) =>
                    updateService(service.id, { notes: e.target.value })
                  }
                />
              </DeviceSummaryRow>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

export default ServicesSection
