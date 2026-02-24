'use client'
import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { userRoleMap } from '@/lib/constants'
import { Role } from '@prisma/client'
import { MdEdit } from 'react-icons/md'
import ReadonlyRow from '../fields/ReadonlyRow'

type Props = {
  user: {
    name?: string
    email?: string
    phoneNumber?: string
    role?: Role
    identyficator?: number | null
  }
  onChangePass: () => void
}

const ProfileCard = ({ user, onChangePass }: Props) => (
  <Card className="w-full">
    <CardHeader className="pb-3">
      <CardTitle className="text-xl md:text-2xl text-primary">Moje dane</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <ReadonlyRow label="Imię i nazwisko" value={user.name ?? '—'} />
      <ReadonlyRow label="E-mail" value={user.email ?? '—'} />
      <ReadonlyRow label="Telefon" value={user.phoneNumber ?? '—'} />
      <ReadonlyRow
        label="Rola"
        value={user.role ? userRoleMap[user.role] : '—'}
      />
      <ReadonlyRow
        label="Nr identyfikator"
        value={user.identyficator?.toString() ?? '—'}
      />
      <div className="flex w-full justify-stretch sm:justify-end pt-1">
        <Button
          size="sm"
          variant="default"
          onClick={onChangePass}
          className="w-full sm:w-auto gap-1.5"
        >
          <MdEdit /> Zmień hasło
        </Button>
      </div>
    </CardContent>
  </Card>
)

export default ProfileCard
