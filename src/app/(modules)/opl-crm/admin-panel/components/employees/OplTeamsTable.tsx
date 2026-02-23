'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
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
import { MdDelete, MdEdit, MdGroupAdd, MdMoreVert } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  searchTerm: string
}

type TeamVM = {
  id: string
  name: string
  active: boolean
  technician1Id: string
  technician2Id: string
  technician1Name: string
  technician2Name: string
}

type FormState = {
  id?: string
  name: string
  technician1Id: string
  technician2Id: string
  active: boolean
}

const defaultForm: FormState = {
  name: '',
  technician1Id: '',
  technician2Id: '',
  active: true,
}

const TeamDialog = ({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  technicians,
  isSubmitting,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: FormState
  setForm: (next: FormState) => void
  technicians: Array<{ id: string; name: string }>
  isSubmitting: boolean
  onSubmit: () => void
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nazwa ekipy (opcjonalnie)</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Np. Bochen / Tymoshuk"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Technik #1 (główny)</label>
          <Select
            value={form.technician1Id}
            onValueChange={(value) => setForm({ ...form, technician1Id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz technika #1" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Technik #2</label>
          <Select
            value={form.technician2Id}
            onValueChange={(value) => setForm({ ...form, technician2Id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz technika #2" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {technicians
                .filter((t) => t.id !== form.technician1Id)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Aktywna ekipa</div>
            <div className="text-xs text-muted-foreground">
              Nieaktywne ekipy nie będą używane do podpowiedzi.
            </div>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(checked) => setForm({ ...form, active: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

const OplTeamsTable = ({ searchTerm }: Props) => {
  const utils = trpc.useUtils()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamVM | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<TeamVM | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  const { data: teams, isLoading: isTeamsLoading } = trpc.opl.user.getTeams.useQuery()
  const { data: technicians, isLoading: isTechniciansLoading } =
    trpc.opl.user.getTechnicians.useQuery({ status: 'ACTIVE' })

  const refresh = async () => {
    await Promise.all([
      utils.opl.user.getTeams.invalidate(),
      utils.opl.user.getTeams.invalidate({ activeOnly: true }),
    ])
  }

  const createTeam = trpc.opl.user.createTeam.useMutation({
    onSuccess: async () => {
      toast.success('Dodano ekipę.')
      await refresh()
      setDialogOpen(false)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się dodać ekipy.'),
  })
  const updateTeam = trpc.opl.user.updateTeam.useMutation({
    onSuccess: async () => {
      toast.success('Zapisano ekipę.')
      await refresh()
      setDialogOpen(false)
      setEditingTeam(null)
      setForm(defaultForm)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się zapisać ekipy.'),
  })
  const deleteTeam = trpc.opl.user.deleteTeam.useMutation({
    onSuccess: async () => {
      toast.success('Usunięto ekipę.')
      await refresh()
      setTeamToDelete(null)
    },
    onError: (err) => toast.error(err.message || 'Nie udało się usunąć ekipy.'),
  })

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return (teams ?? []) as TeamVM[]
    return ((teams ?? []) as TeamVM[]).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.technician1Name.toLowerCase().includes(q) ||
        t.technician2Name.toLowerCase().includes(q)
    )
  }, [teams, searchTerm])

  const openCreate = () => {
    setEditingTeam(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (team: TeamVM) => {
    setEditingTeam(team)
    setForm({
      id: team.id,
      name: team.name,
      technician1Id: team.technician1Id,
      technician2Id: team.technician2Id,
      active: team.active,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.technician1Id || !form.technician2Id) {
      toast.error('Wybierz dwóch techników.')
      return
    }
    if (form.technician1Id === form.technician2Id) {
      toast.error('Ekipa musi składać się z dwóch różnych techników.')
      return
    }

    const payload = {
      name: form.name || undefined,
      technician1Id: form.technician1Id,
      technician2Id: form.technician2Id,
      active: form.active,
    }

    if (editingTeam?.id) {
      await updateTeam.mutateAsync({ id: editingTeam.id, ...payload })
      return
    }
    await createTeam.mutateAsync(payload)
  }

  if (isTeamsLoading || isTechniciansLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoaderSpinner />
      </div>
    )
  }

  const technicianOptions = (technicians ?? []).map((t) => ({
    id: t.id,
    name: t.name,
  }))

  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-2">
        <Button onClick={openCreate}>
          <MdGroupAdd className="mr-2 h-4 w-4" />
          Dodaj ekipę
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Technik #1</TableHead>
              <TableHead>Technik #2</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Brak ekip do wyświetlenia.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{team.technician1Name}</TableCell>
                  <TableCell>{team.technician2Name}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        team.active
                          ? 'bg-lime-500 hover:bg-lime-500 text-white'
                          : 'bg-zinc-500 hover:bg-zinc-500 text-white'
                      }
                    >
                      {team.active ? 'AKTYWNA' : 'NIEAKTYWNA'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Akcje">
                          <MdMoreVert />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-background text-foreground border border-border shadow-md"
                        align="end"
                      >
                        <DropdownMenuItem onClick={() => openEdit(team)}>
                          <MdEdit className="mr-2 h-4 w-4" />
                          Edytuj ekipę
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTeamToDelete(team)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <MdDelete className="mr-2 h-4 w-4" />
                          Usuń ekipę
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TeamDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingTeam(null)
            setForm(defaultForm)
          }
        }}
        title={editingTeam ? 'Edytuj ekipę' : 'Dodaj ekipę'}
        form={form}
        setForm={setForm}
        technicians={technicianOptions}
        isSubmitting={createTeam.isPending || updateTeam.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={Boolean(teamToDelete)}
        onClose={() => setTeamToDelete(null)}
        description="Czy na pewno chcesz usunąć tę ekipę techników?"
        onConfirm={async () => {
          if (!teamToDelete) return
          await deleteTeam.mutateAsync({ id: teamToDelete.id })
        }}
      />
    </>
  )
}

export default OplTeamsTable
