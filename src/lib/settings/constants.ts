//src/lib/settings/constants.ts

import { Role } from '@prisma/client'

export const vectraSettingsSection = [
  {
    key: 'admins',
    title: 'Administratorzy',
    Component:
      require('@/app/(modules)/vectra-crm/components/settings/adminSection/AdminsSection')
        .default,
    roles: [Role.ADMIN],
  },
  {
    key: 'rates',
    title: 'Stawki',
    Component:
      require('@/app/(modules)/vectra-crm/components/settings/rateSection/RatesSection')
        .default,
    roles: [Role.ADMIN],
  },
  {
    key: 'devices',
    title: 'Urządzenia',
    Component:
      require('@/app/(modules)/vectra-crm/components/settings/deviceDefinition/DeviceDefinitionsSection')
        .default,
  },
  {
    key: 'materials',
    title: 'Materiał',
    Component:
      require('@/app/(modules)/vectra-crm/components/settings/materialDefinition/MaterialDefinitionsSection')
        .default,
  },
  {
    key: 'operators',
    title: 'Operatorzy',
    Component:
      require('@/app/(modules)/vectra-crm/components/settings/operatorsSection/OperatorsDefinitionSection')
        .default,
  },
]

export const coreSettingsSection = [
  {
    key: 'warehouse-locations',
    title: 'Lokalizacje',
    Component: require('@/app/components/settings/location/LocationsSection')
      .default,
    roles: [Role.ADMIN],
  },
]
