import { SettingsSectionConfig } from '@/types'
import { Role, VectraMaterialUnit, VectraOrderStatus } from '@prisma/client'
import { Briefcase } from 'lucide-react'
import { BsTools } from 'react-icons/bs'
import { FaCar } from 'react-icons/fa'
import { GrOpera } from 'react-icons/gr'
import { SiVonage } from 'react-icons/si'

export const VECTRA_PATH = '/vectra-crm'

/**
 * Global status → polish label.
 */
export const statusMap = {
  PENDING: 'NIE PRZYPISANE',
  ASSIGNED: 'PRZYPISANE',
  COMPLETED: 'WYKONANE',
  NOT_COMPLETED: 'NIEWYKONANE',
}

export const statusColorMap: Record<VectraOrderStatus, string> = {
  PENDING: 'bg-primary hover:bg-primary/80 text-white text-center',
  ASSIGNED: 'bg-warning hover:bg-warning/80 text-white text-center',
  COMPLETED: 'bg-success hover:bg-success/80 text-white text-center',
  NOT_COMPLETED: 'bg-danger hover:bg-danger/80 text-white text-center',
}

export const userRoleMap: Record<Role, string> = {
  TECHNICIAN: 'TECHNIK',
  ADMIN: 'ADMINISTRATOR',
  COORDINATOR: 'KOORDYNATOR',
  WAREHOUSEMAN: 'MAGAZYNIER',
}

export const userStatusNameMap = {
  ACTIVE: 'AKTYWNY',
  INACTIVE: 'NIEAKTYWNY',
  SUSPENDED: 'ZABLOKOWANY',
  DELETED: 'USUNIĘTY',
}

export const userStatusColorMap = {
  ACTIVE: 'bg-success hover:bg-success text-white text-center',
  INACTIVE: 'bg-danger hover:bg-danger text-white text-center',
  SUSPENDED: 'bg-warning hover:bg-warning text-white text-center',
  DELETED: 'bg-destructive hover:bg-destructive text-white text-center',
}

export const devicesStatusMap = {
  AVAILABLE: 'DOSTĘPNY NA MAGAZYNIE',
  ASSIGNED: 'PRZYPISANY DO TECHNIKA',
  RETURNED: 'ZWRÓCONY OD TECHNIKA',
  RETURNED_TO_OPERATOR: 'ZWRÓCONY DO OPERATORA',
  ASSIGNED_TO_ORDER: 'WYDANY NA ZLECENIU',
  COLLECTED_FROM_CLIENT: 'ODEBRANY OD KLIENTA',
  TRANSFER: 'PRZEKAZANY',
}

export const materialUnitMap: Record<VectraMaterialUnit, string> = {
  PIECE: 'szt',
  METER: 'm',
}

export const polishMonthsNominative = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
]

export interface PlatformModule {
  code: string
  name: string
  description: string
  href?: string
  icon: React.ElementType
  enabled: boolean
}

export const MODULE_CODES = {
  VECTRA: 'VECTRA',
  OPL: 'OPL',
  HR: 'HR',
  FLEET: 'FLEET',
  TOOLS: 'TOOLS',
} as const

export const platformModules: PlatformModule[] = [
  {
    code: 'VECTRA',
    name: 'Vectra CRM',
    description: 'Obsługa zleceń dla operatora VECTRA',
    href: '/vectra-crm',
    icon: SiVonage,
    enabled: true,
  },
  {
    code: 'OPL',
    name: 'OPL CRM',
    description: 'Obsługa zleceń dla operatora OPL',
    href: '/opl-crm',
    icon: GrOpera,
    enabled: true,
  },
  {
    code: 'HR',
    name: 'Kadry',
    description: 'Zarządzanie pracownikami',
    href: '/hr',
    icon: Briefcase,
    enabled: true,
  },
  {
    code: 'FLEET',
    name: 'Flota',
    description: 'Pojazdy, przeglądy, koszty',
    href: '/FaClockRotateLeft',
    icon: FaCar,
    enabled: true,
  },
  {
    code: 'TOOLS',
    name: 'Magazyn narzędzi',
    description: 'Magazyn narzędzi',
    href: '/tools',
    icon: BsTools,
    enabled: true,
  },
]

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    key: 'CORE',
    label: 'Ogólne',
    roles: ['ADMIN', 'COORDINATOR', 'WAREHOUSEMAN'],
  },
  {
    key: 'VECTRA',
    label: 'Vectra',
    roles: ['ADMIN', 'COORDINATOR', 'WAREHOUSEMAN'],
    module: 'VECTRA',
  },
  {
    key: 'OPL',
    label: 'OPL',
    roles: ['ADMIN', 'COORDINATOR'],
    module: 'OPL',
  },
  {
    key: 'HR',
    label: 'Kadry',
    roles: ['ADMIN', 'COORDINATOR'],
    module: 'HR',
  },
  {
    key: 'FLEET',
    label: 'Flota',
    roles: ['ADMIN', 'COORDINATOR'],
    module: 'FLEET',
  },
  {
    key: 'TOOLS',
    label: 'Magazyn narzędzi',
    roles: ['ADMIN', 'WAREHOUSEMAN'],
    module: 'TOOLS',
  },
]
