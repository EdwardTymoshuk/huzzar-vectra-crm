'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useSession } from 'next-auth/react'
import AdminsSection from '../components/settings/adminSection/AdminsSection'
import DeviceDefinitionsSection from '../components/settings/deviceDefinition/DeviceDefinitionsSection'
import MaterialDefinitionsSection from '../components/settings/materialDefinition/MaterialDefinitionsSection'
import OperatorsDefinitionSection from '../components/settings/operatorsSection/OperatorsDefinitionSection'
import RatesSection from '../components/settings/rateSection/RatesSection'

const SettingPage = () => {
  const { data: session, status } = useSession()
  const role = session?.user?.role

  if (status === 'loading') {
    // Skeleton placeholder while session is being loaded
    return (
      <MaxWidthWrapper>
        <div className="space-y-6">
          <Skeleton className="h-10 w-40" /> {/* PageHeader placeholder */}
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </MaxWidthWrapper>
    )
  }

  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />

      {/* ADMIN ONLY */}
      {role === 'ADMIN' && <AdminsSection title="Administratorzy" />}
      {role === 'ADMIN' && <RatesSection title="Stawki" />}

      {/* COMMON FOR ADMIN & COORDINATOR */}
      <DeviceDefinitionsSection title="Urządzenia" />
      <MaterialDefinitionsSection title="Materiał" />
      <OperatorsDefinitionSection title="Operatorzy" />
    </MaxWidthWrapper>
  )
}

export default SettingPage
