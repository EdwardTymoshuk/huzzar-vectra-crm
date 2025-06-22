// schema.ts
import {
  DeviceCategory,
  OrderStatus,
  OrderType,
  TimeSlot,
} from '@prisma/client'
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

export const warehouseFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DEVICE'),
    category: z.nativeEnum(DeviceCategory),
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
export const operatorSchema = z.object({
  operator: z.string().min(2, 'Nazwa jest wymagana').max(50, 'Za długa nazwa'),
})

export const orderSchema = z.object({
  type: z.nativeEnum(OrderType, {
    required_error: 'Typ zlecenia jest wymagany',
  }),
  operator: z.string({
    required_error: 'Operator jest wymagany',
  }),
  orderNumber: z
    .string({
      required_error: 'Numer zlecenia jest wymagany',
    })
    .min(3, 'Numer zlecenia musi mieć co najmniej 3 znaki'),
  date: z
    .string({
      required_error: 'Data jest wymagana',
    })
    .min(1, 'Data nie może być pusta'),
  timeSlot: z.nativeEnum(TimeSlot, {
    required_error: 'Przedział czasowy jest wymagany',
  }),
  contractRequired: z.boolean({
    required_error: 'Pole wymagane (Tak/Nie)',
  }),
  city: z
    .string({
      required_error: 'Miasto jest wymagane',
    })
    .min(2, 'Miasto musi mieć co najmniej 2 znaki'),
  street: z
    .string({
      required_error: 'Ulica jest wymagana',
    })
    .min(3, 'Ulica musi mieć co najmniej 3 znaki'),
  postalCode: z
    .string({
      required_error: 'Kod pocztowy jest wymagany',
    })
    .min(5, 'Kod pocztowy musi mieć co najmniej 5 znaków'),

  // Optional
  county: z.string().optional(),
  municipality: z.string().optional(),
  assignedToId: z.string().optional(),
  clientPhoneNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^(\+48)?\d{9}$/.test(val),
      'Nieprawidłowy numer telefonu'
    ),
  notes: z.string().optional(),

  /**
   * equipmentNeeded is a simple string in the form,
   * e.g. "router, kabel". We turn it into an array in onSubmit.
   */
  equipmentNeeded: z.string().optional(),

  status: z.nativeEnum(OrderStatus),
})
