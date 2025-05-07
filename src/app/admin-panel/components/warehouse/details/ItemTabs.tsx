import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { Warehouse } from '@prisma/client'
import ItemAccordionList from './ItemAccordion'
import MaterialHistoryByTabs from './MaterialHistoryByTabs'

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
        {warehouseItems[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs
            name={warehouseItems[0].name}
            type="warehouse"
          />
        ) : (
          <ItemAccordionList items={warehouseItems} />
        )}
      </TabsContent>

      <TabsContent value="technicians">
        {warehouseItems[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs
            name={warehouseItems[0].name}
            type="technicians"
          />
        ) : (
          <ItemAccordionList items={technicianItems} />
        )}
      </TabsContent>

      <TabsContent value="orders">
        {warehouseItems[0]?.itemType === 'MATERIAL' ? (
          <MaterialHistoryByTabs name={warehouseItems[0].name} type="orders" />
        ) : (
          <ItemAccordionList items={assignedToOrders} mode="orders" />
        )}
      </TabsContent>
    </Tabs>
  )
}

export default ItemTabs
