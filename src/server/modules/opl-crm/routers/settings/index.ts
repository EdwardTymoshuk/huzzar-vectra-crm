// server/routers/settings/index.ts

import { mergeRouters } from '@/server/trpc'
import { deviceDefinitionRouter } from './deviceDefinitionRouter'
import { materialDefinitionRouter } from './materialDefinitionRouter'
import { operatorDefinitionRouter } from './operatorDefinitionRouter'
import { rateDefinitionRouter } from './rateDefinition'

export const settingsRouter = mergeRouters(
  deviceDefinitionRouter,
  materialDefinitionRouter,
  operatorDefinitionRouter,
  rateDefinitionRouter
)
