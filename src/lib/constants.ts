/**
 * Global status → polish label.
 */
export const statusMap = {
  PENDING: 'NIE PRZYPISANE',
  ASSIGNED: 'PRZYPISANE',
  COMPLETED: 'WYKONANE',
  NOT_COMPLETED: 'NIEWYKONANE',
}

export const statusColorMap = {
  PENDING: 'bg-primary hover:bg-primary/80 text-white text-center',
  ASSIGNED: 'bg-warning hover:bg-warning/80 text-white text-center',
  COMPLETED: 'bg-success hover:bg-success/80 text-white text-center',
  NOT_COMPLETED: 'bg-danger hover:bg-danger/80 text-white text-center',
}

export const userRoleMap = {
  TECHNICIAN: 'TECHNIK',
  ADMIN: 'ADMINISTRATOR',
  COORDINATOR: 'KOORDYNATOR',
  WAREHOUSEMAN: 'MAGAZYNIER',
}

export const userStatusNameMap = {
  ACTIVE: 'AKTYWNY',
  INACTIVE: 'NIEAKTYWNY',
  SUSPENDED: 'ZABLOKOWANY',
}

export const userStatusColorMap = {
  ACTIVE: 'bg-success hover:bg-success text-white text-center',
  INACTIVE: 'bg-danger hover:bg-danger text-white text-center',
  SUSPENDED: 'bg-warning hover:bg-warning text-white text-center',
}

export const devicesStatusMap = {
  AVAILABLE: 'DOSTĘPNY NA MAGAZYNIE',
  ASSIGNED: 'PRZYPISANY DO TECHNIKA',
  RETURNED: 'ZWRÓCONY OD TECHNIKA',
  RETURNED_TO_OPERATOR: 'ZWRÓCONY DO OPERATORA',
  ASSIGNED_TO_ORDER: 'WYDANY NA ZLECENIU',
  COLLECTED_FROM_CLIENT: 'ODEBRANY OD KLIENTA',
}

export const materialUnitMap = {
  PIECE: 'szt',
  METER: 'mb',
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
