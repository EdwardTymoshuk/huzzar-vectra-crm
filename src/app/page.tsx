'use client'

import { trpc } from '@/utils/trpc'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function HomePage() {
  const { data: session } = useSession()
  const { data: user } = trpc.user.me.useQuery(undefined, {
    enabled: !!session,
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10">
      {session ? (
        <>
          <h1 className="text-2xl font-bold">
            Welcome, {user?.name || 'User'}!
          </h1>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>

          {user?.role === 'ADMIN' && <p>You have admin access!</p>}

          <button
            onClick={() => signOut()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Please log in</h1>
          <button
            onClick={() => signIn()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Sign In
          </button>
        </>
      )}
    </main>
  )
}
