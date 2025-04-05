import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { Warehouse } from '@prisma/client'
import ItemAccordionList from './ItemAccordion'

type Props = {
  items: Warehouse[]
}

const ItemTabs = ({ items }: Props) => {
  const warehouseItems = items.filter(
    (i) => i.assignedToId === null && i.assignedOrderId === null
  )
  const technicianItems = items.filter(
    (i) => i.assignedToId !== null && i.assignedOrderId === null
  )
  const assignedToOrders = items.filter((i) => i.assignedOrderId !== null)

  return (
    <Tabs defaultValue="warehouse" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="warehouse">Magazyn</TabsTrigger>
        <TabsTrigger value="technicians">Technicy</TabsTrigger>
        <TabsTrigger value="orders">Wydane</TabsTrigger>
      </TabsList>

      <TabsContent value="warehouse">
        <ItemAccordionList items={warehouseItems} />
      </TabsContent>
      <TabsContent value="technicians">
        <ItemAccordionList items={technicianItems} />
      </TabsContent>
      <TabsContent value="orders">
        <ItemAccordionList items={assignedToOrders} mode="orders" />
      </TabsContent>
    </Tabs>
  )
}

export default ItemTabs
