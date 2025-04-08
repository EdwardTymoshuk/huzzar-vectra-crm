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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  technicianId: z.string().min(1, 'Wybierz technika'),
})

type FormData = z.infer<typeof formSchema>

type Props = {
  value: UserWithBasic | null
  onChange: (user: UserWithBasic | null) => void
}

/**
 * TechnicianSelector:
 * - Renders a dropdown to select a technician.
 * - Emits the selected technician object to the parent component.
 */
const TechnicianSelector = ({ value, onChange }: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { technicianId: '' },
  })

  const { data: technicians = [], isLoading } =
    trpc.user.getTechnicians.useQuery()

  // Autofill form if value comes from outside
  useEffect(() => {
    if (value) {
      form.setValue('technicianId', value.id)
    }
  }, [value, form])

  const handleChange = (id: string) => {
    const selected = technicians.find((t) => t.id === id)
    onChange(selected ?? null)
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
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}{' '}
                    {tech.identyficator ? `| ${tech.identyficator}` : ''}
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
