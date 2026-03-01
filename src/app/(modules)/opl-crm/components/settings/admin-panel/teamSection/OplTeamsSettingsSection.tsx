'use client'

import SearchInput from '@/app/components/SearchInput'
import SettingsSection from '@/app/components/settings/SettingsSection'
import { useState } from 'react'
import OplTeamsTable from '@/app/(modules)/opl-crm/admin-panel/components/employees/OplTeamsTable'

type Props = {
  title: string
}

const OplTeamsSettingsSection = ({ title }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <SettingsSection title={title}>
      <div className="mb-3 flex items-center justify-end gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Szukaj ekipy lub technika..."
          className="w-full max-w-sm"
        />
      </div>

      <OplTeamsTable searchTerm={searchTerm} />
    </SettingsSection>
  )
}

export default OplTeamsSettingsSection
