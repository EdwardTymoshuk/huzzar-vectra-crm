import { PrimaryAddonCode } from '@/types/opl-crm'
import {
  OplActivationType,
  OplBaseWorkCode,
  OplOrderStandard,
} from '@prisma/client'
import { useMemo, useState } from 'react'
import {
  ALL_ADDON_CODES,
  getPrimaryActivationCodes,
  getPrimaryAddonCodes,
  getPrimaryBaseCodes,
} from '../order/completeOrderHelper'

export type DigInput =
  | { type: 'ZJD'; meters: number }
  | { type: 'ZJK'; meters: number }
  | { type: 'ZJN'; points: number }

export type OplWorkCodesState = {
  base: OplBaseWorkCode | null
  activation: OplActivationType | null

  mrCount: number
  umz: boolean

  addons: PrimaryAddonCode[]
  digInput: DigInput | null
}

/**
 * Manages OPL work codes selection state.
 * Contains only business logic – no UI side effects.
 */
export const useOplWorkCodes = (standard?: OplOrderStandard) => {
  /* -------------------- STATE -------------------- */
  const [state, setState] = useState<OplWorkCodesState>({
    base: null,
    activation: null,
    mrCount: 0,
    umz: false,
    addons: [],
    digInput: null,
  })

  /* -------------------- UI FLAGS -------------------- */
  const [showAllBase, setShowAllBase] = useState(false)
  const [showAllActivation, setShowAllActivation] = useState(false)
  const [showAllAddons, setShowAllAddons] = useState(false)

  /**
   * Indicates service-only order (no installation base, only services like DTV / DMR).
   */
  const serviceOnly = useMemo(() => {
    return state.base === null
  }, [state.base])

  /* -------------------- PRIMARY CODES -------------------- */
  const basePrimary = useMemo(() => getPrimaryBaseCodes(standard), [standard])

  const activationPrimary = useMemo(
    () => getPrimaryActivationCodes(state.base),
    [state.base]
  )

  const addonsPrimary = useMemo(
    () =>
      getPrimaryAddonCodes(
        state.base,
        state.activation,
        ALL_ADDON_CODES,
        serviceOnly
      ),
    [state.base, state.activation, serviceOnly]
  )

  /* -------------------- ACTIONS -------------------- */

  /**
   * Sets base work code and resets dependent selections.
   */
  const setBase = (base: OplBaseWorkCode) => {
    setState({
      base,
      activation: null,
      mrCount: 0,
      umz: false,
      addons: [],
      digInput: null,
    })
  }

  /**
   * Sets activation type.
   * Resets MR count if activation is not 3P.
   */
  const setActivation = (activation: OplActivationType | null) => {
    setState((s) => ({
      ...s,
      activation,
      mrCount: activation === 'I_3P' ? s.mrCount : 0,
    }))
  }

  /**
   * Increments MR counter (max 3).
   */
  const incMr = () => {
    setState((s) => {
      const next = s.mrCount + 1

      return {
        ...s,
        mrCount: next > 3 ? 0 : next,
      }
    })
  }
  /**
   * Toggles UMZ addon.
   */
  const toggleUmz = () => {
    setState((s) => ({
      ...s,
      umz: !s.umz,
    }))
  }

  /**
   * Sets DIG input (meters or points).
   */
  const setDigInput = (input: DigInput) => {
    setState((s) => ({
      ...s,
      digInput: input,
    }))
  }

  /**
   * Toggles manual addon code (DMR, DTV, KUK, etc.).
   */
  const toggleAddon = (code: PrimaryAddonCode) => {
    setState((s) => ({
      ...s,
      addons: s.addons.includes(code)
        ? s.addons.filter((c) => c !== code)
        : [...s.addons, code],
    }))
  }

  /**
   * Resets entire work codes state.
   */
  const resetAll = () => {
    setState({
      base: null,
      activation: null,
      mrCount: 0,
      umz: false,
      addons: [],
      digInput: null,
    })
  }

  /* -------------------- API -------------------- */
  return {
    state,

    basePrimary,
    activationPrimary,
    addonsPrimary,

    showAllBase,
    setShowAllBase,
    showAllActivation,
    setShowAllActivation,
    showAllAddons,
    setShowAllAddons,

    setBase,
    setActivation,
    incMr,
    toggleUmz,
    toggleAddon,
    setDigInput,
    resetAll,
  }
}
