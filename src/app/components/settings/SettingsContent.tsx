import OplAdminsSection from '@/app/(modules)/opl-crm/components/settings/admin-panel/adminSection/OplAdminsSection'
import VectraAdminsSection from '@/app/(modules)/vectra-crm/components/settings/admin-panel/adminSection/VectraAdminsSection'
import DeviceDefinitionsSection from '@/app/(modules)/vectra-crm/components/settings/admin-panel/deviceDefinition/VectraDeviceDefinitionsSection'
import MaterialDefinitionsSection from '@/app/(modules)/vectra-crm/components/settings/admin-panel/materialDefinition/VectraMaterialDefinitionsSection'
import OperatorsDefinitionSection from '@/app/(modules)/vectra-crm/components/settings/admin-panel/operatorsSection/VectraOperatorsDefinitionSection'
import RatesSection from '@/app/(modules)/vectra-crm/components/settings/admin-panel/rateSection/VectraRatesSection'
import { SettingsContext } from '@/types'
import type { Role } from '@prisma/client'
import TechnicianProfileSettings from '../../(modules)/vectra-crm/components/settings/technician/TechnicianProfileSettings'
import LocationsSection from './location/LocationsSection'

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
    return <>{role === 'ADMIN' && <LocationsSection title="Lokalizacje" />}</>
  }

  if (section === 'VECTRA') {
    return (
      <>
        {role === 'ADMIN' && <VectraAdminsSection title="Administratorzy" />}
        {role === 'ADMIN' && <RatesSection title="Stawki" />}

        <DeviceDefinitionsSection title="Urządzenia" />
        <MaterialDefinitionsSection title="Materiał" />
        <OperatorsDefinitionSection title="Operatorzy" />
      </>
    )
  }

  if (section === 'OPL') {
    return (
      <>
        {role === 'ADMIN' && <OplAdminsSection title="Administratorzy" />}
        {role === 'ADMIN' && <RatesSection title="Stawki" />}

        <DeviceDefinitionsSection title="Urządzenia" />
        <MaterialDefinitionsSection title="Materiał" />
        <OperatorsDefinitionSection title="Operatorzy" />
      </>
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
