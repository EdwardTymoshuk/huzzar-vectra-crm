// schema.ts
import { DeviceCategory, WarehouseItemType } from '@prisma/client'
import { z } from 'zod'

export const itemSchema = z.object({
  type: z.nativeEnum(WarehouseItemType),
  category: z.nativeEnum(DeviceCategory).optional(),
  name: z.string().min(2),
  serialNumber: z
    .string()
    .min(3)
    .max(50)
    .transform((val) => val.toUpperCase())
    .optional(),
  quantity: z.coerce.number().min(1).default(1),
})
