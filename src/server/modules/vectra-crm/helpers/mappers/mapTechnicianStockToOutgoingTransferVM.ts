import { TechnicianStockItem } from '@/types/vectra-crm'
import { VectraMaterialUnit } from '@prisma/client'
import { TechnicianTransferRowVM } from './TechnicianTransferRowVM'

export const mapTechnicianStockToOutgoingTransferVM = (
  item: TechnicianStockItem
): TechnicianTransferRowVM => ({
  id: item.id,
  name: item.name,
  itemType: item.itemType,
  serialNumber: item.serialNumber,
  quantity: item.itemType === 'MATERIAL' ? item.quantity : 1,
  unit: item.itemType === 'MATERIAL' ? item.unit : VectraMaterialUnit.PIECE,
  category: item.itemType === 'DEVICE' ? item.category : null,
  transferPending: item.transferPending,
  transferToId: null,
  transferTo: null,
  assignedTo: null,
  incoming: false,
})
