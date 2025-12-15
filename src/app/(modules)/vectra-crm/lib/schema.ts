// schema.ts
import {
  VectraDeviceCategory,
  VectraOrderStatus,
  VectraOrderType,
  VectraServiceType,
  VectraTimeSlot,
} from '@prisma/client'
import { z } from 'zod'

/* --------------------------------------------------------------------------
 * Device creation schema
 * -------------------------------------------------------------------------- */

export const deviceSchema = z
  .object({
    category: z.nativeEnum(VectraDeviceCategory),
    name: z.string().min(2),
    serialNumber: z
      .string()
      .min(3)
      .max(50)
      .transform((val) => val.toUpperCase())
      .optional(),
    quantity: z.coerce.number().min(1).default(1),
    warningAlert: z.coerce.number().min(1, 'Wymagany próg ostrzegawczy'),
    alarmAlert: z.coerce.number().min(1, 'Wymagany próg alarmowy'),
    price: z.coerce.number().min(0, 'Podaj cenę urządzenia').default(0),
  })
  .refine((data) => data.alarmAlert < data.warningAlert, {
    message: 'Alert krytyczny musi być mniejszy niż ostrzegawczy',
    path: ['alarmAlert'],
  })

/* --------------------------------------------------------------------------
 * Material creation schema
 * -------------------------------------------------------------------------- */

export const materialSchema = z
  .object({
    name: z.string().min(2, 'Nazwa jest wymagana'),
    index: z.string().min(1, 'Index jest wymagany'),
    unit: z.enum(['PIECE', 'METER']),
    warningAlert: z.coerce.number().min(1, 'Wymagany próg ostrzegawczy'),
    alarmAlert: z.coerce.number().min(1, 'Wymagany próg alarmowy'),
    price: z.coerce.number().min(0, 'Podaj cenę materiału').default(0),
  })
  .refine((data) => data.alarmAlert < data.warningAlert, {
    message: 'Alert krytyczny musi być mniejszy niż ostrzegawczy',
    path: ['alarmAlert'],
  })

/* --------------------------------------------------------------------------
 * Warehouse add item form (device or material)
 * -------------------------------------------------------------------------- */

export const warehouseFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DEVICE'),
    category: z.nativeEnum(VectraDeviceCategory),
    name: z.string().min(2),
    serialNumber: z
      .string()
      .min(3, 'Numer seryjny musi mieć min. 3 znaki')
      .transform((val) => val.toUpperCase()),
  }),
  z.object({
    type: z.literal('MATERIAL'),
    name: z.string().min(1, 'Wybierz materiał'),
    quantity: z.coerce.number().min(1, 'Ilość musi być większa niż 0'),
  }),
])

/* --------------------------------------------------------------------------
 * Operator schema
 * -------------------------------------------------------------------------- */

export const operatorSchema = z.object({
  operator: z.string().min(2, 'Nazwa jest wymagana').max(50, 'Za długa nazwa'),
})

/* --------------------------------------------------------------------------
 * Order creation schema
 * -------------------------------------------------------------------------- */

export const orderSchema = z.object({
  type: z.nativeEnum(VectraOrderType),
  operator: z.string(),
  clientId: z.string().min(3, 'ID klienta jest wymagane'),
  orderNumber: z.string().min(3, 'Numer zlecenia jest wymagany'),
  date: z.string().min(1, 'Data jest wymagana'),
  timeSlot: z.nativeEnum(VectraTimeSlot),
  city: z.string().min(2, 'Miasto jest wymagane'),
  street: z.string().min(3, 'Adres jest wymagany'),
  postalCode: z.string().max(6).optional().default(''),
  assignedToId: z.string(),
  notes: z.string().optional(),
  status: z.nativeEnum(VectraOrderStatus),
})

export const technicianOrderSchema = orderSchema.omit({
  postalCode: true,
  assignedToId: true,
})

export const workCodeSchema = z.object({
  code: z.string(),
  quantity: z.number().min(1),
})

export const usedMaterialSchema = z.object({
  id: z.string(),
  quantity: z.number().min(1),
})

export const collectedDeviceSchema = z.object({
  name: z.string(),
  category: z.nativeEnum(VectraDeviceCategory),
  serialNumber: z.string().optional(),
})

export const extraDeviceSchema = z.object({
  id: z.string(),
  source: z.enum(['WAREHOUSE', 'CLIENT']),
  category: z.nativeEnum(VectraDeviceCategory),
  name: z.string().optional(),
  serialNumber: z.string().optional(),
})

export const serviceSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(VectraServiceType),
  deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
  deviceName: z.string().optional(),
  deviceType: z.nativeEnum(VectraDeviceCategory).optional(),

  deviceId: z.string().optional(),
  serialNumber: z.string().optional(),
  deviceId2: z.string().optional(),
  deviceName2: z.string().optional(),
  serialNumber2: z.string().optional(),
  speedTest: z.string().optional(),
  usDbmDown: z.coerce.number().optional(),
  usDbmUp: z.coerce.number().optional(),
  notes: z.string().optional(),
  extraDevices: z.array(extraDeviceSchema).optional(),
})

export const servicesArraySchema = z.array(serviceSchema).default([])

export const baseCompletionInput = {
  orderId: z.string(),
  status: z.nativeEnum(VectraOrderStatus),
  notes: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  workCodes: z.array(workCodeSchema).optional(),
  equipmentIds: z.array(z.string()).optional(),
  usedMaterials: z.array(usedMaterialSchema).optional(),
  collectedDevices: z.array(collectedDeviceSchema).optional(),
  services: servicesArraySchema,
}

export const completeOrderSchema = z.object({
  ...baseCompletionInput,
  issuedDevices: z.array(z.string()).optional(),
})

export const amendCompletionSchema = z.object({
  ...baseCompletionInput,
})

export const adminEditCompletionSchema = z.object({
  ...baseCompletionInput,
})
