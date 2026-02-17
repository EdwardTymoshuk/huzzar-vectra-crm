'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { UserStatus } from '@prisma/client'
import { FaLock, FaLockOpen } from 'react-icons/fa6'
import { MdDelete, MdEdit, MdMoreVert, MdRestore } from 'react-icons/md'

export type HrUserActionsProps = {
  userId: string
  status: UserStatus
  canArchiveDelete?: boolean
  onEdit: () => void
  onToggleStatus: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

/**
 * HrUserActionsDropdown
 * ------------------------------------------------------
 * Centralized user management actions for HR module.
 * Allows administrators to:
 * - edit user
 * - block / unblock
 * - archive
 * - restore
 * - permanently delete
 */
const HrUserActionsDropdown = ({
  status,
  canArchiveDelete = true,
  onEdit,
  onToggleStatus,
  onArchive,
  onRestore,
  onDelete,
}: HrUserActionsProps) => {
  const isArchived = status === 'DELETED'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User actions">
          <MdMoreVert />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-background border border-border shadow-md"
      >
        <DropdownMenuItem onClick={onEdit}>
          <MdEdit className="mr-2 h-4 w-4" />
          Edytuj
        </DropdownMenuItem>

        {!isArchived && (
          <>
            <DropdownMenuItem onClick={onToggleStatus}>
              {status === 'ACTIVE' ? (
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

            {canArchiveDelete && (
              <DropdownMenuItem onClick={onArchive}>
                <MdDelete className="mr-2 h-4 w-4" />
                Archiwizuj
              </DropdownMenuItem>
            )}
          </>
        )}

        {isArchived && canArchiveDelete && (
          <>
            <DropdownMenuItem onClick={onRestore}>
              <MdRestore className="mr-2 h-4 w-4" />
              Przywróć
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <MdDelete className="mr-2 h-4 w-4" />
              Usuń na stałe
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default HrUserActionsDropdown
