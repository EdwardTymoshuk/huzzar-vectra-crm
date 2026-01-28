import { EmployeeVM } from '@/types'
import { NormalizedUser } from '../users/normalizeUser'

export const mapTechnicianToEmployeeVM = (
  user: NormalizedUser
): EmployeeVM => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  status: user.status,
  identyficator: user.identyficator,
  locations: user.locations,
})
