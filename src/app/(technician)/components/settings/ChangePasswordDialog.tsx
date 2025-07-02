'use client'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/app/components/ui/dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import PasswordField from './fields/PasswordField'

const strongPass =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]<>?]).{8,}$/

const schema = z
  .object({
    old: z.string().min(8, 'Stare hasło musi mieć co najmniej 8 znaków.'),
    new: z
      .string()
      .regex(
        strongPass,
        'Nowe hasło musi zawierać min. 8 znaków, małe i wielkie litery, cyfrę oraz znak specjalny.'
      ),
    rep: z.string(),
  })
  .refine((d) => d.new === d.rep, {
    path: ['rep'],
    message: 'Nowe hasła nie są identyczne.',
  })

type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (oldP: string, newP: string) => void
  loading?: boolean
}

const ChangePasswordDialog = ({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const submit = (d: Form) => onSubmit(d.old, d.new)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm space-y-3">
        <PasswordField
          id="old"
          label="Stare hasło"
          error={errors.old?.message}
          reg={register('old')}
        />
        <PasswordField
          id="new"
          label="Nowe hasło"
          error={errors.new?.message}
          reg={register('new')}
        />
        <PasswordField
          id="rep"
          label="Powtórz nowe hasło"
          error={errors.rep?.message}
          reg={register('rep')}
        />

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handleSubmit(submit)}
            disabled={loading}
          >
            {loading ? 'Zapisywanie…' : 'Zmień hasło'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ChangePasswordDialog
