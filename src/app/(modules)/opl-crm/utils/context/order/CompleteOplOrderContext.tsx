'use client'

import { DigInput, WorkCodePayload } from '@/types/opl-crm/orders'
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

  workCodes: WorkCodePayload[]

  digInput: DigInput | null
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

  /* work codes */
  setWorkCodes: (v: WorkCodePayload[]) => void

  /** DIG input provided by user (meters / points) */
  digInput: DigInput | null
  setDigInput: (v: DigInput | null) => void

  addWorkCode: (code: string, quantity?: number) => void
  removeWorkCode: (code: string) => void
  resetWorkCodes: () => void

  clearPkiCodes: () => void

  /* lifecycle */
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
  workCodes: [],
  digInput: null,
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

  /* -------- RESET -------- */

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  /* -------- VALUE -------- */

  const value = useMemo<CompleteOplOrderContextValue>(
    () => ({
      state,

      setStep,
      next,
      back,

      setStatus,
      setFailureReason,
      setNotes,

      setWorkCodes,
      addWorkCode,
      removeWorkCode,
      resetWorkCodes,
      digInput: state.digInput,
      setDigInput,

      clearPkiCodes,

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
      setWorkCodes,
      setDigInput,
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
