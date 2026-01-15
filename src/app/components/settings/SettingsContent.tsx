import AdminsSection from '@/app/components/settings/admin-panel/adminSection/AdminsSection'
import { SettingsContext } from '@/types'
import type { Role } from '@prisma/client'
import DeviceDefinitionsSection from './admin-panel/deviceDefinition/DeviceDefinitionsSection'
import LocationsSection from './admin-panel/location/LocationsSection'
import MaterialDefinitionsSection from './admin-panel/materialDefinition/MaterialDefinitionsSection'
import OperatorsDefinitionSection from './admin-panel/operatorsSection/OperatorsDefinitionSection'
import RatesSection from './admin-panel/rateSection/RatesSection'
import TechnicianProfileSettings from './technician/TechnicianProfileSettings'

interface Props {
  section: SettingsContext
  role?: Role
}

/**
 * SettingsContent
 * ------------------------------------------------------
 * Renders settings sections depending on active context
 * (CORE / VECTRA / OPL / etc.) and user role.
 */
export const SettingsContent = ({ section, role }: Props) => {
  if (section === 'CORE') {
    return (
      <>
        {role === 'ADMIN' && <AdminsSection title="Administratorzy" />}
        {role === 'ADMIN' && <LocationsSection title="Lokalizacje" />}
      </>
    )
  }

  if (section === 'VECTRA') {
    return (
      <>
        {role === 'ADMIN' && <RatesSection title="Stawki" />}

        <DeviceDefinitionsSection title="Urządzenia" />
        <MaterialDefinitionsSection title="Materiał" />
        <OperatorsDefinitionSection title="Operatorzy" />
      </>
    )
  }

  if (section === 'OPL') {
    return (
      <div className="pt-8 text-muted-foreground">
        Moduł OPL – w przygotowaniu
      </div>
    )
  }

  if (section === 'HR') {
    return (
      <div className="pt-8 selection:text-muted-foreground">
        Moduł Kadry – w przygotowaniu
      </div>
    )
  }

  if (section === 'FLEET') {
    return (
      <div className="pt-8 selection:text-muted-foreground">
        Moduł Flota – w przygotowaniu
      </div>
    )
  }

  if (section === 'TOOLS') {
    return (
      <div className="text-muted-foreground">
        Moduł Magazyn narzędzi – w przygotowaniu
      </div>
    )
  }

  if (section === 'PROFILE') {
    return <TechnicianProfileSettings />
  }

  return null
}
