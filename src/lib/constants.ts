import { MenuItem, SettingsSectionConfig } from '@/types'
import {
  OplMaterialUnit,
  Role,
  VectraMaterialUnit,
  VectraOrderStatus,
} from '@prisma/client'
import { Briefcase } from 'lucide-react'
import { BsTools } from 'react-icons/bs'
import { FaCar } from 'react-icons/fa'
import { GrOpera } from 'react-icons/gr'
import {
  MdAssignment,
  MdOutlineListAlt,
  MdPeopleAlt,
  MdReceiptLong,
  MdSettings,
  MdSpaceDashboard,
  MdWarehouse,
} from 'react-icons/md'
import { SiVitess } from 'react-icons/si'

export const VECTRA_PATH = '/vectra-crm'
export const OPL_PATH = '/opl-crm'

export type PlatformModuleCode = 'VECTRA' | 'OPL' | 'HR' | 'FLEET' | 'TOOLS'

export const MODULE_CODES = {
  VECTRA: 'VECTRA',
  OPL: 'OPL',
  HR: 'HR',
  FLEET: 'FLEET',
  TOOLS: 'TOOLS',
} as const

export interface PlatformModule {
  code: string
  name: string
  description: string
  href: string
  icon: React.ElementType
  enabled: boolean
}

export const platformModules: PlatformModule[] = [
  {
    code: 'VECTRA',
    name: 'Vectra CRM',
    description: 'Obsługa zleceń dla operatora VECTRA',
    href: '/vectra-crm',
    icon: SiVitess,
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
    href: '/fleet',
    icon: FaCar,
    enabled: false,
  },
  {
    code: 'TOOLS',
    name: 'Magazyn narzędzi',
    description: 'Magazyn narzędzi',
    href: '/tools',
    icon: BsTools,
    enabled: false,
  },
]

/**
 * Menu items for admin users.
 */
export const adminMenu: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'Pulpit',
    icon: MdSpaceDashboard,
    href: '/admin-panel',
  },
  {
    key: 'planning',
    name: 'Planer',
    icon: MdAssignment,
    href: '/admin-panel/planning',
  },
  {
    key: 'orders',
    name: 'Zlecenia',
    icon: MdOutlineListAlt,
    href: '/admin-panel/orders',
  },
  {
    key: 'warehouse',
    name: 'Magazyn',
    icon: MdWarehouse,
    href: '/admin-panel/warehouse',
  },
  {
    key: 'billing',
    name: 'Rozliczenia',
    icon: MdReceiptLong,
    href: '/admin-panel/billing',
  },
  {
    key: 'employees',
    name: 'Pracownicy',
    icon: MdPeopleAlt,
    href: '/admin-panel/employees',
  },
]

/**
 * Menu items for technician users.
 */
export const technicianMenu: MenuItem[] = [
  { key: 'dashboard', name: 'Pulpit', icon: MdSpaceDashboard, href: '/' },
  { key: 'planer', name: 'Planer', icon: MdAssignment, href: '/planer' },
  { key: 'orders', name: 'Zlecenia', icon: MdOutlineListAlt, href: '/orders' },
  { key: 'warehouse', name: 'Magazyn', icon: MdWarehouse, href: '/warehouse' },
  {
    key: 'billing',
    name: 'Rozliczenia',
    icon: MdReceiptLong,
    href: '/billing',
  },
]

/**
 * HR MENU ITEMS
 */
export const hrAdminMenu: MenuItem[] = [
  {
    key: 'employees',
    name: 'Pracownicy',
    icon: MdPeopleAlt,
    href: '/employees',
  },
  {
    key: 'settings',
    name: 'Ustawienia',
    icon: MdSettings,
    href: '/settings',
  },
]

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

export const materialUnitMap: Record<
  VectraMaterialUnit | OplMaterialUnit,
  string
> = {
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

export const orderTimelineColorMap: Record<VectraOrderStatus, string> = {
  COMPLETED: 'bg-success',
  NOT_COMPLETED: 'bg-danger',
  ASSIGNED: 'bg-warning',
  PENDING: 'bg-secondary',
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
