'use client'

import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

type Props = {
  id: string
  label: string
  error?: string
  /** react-hook-form register */
  reg?: UseFormRegisterReturn
}

/**
 * PasswordField
 * -------------
 * Single input with “eye” toggle.
 * Accepts RHF `register` props and displays validation error.
 */
const PasswordField = ({ id, label, error, reg }: Props) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          {...reg}
          className={`pr-10 ${error ? 'border-destructive' : ''}`}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
        >
          {visible ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
        </button>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

export default PasswordField
