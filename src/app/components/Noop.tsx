'use client'

import { AppRouter } from '@/server/routers'
import { httpBatchLink } from '@trpc/client'
import { withTRPC } from '@trpc/next'
import React, { ReactNode } from 'react'
import superjson from 'superjson'

interface NoopProps {
  children?: ReactNode
}

function Noop({ children }: NoopProps) {
  return <>{children}</>
}
const WithTrpc = withTRPC<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    }
  },
  ssr: false,
})(Noop)

export default WithTrpc as React.FC<NoopProps>
