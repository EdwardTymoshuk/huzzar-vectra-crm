import { Role, UserStatus } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      phoneNumber: string
      identyficator?: number | null
      role: Role
      status: UserStatus
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    phoneNumber: string
    identyficator?: number | null
    role: Role
    status: UserStatus
  }
}
