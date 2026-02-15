'use client'

import {
  DigInput,
  OplEquipmentDraft,
  OplEquipmentDraftItem,
  OplSuggestedEquipmentVM,
  WorkCodePayload,
} from '@/types/opl-crm/orders'
import { OplOrderStatus } from '@prisma/client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

export type CompleteOplOrderState = {
  step: number

  status: OplOrderStatus | null
  failureReason: string
  notes: string
  addressNoteEnabled: boolean
  addressNoteText: string
  addressNoteScope: string

  workCodes: WorkCodePayload[]
  digInput: DigInput | null
  usedMaterials: { id: string; quantity: number }[]

  equipment: OplEquipmentDraft
}

type CompleteOplOrderContextValue = {
  state: CompleteOplOrderState

  /* step */
  setStep: (step: number) => void
  next: (maxSteps: number) => void
  back: () => void

  /* status */
  setStatus: (v: OplOrderStatus) => void
  setFailureReason: (v: string) => void
  setNotes: (v: string) => void
  setAddressNoteEnabled: (v: boolean) => void
  setAddressNoteText: (v: string) => void
  setAddressNoteScope: (v: string) => void

  /* work codes */
  setWorkCodes: (v: WorkCodePayload[]) => void
  setDigInput: (v: DigInput | null) => void
  addWorkCode: (code: string, quantity?: number) => void
  removeWorkCode: (code: string) => void
  resetWorkCodes: () => void
  clearPkiCodes: () => void
  setUsedMaterials: (v: { id: string; quantity: number }[]) => void

  /* equipment - issued */
  setIssuedEnabled: (v: boolean) => void
  setIssuedSkip: (v: boolean) => void
  addIssuedItem: (item?: Partial<OplEquipmentDraftItem>) => void
  updateIssuedItem: (
    clientId: string,
    patch: Partial<OplEquipmentDraftItem>
  ) => void
  removeIssuedItem: (clientId: string) => void
  resetIssued: () => void

  /* equipment - collected */
  setCollectedEnabled: (v: boolean) => void
  addCollectedItem: (item?: Partial<OplEquipmentDraftItem>) => void
  updateCollectedItem: (
    clientId: string,
    patch: Partial<OplEquipmentDraftItem>
  ) => void
  removeCollectedItem: (clientId: string) => void
  resetCollected: () => void

  /**
   * Seeds issued items based on suggested equipment requirements.
   * Should be called by the step component when it detects suggestions and draft is empty.
   */
  seedIssuedFromSuggestions: (suggested: OplSuggestedEquipmentVM[]) => void

  reset: () => void
}

/* ------------------------------------------------------------------ */
/* INITIAL STATE                                                      */
/* ------------------------------------------------------------------ */

const initialState: CompleteOplOrderState = {
  step: 0,
  status: null,
  failureReason: '',
  notes: '',
  addressNoteEnabled: false,
  addressNoteText: '',
  addressNoteScope: '',
  workCodes: [],
  digInput: null,
  usedMaterials: [],
  equipment: {
    issued: { enabled: false, skip: false, items: [] },
    collected: { enabled: false, skip: false, items: [] },
  },
}

/* ------------------------------------------------------------------ */
/* CONTEXT                                                            */
/* ------------------------------------------------------------------ */

const CompleteOplOrderContext =
  createContext<CompleteOplOrderContextValue | null>(null)

/* ------------------------------------------------------------------ */
/* PROVIDER                                                           */
/* ------------------------------------------------------------------ */

interface ProviderProps {
  orderId: string
  children: ReactNode
}

export const CompleteOplOrderProvider = ({
  orderId,
  children,
}: ProviderProps) => {
  const [state, setState] = useState<CompleteOplOrderState>(initialState)

  /* -------- RESET ON ORDER CHANGE -------- */
  useEffect(() => {
    setState(initialState)
  }, [orderId])

  /* -------- STEP -------- */

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const next = useCallback((maxSteps: number) => {
    setState((prev) => ({
      ...prev,
      step: Math.min(prev.step + 1, maxSteps - 1),
    }))
  }, [])

  const back = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(prev.step - 1, 0),
    }))
  }, [])

  /* -------- STATUS -------- */

  const setStatus = useCallback((v: OplOrderStatus) => {
    setState((prev) => ({ ...prev, status: v }))
  }, [])

  const setFailureReason = useCallback((v: string) => {
    setState((prev) => ({ ...prev, failureReason: v }))
  }, [])

  const setNotes = useCallback((v: string) => {
    setState((prev) => ({ ...prev, notes: v }))
  }, [])
  const setAddressNoteEnabled = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, addressNoteEnabled: v }))
  }, [])
  const setAddressNoteText = useCallback((v: string) => {
    setState((prev) => ({ ...prev, addressNoteText: v }))
  }, [])
  const setAddressNoteScope = useCallback((v: string) => {
    setState((prev) => ({ ...prev, addressNoteScope: v }))
  }, [])

  /* -------- WORK CODES -------- */

  const setWorkCodes = useCallback((v: WorkCodePayload[]) => {
    setState((prev) => ({ ...prev, workCodes: v }))
  }, [])

  const addWorkCode = useCallback((code: string, quantity = 1) => {
    setState((prev) => {
      const existing = prev.workCodes.find((v) => v.code === code)

      if (existing?.quantity === quantity) {
        return prev
      }

      if (existing) {
        return {
          ...prev,
          workCodes: prev.workCodes.map((v) =>
            v.code === code ? { ...v, quantity } : v
          ),
        }
      }

      return {
        ...prev,
        workCodes: [...prev.workCodes, { code, quantity }],
      }
    })
  }, [])

  const removeWorkCode = useCallback((code: string) => {
    setState((prev) => ({
      ...prev,
      workCodes: prev.workCodes.filter((v) => v.code !== code),
    }))
  }, [])

  const resetWorkCodes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      workCodes: [],
      digInput: null,
    }))
  }, [])

  const setDigInput = useCallback((v: DigInput | null) => {
    setState((prev) => ({ ...prev, digInput: v }))
  }, [])

  const clearPkiCodes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      workCodes: prev.workCodes.filter((v) => !v.code.startsWith('PKI')),
    }))
  }, [])

  const setUsedMaterials = useCallback((v: { id: string; quantity: number }[]) => {
    setState((prev) => ({ ...prev, usedMaterials: v }))
  }, [])

  /* -------- EQUIPMENTS -------- */
  /**
   * Creates a stable client-side id for list row drafts.
   * Uses crypto.randomUUID when available, falls back to a simple timestamp-based id.
   */
  const createClientId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  /* -------- EQUIPMENT: ISSUED -------- */

  const setIssuedEnabled = useCallback((v: boolean) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        issued: {
          ...prev.equipment.issued,
          enabled: v,
          // If user disables issuance, we keep items to preserve user input on accidental toggles.
        },
      },
    }))
  }, [])

  const setIssuedSkip = useCallback((v: boolean) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        issued: {
          ...prev.equipment.issued,
          skip: v,
        },
      },
    }))
  }, [])

  const addIssuedItem = useCallback((item?: Partial<OplEquipmentDraftItem>) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        issued: {
          ...prev.equipment.issued,
          items: [
            ...prev.equipment.issued.items,
            {
              clientId: createClientId(),
              deviceDefinitionId: null,
              warehouseId: null,
              name: '',
              category: 'OTHER',
              serial: '',
              ...item,
            },
          ],
        },
      },
    }))
  }, [])

  const updateIssuedItem = useCallback(
    (clientId: string, patch: Partial<OplEquipmentDraftItem>) => {
      setState((prev) => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          issued: {
            ...prev.equipment.issued,
            items: prev.equipment.issued.items.map((it) =>
              it.clientId === clientId ? { ...it, ...patch } : it
            ),
          },
        },
      }))
    },
    []
  )

  const removeIssuedItem = useCallback((clientId: string) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        issued: {
          ...prev.equipment.issued,
          items: prev.equipment.issued.items.filter(
            (it) => it.clientId !== clientId
          ),
        },
      },
    }))
  }, [])

  const resetIssued = useCallback(() => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        issued: { enabled: false, skip: false, items: [] },
      },
    }))
  }, [])

  const seedIssuedFromSuggestions = useCallback(
    (suggested: OplSuggestedEquipmentVM[]) => {
      setState((prev) => {
        // Do not override user edits.
        if (prev.equipment.issued.items.length > 0) return prev

        const items: OplEquipmentDraftItem[] = suggested.flatMap((s) => {
          const qty = Math.max(1, s.quantity)
          return Array.from({ length: qty }).map(() => ({
            clientId: createClientId(),
                deviceDefinitionId: s.deviceDefinitionId,
                warehouseId: null,
                name: s.name,
                category: s.category,
                serial: '',
          }))
        })

        return {
          ...prev,
          equipment: {
            ...prev.equipment,
            issued: {
              ...prev.equipment.issued,
              enabled: true,
              // When suggestions exist we show the form by default,
              // but allow skipping via checkbox.
              skip: false,
              items,
            },
          },
        }
      })
    },
    []
  )

  /* -------- EQUIPMENT: COLLECTED -------- */

  const setCollectedEnabled = useCallback((v: boolean) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        collected: {
          ...prev.equipment.collected,
          enabled: v,
        },
      },
    }))
  }, [])

  const addCollectedItem = useCallback(
    (item?: Partial<OplEquipmentDraftItem>) => {
      setState((prev) => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          collected: {
            ...prev.equipment.collected,
            items: [
              ...prev.equipment.collected.items,
              {
                clientId: createClientId(),
                deviceDefinitionId: null,
                warehouseId: null,
                name: '',
                category: 'OTHER',
                serial: '',
                ...item,
              },
            ],
          },
        },
      }))
    },
    []
  )

  const updateCollectedItem = useCallback(
    (clientId: string, patch: Partial<OplEquipmentDraftItem>) => {
      setState((prev) => ({
        ...prev,
        equipment: {
          ...prev.equipment,
          collected: {
            ...prev.equipment.collected,
            items: prev.equipment.collected.items.map((it) =>
              it.clientId === clientId ? { ...it, ...patch } : it
            ),
          },
        },
      }))
    },
    []
  )

  const removeCollectedItem = useCallback((clientId: string) => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        collected: {
          ...prev.equipment.collected,
          items: prev.equipment.collected.items.filter(
            (it) => it.clientId !== clientId
          ),
        },
      },
    }))
  }, [])

  const resetCollected = useCallback(() => {
    setState((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        collected: { enabled: false, skip: false, items: [] },
      },
    }))
  }, [])

  /* -------- RESET -------- */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  /* -------- VALUE -------- */
  const value = useMemo<CompleteOplOrderContextValue>(
    () => ({
      state,

      /* step */
      setStep,
      next,
      back,

      /* status */
      setStatus,
      setFailureReason,
      setNotes,
      setAddressNoteEnabled,
      setAddressNoteText,
      setAddressNoteScope,

      /* work codes */
      setWorkCodes,
      addWorkCode,
      removeWorkCode,
      resetWorkCodes,
      digInput: state.digInput,
      setDigInput,
      clearPkiCodes,
      setUsedMaterials,

      /* equipment - issued */
      setIssuedEnabled,
      setIssuedSkip,
      addIssuedItem,
      updateIssuedItem,
      removeIssuedItem,
      resetIssued,
      seedIssuedFromSuggestions,

      /* equipment - collected */
      setCollectedEnabled,
      addCollectedItem,
      updateCollectedItem,
      removeCollectedItem,
      resetCollected,

      /* lifecycle */
      reset,
    }),
    [
      state,
      setStep,
      next,
      back,
      setStatus,
      setFailureReason,
      setNotes,
      setAddressNoteEnabled,
      setAddressNoteText,
      setAddressNoteScope,
      setWorkCodes,
      setDigInput,
      setUsedMaterials,
      setIssuedEnabled,
      setIssuedSkip,
      addIssuedItem,
      updateIssuedItem,
      removeIssuedItem,
      resetIssued,
      seedIssuedFromSuggestions,
      setCollectedEnabled,
      addCollectedItem,
      updateCollectedItem,
      removeCollectedItem,
      resetCollected,
      reset,
    ]
  )

  return (
    <CompleteOplOrderContext.Provider value={value}>
      {children}
    </CompleteOplOrderContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* HOOK                                                               */
/* ------------------------------------------------------------------ */

export const useCompleteOplOrder = (): CompleteOplOrderContextValue => {
  const ctx = useContext(CompleteOplOrderContext)

  if (!ctx) {
    throw new Error(
      'useCompleteOplOrder must be used within CompleteOplOrderProvider'
    )
  }

  return ctx
}
