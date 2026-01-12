import type { Role } from '@prisma/client'

import AdminsSection from '@/app/(modules)/vectra-crm/admin-panel/components/settings/adminSection/AdminsSection'
import DeviceDefinitionsSection from '@/app/(modules)/vectra-crm/admin-panel/components/settings/deviceDefinition/DeviceDefinitionsSection'
import MaterialDefinitionsSection from '@/app/(modules)/vectra-crm/admin-panel/components/settings/materialDefinition/MaterialDefinitionsSection'
import OperatorsDefinitionSection from '@/app/(modules)/vectra-crm/admin-panel/components/settings/operatorsSection/OperatorsDefinitionSection'
import RatesSection from '@/app/(modules)/vectra-crm/admin-panel/components/settings/rateSection/RatesSection'
import { SettingsSectionConfig } from '@/lib/settings/settings'
import LocationsSection from './location/LocationsSection'

interface Props {
  section: SettingsSectionConfig
  role?: Role
}

export const SettingsContent = ({ section, role }: Props) => {
  if (section === 'CORE') {
    return <>{role === 'ADMIN' && <LocationsSection title="Lokalizacje" />}</>
  }

  if (section === 'VECTRA') {
    return (
      <>
        {role === 'ADMIN' && <AdminsSection title="Administratorzy" />}
        {role === 'ADMIN' && <RatesSection title="Stawki" />}

        <DeviceDefinitionsSection title="Urządzenia" />
        <MaterialDefinitionsSection title="Materiał" />
        <OperatorsDefinitionSection title="Operatorzy" />
      </>
    )
  }

  if (section === 'OPL') {
    return (
      <div className="text-muted-foreground">
        Moduł Orange – w przygotowaniu
      </div>
    )
  }

  if (section === 'FLEET') {
    return (
      <div className="text-muted-foreground">Moduł Flota – w przygotowaniu</div>
    )
  }

  return null
}
