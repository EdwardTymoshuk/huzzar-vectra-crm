'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { userStatusColorMap, userStatusNameMap } from '@/lib/constants'
import { User } from '@prisma/client'

type Props = {
  user: Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'phoneNumber'
    | 'role'
    | 'status'
    | 'identyficator'
  >
  open: boolean
  onClose: () => void
}

/**
 * SheetUserDetails:
 * - Displays detailed user info inside a side sheet.
 */
const SheetUserDetails = ({ user, open, onClose }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95%] md:max-w-md">
        <SheetHeader>
          <SheetTitle>{user.name}</SheetTitle>
        </SheetHeader>
        <div className="pt-6 space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Email:</span>{' '}
            <span className="font-medium">{user.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Telefon:</span>{' '}
            <span className="font-medium">{user.phoneNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rola:</span>{' '}
            <span className="font-medium">{user.role}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge className={userStatusColorMap[user.status]}>
              {userStatusNameMap[user.status]}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Identyfikator:</span>{' '}
            <span className="font-medium">{user.identyficator ?? 'Brak'}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SheetUserDetails
