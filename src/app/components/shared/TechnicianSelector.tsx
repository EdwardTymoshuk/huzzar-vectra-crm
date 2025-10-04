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
import { useEffect } from 'react'
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
  /** mode: "all" → show all technicians (admin/coord/warehouse),
   *         "others" → show other technicians excluding myself (for transfers) */
  mode?: 'all' | 'others'
}

/**
 * TechnicianSelector
 * ------------------------------------------------
 * Dropdown with technicians list.
 * - mode="all"    → admin/coord/warehouse, all technicians
 * - mode="others" → technician app, excludes current user
 */
const TechnicianSelector = ({ value, onChange, mode = 'all' }: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { technicianId: '' },
  })

  const { data: session } = useSession()
  const myId = session?.user.id

  // --- fetch technicians depending on mode ---
  const { data: techniciansRaw = [], isLoading } =
    mode === 'others'
      ? trpc.user.getOtherTechnicians.useQuery({ excludeId: myId })
      : trpc.user.getTechnicians.useQuery({ status: 'ACTIVE' })

  // --- sync external value with form ---
  useEffect(() => {
    if (value) form.setValue('technicianId', value.id)
  }, [value, form])

  const handleChange = (id: string) => {
    const selected = techniciansRaw.find((t) => t.id === id) ?? null
    onChange(selected)
    form.setValue('technicianId', id)
  }

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
                {techniciansRaw.map((tech) => (
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
