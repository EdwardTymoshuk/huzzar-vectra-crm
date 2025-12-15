//src/types/next-authOptions.d.ts

import { Role, UserStatus } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      phoneNumber: string
      identyficator: number | null
      role: Role
      status: UserStatus
      modules: string[]
    }
  }

  interface User {
    id: string
    name: string
    email: string
    phoneNumber: string
    identyficator: number | null
    role: Role
    status: UserStatus
    modules: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    phoneNumber: string
    identyficator: number | null
    role: Role
    status: UserStatus
    modules: string[]
  }
}
