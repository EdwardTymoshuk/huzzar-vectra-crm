// src/lib/platformModules.ts

import { Briefcase } from 'lucide-react'
import { GrOpera } from 'react-icons/gr'
import { SiVitess } from 'react-icons/si'

export type PlatformModuleDefinition = {
  code: string
  name: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const platformModules: PlatformModuleDefinition[] = [
  {
    code: 'VECTRA',
    name: 'Vectra CRM',
    description: 'Obsługa zleceń dla operatora VECTRA',
    href: '/vectra-crm',
    icon: SiVitess,
  },
  {
    code: 'OPL',
    name: 'OPL CRM',
    description: 'Obsługa zleceń dla operatora OPL',
    href: '/opl-crm',
    icon: GrOpera,
  },
  {
    code: 'HR',
    name: 'Kadry',
    description: 'Zarządzanie pracownikami',
    href: '/hr',
    icon: Briefcase,
  },
]
