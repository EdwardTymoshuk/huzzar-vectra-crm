import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'

export const OplEarningsKpisSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4 flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
          {i === 4 && <Skeleton className="h-3 w-full" />}
        </Card>
      ))}
    </div>
  )
}

