'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'
import { CgProfile } from 'react-icons/cg'
import { CiLogout } from 'react-icons/ci'

const UserDropdown = () => {
  const { data: session } = useSession()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          className="flex items-center bg-primary text-primary-foreground rounded-full px-3 py-2 hover:bg-primary-hover transition"
        >
          <CgProfile size={30} />
          <span className="ml-3 text-sm font-medium max-w-[120px] truncate break-words whitespace-normal">
            {session?.user.name || session?.user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 bg-background border-border rounded-xl">
        {/* <DropdownMenuItem asChild>
          <a
            href="/profile"
            className="w-full font-semibold cursor-pointer rounded-t-md"
          >
            Mój profil
          </a>
        </DropdownMenuItem> */}
        <DropdownMenuItem
          className="text-danger hover:text-danger focus:text-danger cursor-pointer rounded-b-md"
          onClick={() => signOut()}
        >
          <CiLogout /> Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserDropdown
