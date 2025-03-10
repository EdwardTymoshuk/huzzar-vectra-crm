'use client'

import { Suspense } from 'react'
import MaxWidthWrapper from '../components/MaxWidthWrapper'

const HomePage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex-1 flex flex-col">
        <MaxWidthWrapper>
          <h1 className="text-xl font-bold">Main Page</h1>
        </MaxWidthWrapper>
      </div>
    </Suspense>
  )
}

export default HomePage
