//src/types/next-auth.d.ts

import { Role, UserStatus } from '@prisma/client'
import 'next-auth'

type SessionModule = {
  code: string
  name: string
}

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
      modules: SessionModule[]
      locations?: UserLocation[]
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
    modules: SessionModule[]
    locations?: UserLocation[]
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
    modules: SessionModule[]
    locations?: UserLocation[]
  }
}
