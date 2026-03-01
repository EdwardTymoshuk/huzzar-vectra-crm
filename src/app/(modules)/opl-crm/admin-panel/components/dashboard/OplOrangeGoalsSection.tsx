'use client'

import { parseOplNpsFromExcel } from '@/app/(modules)/opl-crm/utils/excelParsers/oplNpsExcelParser'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { OplOrderType } from '@prisma/client'
import { ChevronRight, Plus, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { ReactNode, useMemo, useRef, useState } from 'react'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Props = {
  date: Date | undefined
  range: 'day' | 'month' | 'year'
}

const FILE_EXTENSIONS = ['xls', 'xlsx', 'xlsm']
const leadFormSchema = z.object({
  zone: z.string().min(2, 'Wybierz strefę'),
  technicianId: z.string().optional(),
  address: z.string().min(3, 'Podaj adres'),
  leadNumber: z.string().min(2, 'Podaj numer leada'),
})
type LeadFormData = z.infer<typeof leadFormSchema>
type RankingSortKey =
  | 'technicianName'
  | 'successRate'
  | 'received'
  | 'completed'
  | 'notCompleted'
  | 'assigned'
  | 'wCompleted'
  | 'zjdCompleted'
  | 'zjnCompleted'
  | 'odPct'
  | 'npsPct'

const pctClass = (ok: boolean) =>
  ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

const GoalKpiCard = ({
  label,
  value,
  target,
  reached,
  onDetails,
  children,
}: {
  label: string
  value: number
  target: number
  reached: boolean
  onDetails?: () => void
  children?: ReactNode
}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {onDetails ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onDetails}
          >
            Szczegóły
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Badge variant={reached ? 'success' : 'destructive'}>
          {reached ? 'Cel osiągnięty' : 'Poniżej celu'}
        </Badge>
      </div>
    </div>

    <p className={`mt-2 text-3xl font-semibold ${pctClass(reached)}`}>{value}%</p>
    <p className="mt-1 text-xs text-muted-foreground">Cel: {target}%</p>

    {children ? <div className="mt-3">{children}</div> : null}
  </Card>
)

const OplOrangeGoalsSection = ({ date, range }: Props) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [detailsModal, setDetailsModal] = useState<'NPS' | 'OD' | 'LEADS' | null>(null)
  const [sortKey, setSortKey] = useState<RankingSortKey>('successRate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const utils = trpc.useUtils()

  const { data, isLoading, isError } = trpc.opl.order.getOrangeGoalsDashboard.useQuery(
    {
      date: date ?? new Date(),
      range,
    },
    {
      enabled: Boolean(date),
    }
  )
  const efficiencyQuery = trpc.opl.order.getTechnicianEfficiency.useQuery({
    date: date?.toISOString() ?? new Date().toISOString(),
    range,
    orderType: OplOrderType.INSTALLATION,
  })
  const zonesQuery = trpc.opl.settings.getAllOplZoneDefinitions.useQuery()
  const techniciansQuery = trpc.opl.user.getTechnicians.useQuery({ status: 'ACTIVE' })

  const importMutation = trpc.opl.order.importNpsQ6Rows.useMutation()
  const createLeadMutation = trpc.opl.order.createLeadEntry.useMutation()
  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      zone: '',
      technicianId: undefined,
      address: '',
      leadNumber: '',
    },
  })

  const handlePickFile = () => fileInputRef.current?.click()

  const handleImport = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!FILE_EXTENSIONS.includes(extension)) {
      toast.error('Nieobsługiwany format pliku. Użyj .xls/.xlsx/.xlsm.')
      return
    }

    setIsImporting(true)
    try {
      const parsed = await parseOplNpsFromExcel(file)
      if (!parsed.length) {
        toast.warning('Brak wierszy NPS do importu.')
        return
      }

      const result = await importMutation.mutateAsync({ rows: parsed })
      await utils.opl.order.getOrangeGoalsDashboard.invalidate()

      toast.success(
        `Zapisano ${result.updated} wpisów NPS${
          result.unresolvedOrders > 0
            ? ` (bez powiązania ze zleceniem: ${result.unresolvedOrders})`
            : ''
        }.`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zaimportować NPS.'
      toast.error(message)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCreateLead = async (values: LeadFormData) => {
    await createLeadMutation.mutateAsync(values)
    await utils.opl.order.getOrangeGoalsDashboard.invalidate()
    toast.success('Lead dodany.')
    setLeadDialogOpen(false)
    leadForm.reset()
  }

  const openOrderDetails = (orderId: string) => {
    const from = `${window.location.pathname}${window.location.search}`
    router.push(`/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`)
  }

  const toggleSort = (key: RankingSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('desc')
  }

  const renderSortIcon = (key: RankingSortKey) => {
    if (sortKey !== key) return <TiArrowUnsorted className="inline-block text-base" />
    return sortDirection === 'asc' ? (
      <TiArrowSortedUp className="inline-block text-base" />
    ) : (
      <TiArrowSortedDown className="inline-block text-base" />
    )
  }

  const mergedRanking = useMemo(() => {
    const rankingRows = data?.technicianRanking ?? []
    const efficiencyByName = new Map(
      (efficiencyQuery.data ?? []).map((row) => [row.technicianName, row])
    )
    const names = Array.from(
      new Set([
        ...rankingRows.map((row) => row.technicianName),
        ...(efficiencyQuery.data ?? []).map((row) => row.technicianName),
      ])
    )
    const merged = names.map((name) => {
      const extra = rankingRows.find((row) => row.technicianName === name)
      const base = efficiencyByName.get(name)
      return {
        technicianName: name,
        received: base?.received ?? 0,
        notCompleted: base?.notCompleted ?? 0,
        assigned: base?.assigned ?? 0,
        successRate: base?.successRate ?? 0,
        completed: extra?.completed ?? 0,
        wCompleted: extra?.wCompleted ?? 0,
        zjdCompleted: extra?.zjdCompleted ?? 0,
        zjnCompleted: extra?.zjnCompleted ?? 0,
        odPct: extra?.odPct ?? 0,
        npsPct: extra?.npsPct ?? 0,
      }
    })

    return merged.sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }
      return sortDirection === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA)
    })
  }, [data, efficiencyQuery.data, sortDirection, sortKey])

  if (!date) return null

  if (isLoading || !data) {
    return <Skeleton className="h-[360px] w-full mb-6" />
  }

  if (isError) {
    return (
      <Card className="p-4 mb-6">
        <p className="text-sm text-destructive">Nie udało się załadować KPI ORANGE.</p>
      </Card>
    )
  }

  return (
    <section className="mt-2 mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <GoalKpiCard
          label="Efektywność OPL"
          value={data.goals.efficiency.value}
          target={data.goals.efficiency.target}
          reached={data.goals.efficiency.reached}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 text-xs">Strefa</TableHead>
                <TableHead className="h-7 text-xs text-right">O</TableHead>
                <TableHead className="h-7 text-xs text-right">W</TableHead>
                <TableHead className="h-7 text-xs text-right">N</TableHead>
                <TableHead className="h-7 text-xs text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.zoneOrangeStats.map((row) => (
                <TableRow key={`opl-${row.zone}`}>
                  <TableCell className="py-1 text-xs">{row.zone}</TableCell>
                  <TableCell className="py-1 text-xs text-right">{row.received}</TableCell>
                  <TableCell className="py-1 text-xs text-right">{row.completed}</TableCell>
                  <TableCell className="py-1 text-xs text-right">{row.failed}</TableCell>
                  <TableCell className="py-1 text-xs text-right font-semibold">{row.efficiency}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GoalKpiCard>

        <GoalKpiCard
          label="Once and Done"
          value={data.goals.od.value}
          target={data.goals.od.target}
          reached={data.goals.od.reached}
          onDetails={() => setDetailsModal('OD')}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 text-xs">Strefa</TableHead>
                <TableHead className="h-7 text-xs text-right">W 1</TableHead>
                <TableHead className="h-7 text-xs text-right">Wszystkie</TableHead>
                <TableHead className="h-7 text-xs text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.odAllByZone.map((row) => (
                <TableRow key={`od-${row.zone}`}>
                  <TableCell className="py-1 text-xs">{row.zone}</TableCell>
                  <TableCell className="py-1 text-xs text-right">{row.firstEntry}</TableCell>
                  <TableCell className="py-1 text-xs text-right">{row.allCompleted}</TableCell>
                  <TableCell className="py-1 text-xs text-right font-semibold">{row.efficiency}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GoalKpiCard>

        <GoalKpiCard
          label="NPS (Q6)"
          value={data.goals.nps.value}
          target={data.goals.nps.target}
          reached={data.goals.nps.reached}
          onDetails={() => setDetailsModal('NPS')}
        >
          <p className="text-xs text-muted-foreground">
            5★: {data.goals.nps.promoters} | 4★: {data.goals.nps.neutral} | 1-3★: {data.goals.nps.detractors}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={handlePickFile}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importowanie...' : 'Wczytaj plik NPS'}
          </Button>
        </GoalKpiCard>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">Leady na strefę</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setDetailsModal('LEADS')}
              >
                Szczegóły
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Badge variant={data.goals.leads.reachedTotal ? 'success' : 'destructive'}>
                {data.goals.leads.reachedTotal ? 'Cel osiągnięty' : 'Poniżej celu'}
              </Badge>
            </div>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-semibold">{data.goals.leads.total}</p>
            <p className="text-xs text-muted-foreground pb-1">suma leadów</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cel: min. {data.goals.leads.totalTarget} leadów
          </p>
          <div className="mt-3">
            <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj lead</DialogTitle>
                </DialogHeader>
                <Form {...leadForm}>
                  <form
                    className="space-y-4"
                    onSubmit={leadForm.handleSubmit(async (values) => {
                      try {
                        await handleCreateLead(values)
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Nie udało się dodać leada.'
                        toast.error(message)
                      }
                    })}
                  >
                    <FormField
                      control={leadForm.control}
                      name="zone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strefa</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz strefę" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {(zonesQuery.data ?? [])
                                .filter((zone: { active: boolean }) => zone.active)
                                .map((zone: { zone: string }) => (
                                <SelectItem key={zone.zone} value={zone.zone}>
                                  {zone.zone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={leadForm.control}
                      name="technicianId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Technik</FormLabel>
                          <Select
                            value={field.value ?? 'UNASSIGNED'}
                            onValueChange={(value) =>
                              field.onChange(value === 'UNASSIGNED' ? undefined : value)
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz technika" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="UNASSIGNED">Nieprzypisany</SelectItem>
                              {(techniciansQuery.data ?? []).map((tech) => (
                                <SelectItem key={tech.id} value={tech.id}>
                                  {tech.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={leadForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="np. Gdańsk, ul. Testowa 1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={leadForm.control}
                      name="leadNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nr leada</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="np. LD-2026-001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={createLeadMutation.isPending}>
                        {createLeadMutation.isPending ? 'Dodawanie...' : 'Zapisz'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 text-xs">Strefa</TableHead>
                <TableHead className="h-7 text-xs text-right">Leady</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leadsByZoneAll.map((row) => (
                <TableRow key={`lead-${row.zone}`}>
                  <TableCell className="py-1 text-xs">{row.zone}</TableCell>
                  <TableCell className="py-1 text-xs text-right font-semibold">
                    {row.leads}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Ranking techników</h3>
          <p className="text-xs text-muted-foreground">
            NPS: {data.goals.nps.value}% | Udział ocen 5: {data.goals.nps.positivePct}% | Ocen: {data.goals.nps.total}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('technicianName')}>
                  Technik
                  {renderSortIcon('technicianName')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('successRate')}>
                  Skuteczność
                  {renderSortIcon('successRate')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('received')}>
                  Otrzymane
                  {renderSortIcon('received')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('completed')}>
                  Wykonane
                  {renderSortIcon('completed')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('notCompleted')}>
                  Niewykonane
                  {renderSortIcon('notCompleted')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('assigned')}>
                  Przypisane
                  {renderSortIcon('assigned')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('wCompleted')}>
                  W*
                  {renderSortIcon('wCompleted')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('zjdCompleted')}>
                  ZJD*
                  {renderSortIcon('zjdCompleted')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('zjnCompleted')}>
                  ZJN*
                  {renderSortIcon('zjnCompleted')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('odPct')}>
                  O&D
                  {renderSortIcon('odPct')}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('npsPct')}>
                  NPS
                  {renderSortIcon('npsPct')}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergedRanking.map((row) => (
                <TableRow key={row.technicianName}>
                  <TableCell>{row.technicianName}</TableCell>
                  <TableCell className="text-right font-medium">{row.successRate}%</TableCell>
                  <TableCell className="text-right">{row.received}</TableCell>
                  <TableCell className="text-right">{row.completed}</TableCell>
                  <TableCell className="text-right">{row.notCompleted}</TableCell>
                  <TableCell className="text-right">{row.assigned}</TableCell>
                  <TableCell className="text-right">{row.wCompleted}</TableCell>
                  <TableCell className="text-right">{row.zjdCompleted}</TableCell>
                  <TableCell className="text-right">{row.zjnCompleted}</TableCell>
                  <TableCell className="text-right font-medium">{row.odPct}%</TableCell>
                  <TableCell className="text-right font-medium">{row.npsPct}%</TableCell>
                </TableRow>
              ))}
            {mergedRanking.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Brak danych rankingowych dla wybranego okresu.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.xlsm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImport(file)
        }}
      />

      <Dialog open={detailsModal !== null} onOpenChange={(open) => !open && setDetailsModal(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {detailsModal === 'NPS'
                ? 'Szczegóły NPS'
                : detailsModal === 'OD'
                ? 'Szczegóły O&D'
                : 'Szczegóły leadów'}
            </DialogTitle>
          </DialogHeader>

          {detailsModal === 'NPS' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer zlecenia</TableHead>
                  <TableHead>Technik</TableHead>
                  <TableHead>Strefa</TableHead>
                  <TableHead className="text-right">Q6 NPS</TableHead>
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.npsDetails.map((row) => (
                  <TableRow key={`${row.orderNumber}-${row.technicianName}-${row.q6Score}`}>
                    <TableCell>{row.orderNumber}</TableCell>
                    <TableCell>{row.technicianName}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="text-right font-medium">{row.q6Score}</TableCell>
                    <TableCell className="text-right">
                      {row.orderId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => openOrderDetails(row.orderId!)}
                        >
                          Sprawdź
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {detailsModal === 'OD' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data zamknięcia</TableHead>
                  <TableHead>Numer zlecenia</TableHead>
                  <TableHead>Technik</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.odDetails.map((row) => (
                  <TableRow key={`${row.orderNumber}-${row.dateClosed}`}>
                    <TableCell>{format(new Date(row.dateClosed), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{row.orderNumber}</TableCell>
                    <TableCell>{row.technicianName}</TableCell>
                    <TableCell>{row.address}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => openOrderDetails(row.orderId)}
                      >
                        Sprawdź
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {detailsModal === 'LEADS' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nr leada</TableHead>
                  <TableHead>Technik</TableHead>
                  <TableHead>Strefa</TableHead>
                  <TableHead>Adres</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leadsDetails.map((row) => (
                  <TableRow key={`${row.leadNumber}-${row.createdAt ?? 'none'}-${row.address}`}>
                    <TableCell>
                      {row.createdAt ? format(new Date(row.createdAt), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>{row.leadNumber}</TableCell>
                    <TableCell>{row.technicianName}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default OplOrangeGoalsSection
