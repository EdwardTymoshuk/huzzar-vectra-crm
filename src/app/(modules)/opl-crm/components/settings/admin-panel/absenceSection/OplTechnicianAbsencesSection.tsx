'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import SearchInput from '@/app/components/SearchInput'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  title: string
}

const ABSENCE_TYPES = ['VACATION', 'DAY_OFF', 'SICK_LEAVE', 'OTHER'] as const
type OplTechnicianAbsenceType = (typeof ABSENCE_TYPES)[number]

type AbsenceVM = {
  id: string
  technicianId: string
  technicianName: string
  dateFrom: Date
  dateTo: Date
  type: OplTechnicianAbsenceType
  reason: string | null
  active: boolean
}

type FormState = {
  id?: string
  technicianId: string
  dateFrom: string
  dateTo: string
  type: OplTechnicianAbsenceType
  reason: string
  active: boolean
}

const ABSENCE_TYPE_LABEL: Record<OplTechnicianAbsenceType, string> = {
  VACATION: 'Urlop',
  DAY_OFF: 'Wolne',
  SICK_LEAVE: 'L4',
  OTHER: 'Inne',
}

const defaultForm: FormState = {
  technicianId: '',
  dateFrom: '',
  dateTo: '',
  type: 'OTHER',
  reason: '',
  active: true,
}

const formatDate = (value: Date) => new Date(value).toLocaleDateString('pl-PL')

const toDateInput = (value: Date) => {
  const d = new Date(value)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const OplTechnicianAbsencesSection = ({ title }: Props) => {
  const utils = trpc.useUtils()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AbsenceVM | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  const { data: technicians = [], isLoading: isTechniciansLoading } =
    trpc.opl.user.getTechnicians.useQuery({ status: 'ACTIVE' })

  const { data: absences = [], isLoading: isAbsencesLoading } =
    trpc.opl.user.getTechnicianAbsences.useQuery({ activeOnly: false, limit: 500 })

  const createMutation = trpc.opl.user.createTechnicianAbsence.useMutation({
    onSuccess: async () => {
      toast.success('Dodano nieobecność.')
      await utils.opl.user.getTechnicianAbsences.invalidate()
      setDialogOpen(false)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się dodać wpisu.'),
  })

  const updateMutation = trpc.opl.user.updateTechnicianAbsence.useMutation({
    onSuccess: async () => {
      toast.success('Zapisano nieobecność.')
      await utils.opl.user.getTechnicianAbsences.invalidate()
      setDialogOpen(false)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się zapisać wpisu.'),
  })

  const deleteMutation = trpc.opl.user.deleteTechnicianAbsence.useMutation({
    onSuccess: async () => {
      toast.success('Usunięto nieobecność.')
      await utils.opl.user.getTechnicianAbsences.invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się usunąć wpisu.'),
  })

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return absences as AbsenceVM[]

    return (absences as AbsenceVM[]).filter((row) =>
      [row.technicianName, ABSENCE_TYPE_LABEL[row.type], row.reason ?? '', formatDate(row.dateFrom), formatDate(row.dateTo)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [absences, searchTerm])

  const openCreate = () => {
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (row: AbsenceVM) => {
    setForm({
      id: row.id,
      technicianId: row.technicianId,
      dateFrom: toDateInput(row.dateFrom),
      dateTo: toDateInput(row.dateTo),
      type: row.type,
      reason: row.reason ?? '',
      active: row.active,
    })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.technicianId || !form.dateFrom || !form.dateTo) {
      toast.error('Uzupełnij technika oraz zakres dat.')
      return
    }

    const payload = {
      technicianId: form.technicianId,
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      type: form.type,
      reason: form.reason.trim() || null,
      active: form.active,
    }

    if (form.id) {
      await updateMutation.mutateAsync({ id: form.id, ...payload })
      return
    }

    await createMutation.mutateAsync(payload)
  }

  if (isTechniciansLoading || isAbsencesLoading) {
    return (
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <LoaderSpinner />
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Szukaj po techniku, typie, dacie..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-full min-w-[260px] max-w-sm"
          />
          <Button onClick={openCreate}>
            <MdAdd className="mr-1 h-4 w-4" />
            Dodaj
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technik</TableHead>
              <TableHead>Od</TableHead>
              <TableHead>Do</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Powód</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Brak wpisów.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.technicianName}</TableCell>
                  <TableCell>{formatDate(row.dateFrom)}</TableCell>
                  <TableCell>{formatDate(row.dateTo)}</TableCell>
                  <TableCell>{ABSENCE_TYPE_LABEL[row.type]}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{row.reason || '—'}</TableCell>
                  <TableCell>
                    <Badge className={row.active ? 'bg-lime-500 hover:bg-lime-500 text-white' : 'bg-zinc-500 hover:bg-zinc-500 text-white'}>
                      {row.active ? 'AKTYWNA' : 'NIEAKTYWNA'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" onClick={() => openEdit(row)}>
                        <MdEdit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => setDeleteTarget(row)}>
                        <MdDelete className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setForm(defaultForm)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edytuj nieobecność' : 'Dodaj nieobecność'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Technik</label>
              <Select
                value={form.technicianId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, technicianId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz technika" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data od</label>
                <Input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data do</label>
                <Input
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Typ</label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, type: value as OplTechnicianAbsenceType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent className="bg-background">
                  {(Object.keys(ABSENCE_TYPE_LABEL) as OplTechnicianAbsenceType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {ABSENCE_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Powód (opcjonalnie)</label>
              <Input
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Np. urlop wypoczynkowy"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Aktywny wpis</div>
                <div className="text-xs text-muted-foreground">Wyłącz, jeśli wpis ma zostać historyczny.</div>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        description={
          deleteTarget
            ? `Usunąć wpis nieobecności: ${deleteTarget.technicianName}, ${formatDate(deleteTarget.dateFrom)} - ${formatDate(deleteTarget.dateTo)}?`
            : undefined
        }
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync({ id: deleteTarget.id })
        }}
      />
    </section>
  )
}

export default OplTechnicianAbsencesSection
