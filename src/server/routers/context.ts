import { getAuthOptions } from '@/lib/authOptions'
import { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { getServerSession } from 'next-auth'

export async function createContext(opts: CreateNextContextOptions) {
  const authOptions = await getAuthOptions()
  const session = await getServerSession(authOptions)

  return {
    user: session?.user ?? null,
  }
}
