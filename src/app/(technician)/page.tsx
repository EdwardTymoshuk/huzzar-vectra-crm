'use client'

import MaxWidthWrapper from '../components/shared/MaxWidthWrapper'

const HomePage = () => {
  return (
    <div className="flex-1 flex flex-col">
      <MaxWidthWrapper>
        <h1 className="text-xl font-bold">Main Page</h1>
      </MaxWidthWrapper>
    </div>
  )
}

export default HomePage
