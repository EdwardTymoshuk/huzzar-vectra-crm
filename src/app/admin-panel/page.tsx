// src/app/admin-panel/page.tsx

'use client'

import MaxWidthWrapper from '../components/MaxWidthWrapper'

const HomePage = () => {
  return (
    <div className="flex-1 flex flex-col">
      <MaxWidthWrapper>
        <h1 className="text-xl font-bold">Admin panel dashboard</h1>
      </MaxWidthWrapper>
    </div>
  )
}

export default HomePage
