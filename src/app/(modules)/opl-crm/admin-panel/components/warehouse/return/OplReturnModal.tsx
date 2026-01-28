'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import ReturnFromTechnician from './OplReturnFromTechnician'
import ReturnToOperator from './OplReturnToOperator'

type Props = {
  open: boolean
  onCloseAction: () => void
}

/**
 * OplReturnModal component:
 * - Allows handling returns to warehouse from technicians or back to operator.
 * - Uses tabbed layout for two types of returns.
 */
const OplReturnModal = ({ open, onCloseAction }: Props) => {
  //   const [activeTab, setActiveTab] = useState('fromTechnician')

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-5xl space-y-4">
        <DialogHeader>
          <DialogTitle>Zwrot sprzętu</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fromTechnician">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="fromTechnician">Od technika</TabsTrigger>
            <TabsTrigger value="toOperator">Do operatora</TabsTrigger>
          </TabsList>

          <TabsContent value="fromTechnician">
            <ReturnFromTechnician onClose={onCloseAction} />
          </TabsContent>

          <TabsContent value="toOperator">
            <ReturnToOperator onClose={onCloseAction} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default OplReturnModal
