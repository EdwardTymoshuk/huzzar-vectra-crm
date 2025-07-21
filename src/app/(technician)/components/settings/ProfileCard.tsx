'use client'
import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { userRoleMap } from '@/lib/constants'
import { MdEdit } from 'react-icons/md'
import ReadonlyRow from './fields/ReadonlyRow'

type Props = {
  user: {
    name?: string
    email?: string
    phoneNumber?: string
    role?: string
    identyficator?: number | null
  }
  onChangePass: () => void
}

const ProfileCard = ({ user, onChangePass }: Props) => (
  <Card className="flex-1">
    <CardHeader className="flex flex-row justify-start items-center text-primary">
      <CardTitle>Moje dane</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <ReadonlyRow label="Imię i nazwisko" value={user.name ?? '—'} />
      <ReadonlyRow label="E-mail" value={user.email ?? '—'} />
      <ReadonlyRow label="Telefon" value={user.phoneNumber ?? '—'} />
      <ReadonlyRow label="Rola" value={userRoleMap[user.role || ''] ?? '—'} />
      <ReadonlyRow
        label="Nr identyfikator"
        value={user.identyficator?.toString() ?? '—'}
      />
      <div className="flex w-full justify-end">
        <Button size="sm" variant="success" onClick={onChangePass}>
          <MdEdit /> Zmień hasło
        </Button>
      </div>
    </CardContent>
  </Card>
)

export default ProfileCard
