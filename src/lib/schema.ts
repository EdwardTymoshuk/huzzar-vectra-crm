// schema.ts
import { DeviceCategory } from '@prisma/client'
import { z } from 'zod'

export const deviceSchema = z
  .object({
    category: z.nativeEnum(DeviceCategory),
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
    price: z.coerce.number().min(0, 'Podaj cenę urządzenia').default(0),
  })
  .refine((data) => data.alarmAlert < data.warningAlert, {
    message: 'Alert krytyczny musi być mniejszy niż ostrzegawczy',
    path: ['alarmAlert'],
  })

export const materialSchema = z
  .object({
    name: z.string().min(2, 'Nazwa jest wymagana'),
    index: z.string().min(1, 'Index jest wymagany'),
    unit: z.enum(['PIECE', 'METER']),
    warningAlert: z.coerce.number().min(1, 'Wymagany próg ostrzegawczy'),
    alarmAlert: z.coerce.number().min(1, 'Wymagany próg alarmowy'),
    price: z.coerce.number().min(0, 'Podaj cenę materiału').default(0),
  })
  .refine((data) => data.alarmAlert < data.warningAlert, {
    message: 'Alert krytyczny musi być mniejszy niż ostrzegawczy',
    path: ['alarmAlert'],
  })
