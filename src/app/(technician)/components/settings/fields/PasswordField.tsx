'use client'

import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

/**
 * Password input with eye-toggle and optional RHF register.
 * – Shows validation error below the field.
 */
type Props = {
  id: string
  label: string
  error?: string
  /** react-hook-form register – spread on <Input /> */
  reg?: ReturnType<any>
}

const PasswordField = ({ id, label, error, reg }: Props) => {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          {...(reg ?? {})}
          className={`${error ? 'border-destructive' : ''} pr-10`}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
        >
          {show ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
        </button>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

export default PasswordField
