'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import {
  formatMeasurementsLine,
  parseMeasurementsFromNotes,
} from '@/app/(modules)/opl-crm/utils/order/notesFormatting'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { OplOrderStandard, OplOrderType } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  orderId: string
  orderType: OplOrderType
  standard?: OplOrderStandard
  sourceNotes?: string | null
  onBack: () => void
  onNext: () => void
}

type RouteHints = {
  nodePath: string
  port: string
  okw: string
  fiberNo: string
}

type RouteMode = 'W1' | 'W2' | 'W3' | 'ZJD' | 'ZJN' | 'OTHER'

const parseImportedRouteHints = (raw: string): RouteHints => {
  const text = String(raw ?? '')
  if (!text.trim()) {
    return { nodePath: '', port: '', okw: '', fiberNo: '' }
  }

  const splitterMatch =
    text.match(/Spliter:\s*(SP-[A-Z0-9_/-]+)\s+Port:\s*(\d+)/i) ??
    text.match(/\b(SP-[A-Z0-9_/-]+)\s+Port:\s*(\d+)/i)

  const nodePath = splitterMatch?.[1]?.trim() ?? ''
  const port = splitterMatch?.[2]?.trim() ?? ''

  const okwMatch = text.match(/\b(OKW[^\s;]+)\b/i)
  const okw = okwMatch?.[1]?.trim() ?? ''

  const fiberMatch = text.match(/Fiber\s*\[(\d+)\]/i)
  const fiberNo = fiberMatch?.[1]?.trim() ?? ''

  return { nodePath, port, okw, fiberNo }
}

const buildRouteSuggestionFromImport = (
  standard: OplOrderStandard | undefined,
  hints: RouteHints
): string => {
  const { nodePath, port, okw, fiberNo } = hints
  if (!nodePath || !port) return ''

  const std = standard ?? null
  if (std === 'W1' || std === 'W2' || std === 'W3') {
    if (okw && fiberNo) return `${nodePath} port:${port}, ${okw} włókno ${fiberNo}`
    return `${nodePath} port:${port}, kabel 1j doprowadzono bezpośrednio od OPP do lokalu klienta`
  }

  if (std?.startsWith('ZJD')) {
    return `${nodePath} port:${port}, KABEL DAC 2j DOPROWADZONO OD ZOSTAWIONEGO ZAPASU PRZY POSESJI DO BUDYNKU KLIENTA`
  }

  if (std?.startsWith('ZJN')) {
    const sourceNode = nodePath.includes('/OSD') ? 'OSD' : 'OPP'
    return `${nodePath} port:${port}, kabel napowietrzny 2j, długość ___m, powieszony od istniejącego ${sourceNode} do budynku klienta`
  }

  return `${nodePath} port:${port}`
}

const detectRouteModeFromWorkCodes = (codes: { code: string }[]): RouteMode => {
  const upperCodes = codes.map((c) => c.code.toUpperCase())
  if (upperCodes.includes('ZJND') || upperCodes.includes('ZJN')) return 'ZJN'
  if (upperCodes.includes('ZJDD') || upperCodes.includes('ZJD')) return 'ZJD'
  if (upperCodes.includes('W3')) return 'W3'
  if (upperCodes.includes('W2')) return 'W2'
  if (upperCodes.includes('W1')) return 'W1'
  return 'OTHER'
}

const buildExtraPolesClause = (coords: string[]): string => {
  const normalized = coords.map((v) => v.trim()).filter(Boolean)
  if (!normalized.length) return ''
  if (normalized.length === 1) return `, (zajęto 1 dodatkowy słup ${normalized[0]})`
  const [first, ...rest] = normalized
  return `, (zajęto ${normalized.length} dodatkowe słupy ${first}${
    rest.length ? ` oraz ${rest.join(' oraz ')}` : ''
  })`
}

const OplStepNotes = ({
  orderId,
  orderType,
  standard,
  sourceNotes,
  onBack,
  onNext,
}: Props) => {
  const subtlePlaceholderInputClass =
    'placeholder:text-muted-foreground/60 placeholder:italic'
  const {
    state,
    setNotes,
    setMeasurementOpp,
    setMeasurementGo,
    setRouteCompliant,
    setRouteDescription,
    setAddressNoteEnabled,
    setAddressNoteText,
    setAddressNoteScope,
  } = useCompleteOplOrder()
  const utils = trpc.useUtils()
  const createAddressNote = trpc.opl.order.createAddressNote.useMutation()
  const [orderNoteDraft, setOrderNoteDraft] = useState(state.notes)
  const [addressNoteDraft, setAddressNoteDraft] = useState(
    state.addressNoteText,
  )
  const [measurementOppDraft, setMeasurementOppDraft] = useState(
    state.measurementOpp,
  )
  const [measurementGoDraft, setMeasurementGoDraft] = useState(
    state.measurementGo,
  )
  const [routeCompliantDraft, setRouteCompliantDraft] = useState(
    state.routeCompliant,
  )
  const [routeDescriptionDraft, setRouteDescriptionDraft] = useState(
    state.routeDescription,
  )
  const [routeNodePathDraft, setRouteNodePathDraft] = useState('')
  const [routePortDraft, setRoutePortDraft] = useState('')
  const [routeOkwDraft, setRouteOkwDraft] = useState('')
  const [routeFiberNoDraft, setRouteFiberNoDraft] = useState('')
  const [routeHasOkwDraft, setRouteHasOkwDraft] = useState(false)
  const [routeW3ViaOkwDraft, setRouteW3ViaOkwDraft] = useState(false)
  const [routeNoOkwDraft, setRouteNoOkwDraft] = useState(false)
  const [routeCableJDraft, setRouteCableJDraft] = useState('2')
  const [routeLengthDraft, setRouteLengthDraft] = useState('')
  const [routeExtraPolesCoordsDrafts, setRouteExtraPolesCoordsDrafts] = useState<string[]>([])
  const [routeSourceNodeTypeDraft, setRouteSourceNodeTypeDraft] = useState<'OPP' | 'OSD'>('OPP')
  const [addressScopeDraft, setAddressScopeDraft] = useState(
    state.addressNoteScope,
  )
  const routeAutoDefaultAppliedRef = useRef(false)
  const lastAutoRouteSuggestionRef = useRef('')
  const lastSavedAddressSignatureRef = useRef(
    `${state.addressNoteText.trim()}|${state.addressNoteScope.trim()}`,
  )
  const parsedSourceNotes = parseMeasurementsFromNotes(sourceNotes)
  const importedRouteRaw = parsedSourceNotes.importRoute
  const importedRouteHints = parseImportedRouteHints(importedRouteRaw)
  const importedRouteSuggestion = buildRouteSuggestionFromImport(
    standard,
    importedRouteHints
  )
  const routeMode = detectRouteModeFromWorkCodes(state.workCodes)
  const routeModeLabel = routeMode === 'OTHER' ? (standard ?? 'Inny') : routeMode
  const isZjndSelected = state.workCodes.some(
    (w) => w.code.toUpperCase() === 'ZJND'
  )
  const zjndExtraPolesCount = state.workCodes
    .filter((w) => w.code.toUpperCase() === 'ZJND')
    .reduce((sum, w) => sum + Math.max(0, Number((w as { quantity?: number }).quantity ?? 0)), 0)
  const routeDescriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    routeAutoDefaultAppliedRef.current = false
    setOrderNoteDraft(state.notes)
  }, [state.notes])

  useEffect(() => {
    setMeasurementOppDraft(state.measurementOpp)
    setMeasurementGoDraft(state.measurementGo)
  }, [state.measurementGo, state.measurementOpp])

  useEffect(() => {
    setRouteCompliantDraft(state.routeCompliant)
    setRouteDescriptionDraft(state.routeDescription)
  }, [state.routeCompliant, state.routeDescription])

  useEffect(() => {
    if (!importedRouteHints.nodePath && !importedRouteHints.port && !importedRouteHints.okw)
      return
    setRouteNodePathDraft((prev) => prev || importedRouteHints.nodePath)
    setRoutePortDraft((prev) => prev || importedRouteHints.port)
    setRouteOkwDraft((prev) => prev || importedRouteHints.okw)
    setRouteFiberNoDraft((prev) => prev || importedRouteHints.fiberNo)
    setRouteHasOkwDraft(Boolean(importedRouteHints.okw))
    setRouteW3ViaOkwDraft(Boolean(importedRouteHints.okw))
    if (importedRouteHints.nodePath.includes('/OSD')) setRouteSourceNodeTypeDraft('OSD')
    if (importedRouteHints.nodePath.includes('/OPP')) setRouteSourceNodeTypeDraft('OPP')
  }, [importedRouteHints])

  useEffect(() => {
    if (routeMode !== 'W2' && routeMode !== 'W3') {
      if (routeNoOkwDraft) setRouteNoOkwDraft(false)
      return
    }

    if (routeMode === 'W3' && !routeW3ViaOkwDraft && routeNoOkwDraft) {
      setRouteNoOkwDraft(false)
    }
  }, [routeMode, routeW3ViaOkwDraft, routeNoOkwDraft])

  useEffect(() => {
    if (!isZjndSelected || zjndExtraPolesCount <= 0) {
      if (routeExtraPolesCoordsDrafts.length) setRouteExtraPolesCoordsDrafts([])
      return
    }
    setRouteExtraPolesCoordsDrafts((prev) => {
      const next = Array.from({ length: zjndExtraPolesCount }, (_, i) => prev[i] ?? '')
      return next
    })
  }, [isZjndSelected, zjndExtraPolesCount, routeExtraPolesCoordsDrafts.length])

  useEffect(() => {
    const shouldDefaultCompliant =
      standard === 'W4' ||
      standard === 'W5' ||
      state.workCodes.some((w) => w.code.toUpperCase() === 'ZJDEW')

    if (!shouldDefaultCompliant) return
    if (routeAutoDefaultAppliedRef.current) return
    if (state.routeCompliant) return
    if (state.routeDescription.trim()) return

    routeAutoDefaultAppliedRef.current = true
    setRouteCompliantDraft(true)
    setRouteCompliant(true)
  }, [
    standard,
    state.workCodes,
    state.routeCompliant,
    state.routeDescription,
    setRouteCompliant,
  ])

  const generatedRouteSuggestion = (() => {
    const node = routeNodePathDraft.trim()
    const port = routePortDraft.trim()
    const okw = routeOkwDraft.trim()
    const fiber = routeFiberNoDraft.trim()
    if (!node || !port) return ''

    if (routeMode === 'W1') {
      if (routeHasOkwDraft && okw) {
        return `${node} port:${port}, ${okw}${fiber ? ` włókno ${fiber}` : ''}`
      }
      return `${node} port:${port}, kabel 1j doprowadzono bezpośrednio od OPP do lokalu klienta`
    }
    if (routeMode === 'W2') {
      if (routeNoOkwDraft) {
        return `${node} port:${port}, kabel 1j doprowadzono od OPP do lokalu klienta`
      }
      return okw ? `${node} port:${port}, ${okw}${fiber ? ` włókno ${fiber}` : ''}` : `${node} port:${port}`
    }
    if (routeMode === 'W3') {
      if (routeW3ViaOkwDraft && routeNoOkwDraft) {
        return `${node} port:${port}, kabel 1j doprowadzono od OPP do lokalu klienta`
      }
      if (routeW3ViaOkwDraft && okw) {
        return `${node} port:${port}, ${okw}${fiber ? ` włókno ${fiber}` : ''}`
      }
      return `${node} port:${port}, kabel 1j doprowadzono od KŁD do lokalu klienta`
    }
    if (routeMode === 'ZJD') {
      return `${node} port:${port}, KABEL DAC ${routeCableJDraft || '2'}j DOPROWADZONO OD ZOSTAWIONEGO ZAPASU PRZY POSESJI DO BUDYNKU KLIENTA`
    }
    if (routeMode === 'ZJN') {
      const cableJ = routeCableJDraft.trim() || '2'
      const len = routeLengthDraft.trim()
      const extraPoles = isZjndSelected ? buildExtraPolesClause(routeExtraPolesCoordsDrafts) : ''
      return `${node} port:${port}, kabel napowietrzny ${cableJ}j${
        len ? `, długość ${len}m` : ''
      }${extraPoles}\npowieszony od istniejącego ${routeSourceNodeTypeDraft} do budynku klienta`
    }
    return `${node} port:${port}`
  })()

  useEffect(() => {
    setAddressNoteDraft(state.addressNoteText)
    setAddressScopeDraft(state.addressNoteScope)
  }, [state.addressNoteText, state.addressNoteScope])

  useEffect(() => {
    const suggested =
      generatedRouteSuggestion || importedRouteSuggestion || importedRouteRaw
    if (!suggested.trim()) return

    const current = routeDescriptionDraft.trim()
    const lastAuto = lastAutoRouteSuggestionRef.current.trim()
    const canAutoReplace =
      !current || (lastAuto && current === lastAuto)

    if (!canAutoReplace) return

    lastAutoRouteSuggestionRef.current = suggested
    setRouteDescriptionDraft(suggested)
    setRouteDescription(suggested)
  }, [
    importedRouteSuggestion,
    generatedRouteSuggestion,
    importedRouteRaw,
    routeDescriptionDraft,
    setRouteDescription,
  ])

  useEffect(() => {
    const el = routeDescriptionTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [routeDescriptionDraft, routeCompliantDraft])

  const persistMeasurements = () => {
    setMeasurementOpp(measurementOppDraft.trim())
    setMeasurementGo(measurementGoDraft.trim())
  }

  const persistDrafts = () => {
    persistMeasurements()
    setNotes(orderNoteDraft.trim())
    setRouteCompliant(routeCompliantDraft)
    setRouteDescription(routeCompliantDraft ? '' : routeDescriptionDraft.trim())
    if (state.addressNoteEnabled) {
      setAddressNoteText(addressNoteDraft.trim())
      setAddressNoteScope(addressScopeDraft.trim())
      return
    }

    // When the switch is off, do not carry address-note data to summary/next step.
    setAddressNoteText('')
    setAddressNoteScope('')
  }

  const handleNext = async () => {
    persistDrafts()

    const opp = measurementOppDraft.trim()
    const go = measurementGoDraft.trim()
    const measurementPattern = /^-?\d+(?:[.,]\d+)?$/
    const areMeasurementsMissing = !opp || !go
    const areMeasurementsInvalid =
      (!!opp && !measurementPattern.test(opp)) ||
      (!!go && !measurementPattern.test(go))

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      areMeasurementsMissing
    ) {
      toast.error('Uzupełnij pomiary OPP i GO.')
      return
    }

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      areMeasurementsInvalid
    ) {
      toast.error('Podaj poprawne wartości pomiarów (np. 12,3).')
      return
    }

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      !routeCompliantDraft &&
      !routeDescriptionDraft.trim()
    ) {
      toast.error('Uzupełnij przebieg lub zaznacz "Przebieg zgodny".')
      return
    }

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      !routeCompliantDraft
    ) {
      const node = routeNodePathDraft.trim()
      const port = routePortDraft.trim()

      if (routeMode !== 'OTHER' && (!node || !port)) {
        toast.error('Uzupełnij punkt i port dla przebiegu.')
        return
      }

      if (routeMode === 'W2' && !routeNoOkwDraft) {
        if (!routeOkwDraft.trim()) {
          toast.error('Dla W2 podaj OKW.')
          return
        }
        if (!routeFiberNoDraft.trim()) {
          toast.error('Dla OKW podaj nr włókna.')
          return
        }
      }

      if (routeMode === 'W1' && routeHasOkwDraft) {
        if (!routeOkwDraft.trim()) {
          toast.error('Dla W1 z OKW podaj OKW.')
          return
        }
        if (!routeFiberNoDraft.trim()) {
          toast.error('Dla OKW podaj nr włókna.')
          return
        }
      }

      if (
        routeMode === 'W3' &&
        routeW3ViaOkwDraft &&
        !routeNoOkwDraft
      ) {
        if (!routeOkwDraft.trim()) {
          toast.error('Dla W3 z OKW podaj OKW.')
          return
        }
        if (!routeFiberNoDraft.trim()) {
          toast.error('Dla OKW podaj nr włókna.')
          return
        }
      }

      if (routeMode === 'ZJN') {
        if (!routeLengthDraft.trim()) {
          toast.error('Dla ZJN podaj długość kabla.')
          return
        }
        if (
          isZjndSelected &&
          routeExtraPolesCoordsDrafts.some((v) => !v.trim())
        ) {
          toast.error('Dla ZJND podaj współrzędne dodatkowych słupów.')
          return
        }
      }
    }

    if (state.addressNoteEnabled && addressNoteDraft.trim()) {
      const signature = `${addressNoteDraft.trim()}|${addressScopeDraft.trim()}`
      if (signature === lastSavedAddressSignatureRef.current) {
        onNext()
        return
      }

    try {
        await createAddressNote.mutateAsync({
          orderId,
          note: addressNoteDraft.trim(),
          buildingScope: addressScopeDraft.trim() || '',
        })
        lastSavedAddressSignatureRef.current = signature
        await utils.opl.order.getAddressNotesForOrder.invalidate({ orderId })
      } catch {
        toast.error('Nie udało się zapisać uwagi do adresu.')
        return
      }
    }

    onNext()
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-4 p-4">
        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold">Pomiary</h3>
          <p className="text-xs text-muted-foreground">
            Podaj wartości dla OPP i GO.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opl-measurement-opp">OPP (dB)</Label>
              <Input
                id="opl-measurement-opp"
                value={measurementOppDraft}
                onChange={(e) => {
                  const value = e.target.value
                  setMeasurementOppDraft(value)
                  setMeasurementOpp(value.trim())
                }}
                placeholder="np. 12,3"
                className={subtlePlaceholderInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opl-measurement-go">GO (dB)</Label>
              <Input
                id="opl-measurement-go"
                value={measurementGoDraft}
                onChange={(e) => {
                  const value = e.target.value
                  setMeasurementGoDraft(value)
                  setMeasurementGo(value.trim())
                }}
                placeholder="np. 12,7"
                className={subtlePlaceholderInputClass}
              />
            </div>
          </div>
          {formatMeasurementsLine({
            opp: measurementOppDraft,
            go: measurementGoDraft,
          }) && (
            <p className="text-xs text-muted-foreground">
              {formatMeasurementsLine({
                opp: measurementOppDraft,
                go: measurementGoDraft,
              })}
            </p>
          )}

        </Card>

        {orderType === 'INSTALLATION' && (
          <Card className="space-y-3 p-4">
            <h3 className="text-base font-semibold">Przebieg</h3>
            <p className="text-xs text-muted-foreground">
              Podaj przebieg
            </p>
            <div className="space-y-3">
              {!routeCompliantDraft && (
                <div className="space-y-3 rounded-md bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Format wg wybranego kodu pracy: <span className="font-medium text-foreground">{routeModeLabel}</span>
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Punkt (SP/OPP/OSD)</Label>
                      <Input
                        value={routeNodePathDraft}
                        onChange={(e) => setRouteNodePathDraft(e.target.value)}
                        placeholder="SP-001_GDANSK/OPP023D"
                        className={subtlePlaceholderInputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Port</Label>
                      <Input
                        value={routePortDraft}
                        onChange={(e) => setRoutePortDraft(e.target.value)}
                        placeholder="12"
                        className={subtlePlaceholderInputClass}
                      />
                    </div>
                    {(routeMode === 'ZJD' || routeMode === 'ZJN') && (
                      <div className="space-y-1.5">
                        <Label>Typ kabla (J)</Label>
                        <Input
                          value={routeCableJDraft}
                          onChange={(e) => setRouteCableJDraft(e.target.value)}
                          placeholder="2"
                          className={subtlePlaceholderInputClass}
                        />
                      </div>
                    )}
                  </div>

                  {routeMode === 'W1' && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="opl-route-w1-okw">Było OKW</Label>
                        <Switch
                          id="opl-route-w1-okw"
                          checked={routeHasOkwDraft}
                          onCheckedChange={setRouteHasOkwDraft}
                        />
                      </div>
                      {routeHasOkwDraft && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:col-span-2">
                            <Label>OKW</Label>
                            <Input
                              value={routeOkwDraft}
                              onChange={(e) => setRouteOkwDraft(e.target.value)}
                              placeholder="OKW0426347/24J_(1-22)"
                              className={subtlePlaceholderInputClass}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Nr włókna</Label>
                            <Input
                              value={routeFiberNoDraft}
                              onChange={(e) => setRouteFiberNoDraft(e.target.value)}
                              placeholder="9"
                              className={subtlePlaceholderInputClass}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {routeMode === 'W3' && (
                    <div className="flex items-center justify-between gap-3 rounded-md bg-background/80 px-3 py-2">
                      <Label htmlFor="opl-route-w3-okw">Dodaj OKW</Label>
                      <Switch
                        id="opl-route-w3-okw"
                        checked={routeW3ViaOkwDraft}
                        onCheckedChange={(checked) => {
                          setRouteW3ViaOkwDraft(checked)
                          if (checked) {
                            setRouteNoOkwDraft(false)
                          }
                        }}
                      />
                    </div>
                  )}

                  {(routeMode === 'W2' || (routeMode === 'W3' && routeW3ViaOkwDraft)) && (
                    <div className="space-y-3 rounded-md bg-background/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="opl-route-no-okw">Brak OKW</Label>
                        <Switch
                          id="opl-route-no-okw"
                          checked={routeNoOkwDraft}
                          onCheckedChange={setRouteNoOkwDraft}
                        />
                      </div>

                      {!routeNoOkwDraft && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:col-span-2">
                            <Label>OKW</Label>
                            <Input
                              value={routeOkwDraft}
                              onChange={(e) => setRouteOkwDraft(e.target.value)}
                              placeholder="OKW0426347/24J_(1-22)"
                              className={subtlePlaceholderInputClass}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Nr włókna</Label>
                            <Input
                              value={routeFiberNoDraft}
                              onChange={(e) => setRouteFiberNoDraft(e.target.value)}
                              placeholder="9"
                              className={subtlePlaceholderInputClass}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {routeMode === 'ZJN' && (
                    <>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Długość (m)</Label>
                          <Input
                            value={routeLengthDraft}
                            onChange={(e) => setRouteLengthDraft(e.target.value)}
                            placeholder="70"
                            className={subtlePlaceholderInputClass}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Źródło</Label>
                          <Select
                            value={routeSourceNodeTypeDraft}
                            onValueChange={(v) =>
                              setRouteSourceNodeTypeDraft(v as 'OPP' | 'OSD')
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPP">OPP</SelectItem>
                              <SelectItem value="OSD">OSD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {isZjndSelected && (
                        <div className="space-y-2">
                          <Label>Współrzędne dodatkowych słupów</Label>
                          <p className="text-xs text-muted-foreground">
                            Liczba pól wynika z ilości wybranego kodu ZJND ({zjndExtraPolesCount}).
                          </p>
                          <div className="space-y-2">
                            {routeExtraPolesCoordsDrafts.map((coord, index) => (
                              <div key={index} className="space-y-1.5">
                                <Label>Dodatkowy słup #{index + 1}</Label>
                                <Input
                                  value={coord}
                                  onChange={(e) =>
                                    setRouteExtraPolesCoordsDrafts((prev) => {
                                      const next = [...prev]
                                      next[index] = e.target.value
                                      return next
                                    })
                                  }
                                  placeholder="54,3443683, 18,8311836"
                                  className={subtlePlaceholderInputClass}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="opl-route-compliant" className="text-xs">
                    Przebieg zgodny
                  </Label>
                  <Switch
                    id="opl-route-compliant"
                    checked={routeCompliantDraft}
                    onCheckedChange={(checked) => {
                      routeAutoDefaultAppliedRef.current = true
                      setRouteCompliantDraft(checked)
                      setRouteCompliant(checked)
                      if (checked) {
                        setRouteDescriptionDraft('')
                        setRouteDescription('')
                      }
                    }}
                  />
                </div>
              </div>

              {!routeCompliantDraft && (
                <div className="space-y-1.5">
                  <Label htmlFor="opl-route-description">
                    Opis przebiegu
                  </Label>
                  <Textarea
                    id="opl-route-description"
                    ref={routeDescriptionTextareaRef}
                    value={routeDescriptionDraft}
                    onChange={(e) => {
                      const value = e.target.value
                      setRouteDescriptionDraft(value)
                      setRouteDescription(value.trim())
                      const el = e.currentTarget
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }}
                    placeholder="Np. SP-001_GDANSK/OPP023D port:12, OKW0426347/24J_(1-22) włókno 9"
                    className="min-h-24 resize-none overflow-hidden bg-background placeholder:text-muted-foreground/60 placeholder:italic"
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold">Uwagi do zlecenia</h3>
          <p className="text-xs text-muted-foreground">
            Pole opcjonalne. Widoczne przy tym zleceniu.
          </p>
          <Textarea
            value={orderNoteDraft}
            onChange={(e) => {
              const value = e.target.value
              setOrderNoteDraft(value)
              setNotes(value.trim())
            }}
            placeholder="Dodaj uwagę do tego zlecenia (opcjonalnie)"
            className="min-h-24"
          />
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Uwaga do adresu</h3>
              <p className="text-xs text-muted-foreground">
                Będzie widoczna w kolejnych zleceniach pod tym adresem.
              </p>
            </div>
            <Switch
              checked={state.addressNoteEnabled}
              onCheckedChange={setAddressNoteEnabled}
            />
          </div>

          {state.addressNoteEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="opl-address-note-text">Treść uwagi</Label>
                <Textarea
                  id="opl-address-note-text"
                  value={addressNoteDraft}
                  onChange={(e) => {
                    setAddressNoteDraft(e.target.value)
                  }}
                  placeholder="Np. Kontakt do administracji: 600 000 000"
                  className="min-h-24"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opl-address-note-scope">
                  Zakres budynków (opcjonalnie)
                </Label>
                <Input
                  id="opl-address-note-scope"
                  value={addressScopeDraft}
                  onChange={(e) => {
                    setAddressScopeDraft(e.target.value)
                  }}
                  placeholder="Np. 1,2,3,10-12 (puste = bieżący numer)"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button
          className="flex-1 gap-1"
          onClick={handleNext}
          disabled={createAddressNote.isPending}
        >
          {createAddressNote.isPending ? 'Zapisywanie...' : 'Dalej'}
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export default OplStepNotes
