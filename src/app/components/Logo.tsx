'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

type LogoProps = {
  className?: string
}

const Logo = ({ className }: LogoProps) => {
  return (
    <Link
      href="/"
      className={cn('flex items-center mx-auto md:mx-0', className)}
    >
      <Image
        src="/img/huzzar-logo.png"
        alt="Huzzar Logo"
        width={220}
        height={60}
        priority
      />
    </Link>
  )
}

export default Logo
