'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  /** Optional wrapper classes */
  className?: string
  /** Optional image width (Tailwind class like 'w-32', 'w-56', etc.) */
  widthClass?: string
  /** Optional link href (default: '/') */
  href?: string
  /** If true, switches logo depending on Tailwind dark mode */
  themeAware?: boolean
  /** If true, logo is rendered without a Link wrapper */
  disableLink?: boolean
}

/**
 * Logo
 * ------------------------------------------------------
 * Displays the brand logo.
 * - Supports light/dark variants via Tailwind dark mode
 * - Can be rendered with or without navigation link
 */
const Logo = ({
  className,
  widthClass = 'w-48',
  href = '/',
  themeAware = false,
  disableLink = false,
}: LogoProps) => {
  const logoContent = (
    <div className={cn('relative aspect-[3.67/1]', widthClass)}>
      {themeAware ? (
        <>
          {/* Light mode */}
          <Image
            src="/img/huzzar-main-logo-dark.png"
            alt="Huzzar Logo"
            fill
            priority
            sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
            className="object-contain block dark:hidden transition-opacity duration-200"
          />

          {/* Dark mode */}
          <Image
            src="/img/huzzar-main-logo-light.png"
            alt="Huzzar Logo"
            fill
            priority
            sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
            className="object-contain hidden dark:block transition-opacity duration-200"
          />
        </>
      ) : (
        <Image
          src="/img/huzzar-main-logo-light.png"
          alt="Huzzar Logo"
          fill
          priority
          sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
          className="object-contain transition-opacity duration-200"
        />
      )}
    </div>
  )

  if (disableLink) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        {logoContent}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn('flex items-center justify-center', className)}
    >
      {logoContent}
    </Link>
  )
}

export default Logo
