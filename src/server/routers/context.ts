import { authOptions } from '@/lib/authOptions'
import { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { getServerSession } from 'next-auth'

export async function createContext(opts: CreateNextContextOptions) {
  const { req, res } = opts
  const session = await getServerSession(req, res, authOptions)

  return {
    user: session?.user ?? null,
  }
}
