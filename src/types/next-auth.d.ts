import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      phoneNumber: string
      identyficator?: number | null
      role: 'USER' | 'TECHNICIAN' | 'COORDINATOR' | 'WAREHOUSEMAN' | 'ADMIN'
      status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    phoneNumber: string
    identyficator?: number | null
    role: 'USER' | 'TECHNICIAN' | 'COORDINATOR' | 'WAREHOUSEMAN' | 'ADMIN'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  }
}
