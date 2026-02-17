// schema.ts
import {
  OplDeviceCategory,
  OplNetworkOeprator,
  OplOrderStandard,
  OplOrderStatus,
  OplOrderType,
  OplTimeSlot,
} from '@prisma/client'
import { z } from 'zod'

/**
 * Converts empty string inputs into `undefined` so optional Zod fields behave correctly with RHF.
 */
const optionalInputString = (schema: z.ZodTypeAny) =>
  z.preprocess((val) => {
    if (typeof val !== 'string') return val
    const trimmed = val.trim()
    return trimmed.length === 0 ? undefined : trimmed
  }, schema)

/* --------------------------------------------------------------------------
 * Device creation schema
 * -------------------------------------------------------------------------- */

export const deviceSchema = z
  .object({
    category: z.nativeEnum(OplDeviceCategory),
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
    category: z.nativeEnum(OplDeviceCategory),
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
  type: z.nativeEnum(OplOrderType),
  operator: optionalInputString(z.string().max(50).optional()),

  serviceId: optionalInputString(
    z.string().length(12, 'Id usługi musi mieć dokładnie 12 znaków').optional()
  ),

  network: z.nativeEnum(OplNetworkOeprator).default('ORANGE'),
  orderNumber: z.string().min(3, 'Numer zlecenia jest wymagany'),
  date: z.string().min(1, 'Data jest wymagana'),

  clientPhoneNumber: optionalInputString(
    z
      .string()
      .min(7, 'Numer telefonu musi mieć min. 7 znaków')
      .max(20, 'Numer telefonu jest za długi')
      .refine((val) => /^(\+48)?\d{9}$/.test(val), {
        message: 'Nieprawidłowy numer telefonu',
      })
      .optional()
  ),

  timeSlot: z.nativeEnum(OplTimeSlot),
  city: z.string().min(2, 'Miasto jest wymagane'),
  street: z.string().min(3, 'Adres jest wymagany'),

  postalCode: optionalInputString(
    z.string().max(6, 'Kod pocztowy jest za długi').optional()
  ),

  assignedTechnicianIds: z
    .array(z.string())
    .min(1, 'Wybierz przynajmniej jednego technika')
    .max(2, 'Można przypisać maksymalnie dwóch techników'),

  standard: z.nativeEnum(OplOrderStandard).optional(),
  notes: optionalInputString(z.string().optional()),
  contractRequired: z.boolean().optional(),

  equipmentRequirements: z
    .array(
      z.object({
        deviceDefinitionId: z.string(),
        quantity: z.coerce.number().min(1),
      })
    )
    .optional(),

  status: z.nativeEnum(OplOrderStatus),
})
export const technicianOrderSchema = orderSchema.omit({
  postalCode: true,
  assignedTechnicianIds: true,
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
  category: z.nativeEnum(OplDeviceCategory),
  serialNumber: z.string().optional(),
})

export const extraDeviceSchema = z.object({
  id: z.string(),
  source: z.enum(['WAREHOUSE', 'CLIENT']),
  category: z.nativeEnum(OplDeviceCategory),
  name: z.string().optional(),
  serialNumber: z.string().optional(),
})

export const baseCompletionInput = {
  orderId: z.string(),
  status: z.nativeEnum(OplOrderStatus),
  notes: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  workCodes: z.array(workCodeSchema).optional(),
  equipmentIds: z.array(z.string()).optional(),
  usedMaterials: z.array(usedMaterialSchema).optional(),
  collectedDevices: z.array(collectedDeviceSchema).optional(),
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
