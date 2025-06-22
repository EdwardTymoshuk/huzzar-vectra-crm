// orders/index.ts
import { mergeRouters } from '@/server/trpc'
import { mutationsRouter } from './mutations'
import { queriesRouter } from './queries'
import { reportsRouter } from './reports'
import { transferRouter } from './transfer'

export const orderRouter = mergeRouters(
  queriesRouter,
  mutationsRouter,
  transferRouter,
  reportsRouter
)
