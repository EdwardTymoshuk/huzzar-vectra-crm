'use client'

import { Button } from '@/app/components/ui/button'
import PageControlBar from '@/app/components/PageControlBar'
import { useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import OplOrderAccordionDetails from '../../components/orders/OplOrderAccordionDetails'

type Props = {
  params: Promise<{
    orderId: string
  }>
}

const OplAdminOrderDetailsPage = ({ params }: Props) => {
  const { orderId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push(from ? decodeURIComponent(from) : '/opl-crm/admin-panel/planning')
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <PageControlBar
        title="Szczegóły zlecenia"
        leftStart={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-1"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
            <span>Powrót</span>
          </Button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4">
        <div className="rounded-md border bg-background p-3 md:p-4">
          <OplOrderAccordionDetails order={{ id: orderId }} />
        </div>
      </div>
    </div>
  )
}

export default OplAdminOrderDetailsPage
