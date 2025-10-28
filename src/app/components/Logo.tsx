'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  /** Optional wrapper classes (applied to <Link>) */
  className?: string
  /** Optional image width (Tailwind class like 'w-32', 'w-56', etc.) */
  widthClass?: string
  /** Optional link href (default: '/') */
  href?: string
}

/**
 * Logo
 *
 * Responsive brand logo component.
 * - Maintains aspect ratio and scales via Tailwind width utilities.
 * - Supports external width override through `widthClass`.
 * - Automatically optimizes image loading with `priority`.
 */
const Logo = ({ className, widthClass = 'w-48', href = '/' }: LogoProps) => {
  return (
    <Link
      href={href}
      className={cn('flex items-center justify-center', className)}
    >
      <div className={cn('relative aspect-[3.67/1]', widthClass)}>
        <Image
          src="/img/huzzar-logo.png"
          alt="Huzzar Logo"
          fill
          priority
          sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
          className="object-contain"
        />
      </div>
    </Link>
  )
}

export default Logo
