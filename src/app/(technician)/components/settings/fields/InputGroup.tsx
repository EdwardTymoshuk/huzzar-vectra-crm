'use client'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import React from 'react'

/**
 * Labeled input used in many places (goal form, dialog itp.).
 * Accepts native <input /> props + error text.
 */
type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}

const InputGroup = ({ id, label, error, ...rest }: Props) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>

    <Input
      id={id}
      {...rest}
      className={`${rest.className ?? ''} ${error ? 'border-destructive' : ''}`}
    />

    {error && <p className="text-destructive text-xs">{error}</p>}
  </div>
)

export default InputGroup
