// src/types/index.ts

import { AppRouter } from '@/server/routers'
import { Prisma, PrismaClient, Role, UserStatus } from '@prisma/client'
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { ReactNode } from 'react'
import { IconType } from 'react-icons'

// -----------------------------
// CORE SESSION USER
// -----------------------------
export type CoreSessionUser = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    phoneNumber: true
    identyficator: true
    role: true
    status: true
    locations: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

// -----------------------------
// GLOBAL CONTEXT
// -----------------------------
export interface Context {
  user: CoreSessionUser | null
  prisma: PrismaClient
}

// -----------------------------
// GLOBAL USER TYPES
// -----------------------------
export type UserWithBasic = {
  id: string
  name: string
  email: string
  phoneNumber: string
  identyficator: number | null
  role: Role
  status: UserStatus
}

// -----------------------------
// GLOBAL UI / LAYOUT TYPES
// -----------------------------
export interface MenuItem {
  key: string
  name: string
  icon: IconType
  href: string
}

// Timeline
export type TimelineSize = 'sm' | 'md' | 'lg'
export type TimelineStatus = 'completed' | 'in-progress' | 'pending'

export interface TimelineElement {
  id: string | number
  date: string
  title: string | ReactNode
  description: string | ReactNode
  icon?: ReactNode | (() => ReactNode)
  status?: TimelineStatus
  color?: string
  size?: TimelineSize
  loading?: boolean
  error?: string
}

export interface TimelineProps {
  items: TimelineElement[]
  size?: TimelineSize
  animate?: boolean
  iconColor?: string
  connectorColor?: string
  className?: string
}

// -----------------------------
// DB HELPERS
// -----------------------------
export type DbTx = PrismaClient | Prisma.TransactionClient

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

// User settings types
export type UserModule = {
  code: string
  name: string
}

export type UserLocation = {
  id: string
  name: string
}

export type ModuleCode = 'VECTRA' | 'OPL' | 'HR' | 'FLEET' | 'TOOLS'

export type SettingsContext =
  | 'CORE'
  | 'VECTRA'
  | 'OPL'
  | 'HR'
  | 'FLEET'
  | 'TOOLS'
  | 'PROFILE'

export type SettingsSectionConfig = {
  key: SettingsContext
  label: string
  roles: Role[]
  module?: ModuleCode
}
