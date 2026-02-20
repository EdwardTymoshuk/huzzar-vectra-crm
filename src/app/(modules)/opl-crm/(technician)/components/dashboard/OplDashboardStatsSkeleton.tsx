import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'

export const OplDashboardStatsSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-4 h-auto">
      <div className="flex w-full lg:w-1/3 gap-4">
        <Card className="flex flex-col items-center justify-center w-full h-[260px] p-4">
          <Skeleton className="rounded-full w-32 h-32 mb-4" />
          <Skeleton className="h-6 w-24" />
        </Card>

        <div className="flex flex-col gap-4 w-40 h-[260px]">
          <Card className="p-4 text-center">
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </Card>
          <Card className="p-4 text-center">
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </Card>
          <Card className="p-4 text-center">
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </Card>
        </div>
      </div>

      <div className="w-full lg:w-2/3">
        <Card className="p-4 h-[260px]">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-auto w-full" />
        </Card>
      </div>
    </div>
  )
}

