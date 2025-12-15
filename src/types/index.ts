// src/types/index.ts (GLOBAL CORE TYPES)

import { PrismaClient, Role, UserStatus } from '@prisma/client'
import { ReactNode } from 'react'
import { IconType } from 'react-icons'

// -----------------------------
// GLOBAL CONTEXT
// -----------------------------
export interface Context {
  user?: {
    id: string
    name: string
    email: string
    phoneNumber: string
    identyficator: number | null
    role: Role
    status: UserStatus
    locations: { id: string; name: string }[]
  } | null
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
export type DbTx =
  | PrismaClient
  | import('@prisma/client').Prisma.TransactionClient
