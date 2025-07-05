'use client'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { UserWithBasic } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

/** Form schema – keeps just technicianId string */
const formSchema = z.object({
  technicianId: z.string().min(1, 'Wybierz technika'),
})
type FormData = z.infer<typeof formSchema>

interface Props {
  value: UserWithBasic | null
  onChange: (tech: UserWithBasic | null) => void
}

/**
 * TechnicianSelector
 * ------------------------------------------------
 * Dropdown with active technicians (excluding myself).
 * Emits full technician object (`UserWithBasic`) to a parent.
 */
const TechnicianSelector = ({ value, onChange }: Props) => {
  /* form init */
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { technicianId: '' },
  })

  /* current user – we filter him out */
  const { data: session } = useSession()
  const myId = session?.user.id

  /* get technicians list */
  const { data: techniciansRaw = [], isLoading } =
    trpc.user.getTechnicians.useQuery()

  /* strip myself from the list */
  const technicians = useMemo(
    () => techniciansRaw.filter((t) => t.id !== myId),
    [techniciansRaw, myId]
  )

  /* keep external value in sync with form */
  useEffect(() => {
    if (value) form.setValue('technicianId', value.id)
  }, [value, form])

  /* handle selection */
  const handleChange = (id: string) => {
    const selected = technicians.find((t) => t.id === id) ?? null
    onChange(selected)
    form.setValue('technicianId', id)
  }

  /* -------------- render -------------- */
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="technicianId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">Technik</FormLabel>

            <Select
              onValueChange={handleChange}
              value={field.value}
              disabled={isLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz technika" />
                </SelectTrigger>
              </FormControl>

              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                    {tech.identyficator ? ` | ${tech.identyficator}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}

export default TechnicianSelector
