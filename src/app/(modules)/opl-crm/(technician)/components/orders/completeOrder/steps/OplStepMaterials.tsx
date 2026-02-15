'use client'

import OplMaterialsSection from '@/app/(modules)/opl-crm/(technician)/components/orders/completeOrder/OplMaterialsSection'
import { ALL_BASE_CODES } from '@/app/(modules)/opl-crm/utils/order/completeOrderHelper'
import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { Button } from '@/app/components/ui/button'
import { OplMaterialUnit } from '@prisma/client'
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md'

type Props = {
  onBack: () => void
  onNext: () => void
  materialDefs: {
    id: string
    name: string
    unit: OplMaterialUnit
  }[]
  techMaterials: {
    id: string
    name: string
    materialDefinitionId: string
    quantity: number
  }[]
}

const OplStepMaterials = ({
  onBack,
  onNext,
  materialDefs,
  techMaterials,
}: Props) => {
  const { state, setUsedMaterials } = useCompleteOplOrder()

  const baseCode = state.workCodes.find((w) =>
    ALL_BASE_CODES.includes(w.code as (typeof ALL_BASE_CODES)[number])
  )?.code

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold text-center">Zużyte materiały</h3>
        <p className="text-sm text-muted-foreground text-center">
          Wybierz z listy lub dodaj przez wyszukiwarkę.
        </p>

        <OplMaterialsSection
          selected={state.usedMaterials}
          onChange={setUsedMaterials}
          materialDefs={materialDefs}
          technicianStock={techMaterials}
          baseCode={baseCode}
        />
      </div>

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button className="flex-1 gap-1" onClick={onNext}>
          Dalej
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export default OplStepMaterials
