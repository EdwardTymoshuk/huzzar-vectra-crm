'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Role, UserStatus } from '@prisma/client'
import { FaLock, FaLockOpen } from 'react-icons/fa6'
import {
  MdDelete,
  MdEdit,
  MdMoreVert,
  MdRestore,
  MdVisibility,
} from 'react-icons/md'

type Props = {
  user: {
    id: string
    name: string
    email: string
    phoneNumber: string
    role: Role
    status: UserStatus
    identyficator: number | null
  }
  onShowDetails: (user: Props['user']) => void
  onEdit: (user: Props['user']) => void
  onToggleStatus: (user: Props['user']) => void
  onArchive: (user: Props['user']) => void
  onRestore: (user: Props['user']) => void
  onDelete: (user: Props['user']) => void
}

/**
 * RowActionsDropdown:
 * - Renders user action menu depending on their status.
 * - Supports preview, edit, block/unblock, archive, restore, and permanent delete.
 */
const RowActionsDropdown = ({
  user,
  onShowDetails,
  onEdit,
  onToggleStatus,
  onArchive,
  onRestore,
  onDelete,
}: Props) => {
  const isArchived = user.status === 'INACTIVE'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Akcje">
          <MdMoreVert />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background text-foreground border border-border shadow-md cursor-pointer !bg-opacity-100 !backdrop-blur-none">
        <DropdownMenuItem onClick={() => onShowDetails(user)}>
          <MdVisibility className="mr-2 h-4 w-4" />
          Szczegóły
        </DropdownMenuItem>

        {!isArchived && (
          <>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <MdEdit className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onToggleStatus(user)}>
              {user.status === 'ACTIVE' ? (
                <>
                  <FaLock className="mr-2 h-4 w-4" />
                  Zablokuj
                </>
              ) : (
                <>
                  <FaLockOpen className="mr-2 h-4 w-4" />
                  Odblokuj
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onArchive(user)}>
              <MdDelete className="mr-2 h-4 w-4" />
              Archiwizuj
            </DropdownMenuItem>
          </>
        )}

        {isArchived && (
          <>
            <DropdownMenuItem onClick={() => onRestore(user)}>
              <MdRestore className="mr-2 h-4 w-4" />
              Przywróć
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onDelete(user)}>
              <MdDelete className="mr-2 h-4 w-4 text-red-500" />
              Usuń na stałe
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default RowActionsDropdown
