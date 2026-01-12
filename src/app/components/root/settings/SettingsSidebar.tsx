import { SettingsSectionConfig } from '@/lib/settings/settings'
import { Button } from '../../ui/button'

type SectionItem = {
  key: SettingsSectionConfig
  label: string
}

const sections: SectionItem[] = [
  { key: 'CORE', label: 'Ogólne' },
  { key: 'VECTRA', label: 'Vectra' },
  { key: 'OPL', label: 'Orange' },
  { key: 'FLEET', label: 'Flota' },
]

interface Props {
  value: SettingsSectionConfig
  onChange: (section: SettingsSectionConfig) => void
}

export const SettingsSidebar = ({ value, onChange }: Props) => {
  return (
    <div className="w-56 space-y-1">
      {sections.map((s) => (
        <Button
          key={s.key}
          variant={value === s.key ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  )
}
