'use client'

import SettingsSection from '@/app/components/settings/SettingsSection'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from '@/app/components/ui/skeleton'
import { Switch } from '@/app/components/ui/switch'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd, MdClose } from 'react-icons/md'
import { toast } from 'sonner'
import { z } from 'zod'

const zoneSchema = z.object({
  zone: z.string().trim().min(2, 'Nazwa strefy jest wymagana').max(80),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean().default(true),
})

type ZoneFormData = z.infer<typeof zoneSchema>
type OplZoneDefinition = {
  zone: string
  active: boolean
  sortOrder: number
}

const EditZoneDialog = ({
  open,
  item,
  onClose,
}: {
  open: boolean
  item: OplZoneDefinition
  onClose: () => void
}) => {
  const utils = trpc.useUtils()
  const form = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      zone: item.zone,
      sortOrder: item.sortOrder,
      active: item.active,
    },
  })

  useEffect(() => {
    form.reset({
      zone: item.zone,
      sortOrder: item.sortOrder,
      active: item.active,
    })
  }, [item, form])

  const mutation = trpc.opl.settings.editOplZoneDefinition.useMutation({
    onSuccess: () => {
      toast.success('Strefa została zapisana.')
      utils.opl.settings.getAllOplZoneDefinitions.invalidate()
      onClose()
    },
    onError: () => toast.error('Nie udało się zapisać strefy.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj strefę</DialogTitle>
          <DialogDescription>Ustaw nazwę, kolejność i aktywność strefy.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) => {
              mutation.mutate({
                oldZone: item.zone,
                zone: data.zone,
                sortOrder: data.sortOrder,
                active: data.active,
              })
            })}
          >
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa strefy</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolejność</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel>Aktywna</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const AddZoneDialog = () => {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()
  const form = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { zone: '', sortOrder: 0, active: true },
  })

  const mutation = trpc.opl.settings.createOplZoneDefinition.useMutation({
    onSuccess: () => {
      toast.success('Dodano nową strefę.')
      utils.opl.settings.getAllOplZoneDefinitions.invalidate()
      setOpen(false)
      form.reset({ zone: '', sortOrder: 0, active: true })
    },
    onError: () => toast.error('Nie udało się dodać strefy.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MdAdd />
          Dodaj strefę
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj strefę</DialogTitle>
          <DialogDescription>Nowa pozycja do słownika stref OPL.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          >
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa strefy</FormLabel>
                  <FormControl>
                    <Input placeholder="np. GDAŃSK FTTH" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolejność</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel>Aktywna</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const OplZonesDefinitionSection = ({ title }: { title: string }) => {
  const { data, isLoading, isError } = trpc.opl.settings.getAllOplZoneDefinitions.useQuery()
  const [editingItem, setEditingItem] = useState<OplZoneDefinition | null>(null)
  const utils = trpc.useUtils()

  const deleteMutation = trpc.opl.settings.deleteOplZoneDefinition.useMutation({
    onSuccess: () => {
      toast.success('Strefa została usunięta.')
      utils.opl.settings.getAllOplZoneDefinitions.invalidate()
    },
    onError: () => toast.error('Nie udało się usunąć strefy.'),
  })

  return (
    <SettingsSection title={title}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : isError || !data ? (
        <Alert variant="destructive">
          <AlertTitle>Nie udało się załadować słownika stref.</AlertTitle>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Strefy</CardTitle>
            <CardDescription>Łącznie: {data.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.map((zone: OplZoneDefinition) => (
                <Badge
                  key={zone.zone}
                  variant={zone.active ? 'secondary' : 'outline'}
                  className="cursor-pointer flex items-center gap-2"
                  onDoubleClick={() => setEditingItem(zone)}
                >
                  <span>{zone.zone}</span>
                  <span className="text-[10px] opacity-70">#{zone.sortOrder}</span>
                  {!zone.active ? <span className="text-[10px] opacity-70">NIEAKTYWNA</span> : null}
                  <MdClose
                    className="cursor-pointer text-danger"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      deleteMutation.mutate({ zone: zone.zone })
                    }}
                  />
                </Badge>
              ))}
            </div>

            {editingItem ? (
              <EditZoneDialog
                open={Boolean(editingItem)}
                item={editingItem}
                onClose={() => setEditingItem(null)}
              />
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-4">
        <AddZoneDialog />
      </div>
    </SettingsSection>
  )
}

export default OplZonesDefinitionSection
