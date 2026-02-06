'use client'

import { oplOrderFailureReasons } from '@/app/(modules)/opl-crm/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'

type Props = {
  value: string
  onChange: (reason: string) => void
}

/**
 * OplFailureReasonSelect
 * -----------------------------------------------------------------------------
 * Controlled dropdown for selecting failure reason.
 * Keeps options collocated and usage concise in the parent modal.
 */
const OplFailureReasonSelect: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Wybierz powód niewykonania" />
      </SelectTrigger>
      <SelectContent>
        {oplOrderFailureReasons.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default OplFailureReasonSelect
