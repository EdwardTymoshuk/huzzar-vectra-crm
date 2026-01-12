import { mergeRouters } from '@/server/trpc'
import { authCoreuserRouter } from './auth'
import { queriesCoreRouter } from './queries'

export const userCoreRouter = mergeRouters(
  authCoreuserRouter,
  queriesCoreRouter
)
