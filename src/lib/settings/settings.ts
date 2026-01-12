// src/lib/settings.ts
import type { Role } from '@prisma/client'
import type React from 'react'

export type SettingsContext =
  | 'CORE'
  | 'VECTRA'
  | 'OPL'
  | 'HR'
  | 'FLEET'
  | 'TOOLS'

export type SettingsSectionConfig = {
  key: SettingsContext
  title: string
  Component: React.ComponentType<{ title: string }>
  roles?: Role[]
}
