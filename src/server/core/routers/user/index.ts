import { mergeRouters } from '@/server/trpc'
import { authCoreUserRouter } from './auth'
import { locationRouter } from './location'
import { queriesCoreRouter } from './queries'
import { settingsRouter } from './settings'

export const userCoreRouter = mergeRouters(
  authCoreUserRouter,
  queriesCoreRouter,
  settingsRouter,
  locationRouter
)
