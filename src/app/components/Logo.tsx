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
  /** If true, switches logo depending on Tailwind dark mode */
  themeAware?: boolean
}

/**
 * Logo
 * ------------------------------------------------------
 * Displays the brand logo.
 * - When `themeAware` is true → uses Tailwind `dark:` classes to show
 *   the appropriate logo depending on the active color mode.
 * - Otherwise, always shows the white logo (for dark or colored backgrounds).
 */
const Logo = ({
  className,
  widthClass = 'w-48',
  href = '/',
  themeAware = false,
}: LogoProps) => {
  return (
    <Link
      href={href}
      className={cn('flex items-center justify-center', className)}
    >
      <div className={cn('relative aspect-[3.67/1]', widthClass)}>
        {themeAware ? (
          <>
            {/* Shown in light mode */}
            <Image
              src="/img/huzzar-main-logo-dark.png"
              alt="Huzzar Logo Light"
              fill
              priority
              sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
              className="object-contain block dark:hidden transition-opacity duration-200"
            />
            {/* Shown in dark mode */}
            <Image
              src="/img/huzzar-main-logo-white.png"
              alt="Huzzar Logo Dark"
              fill
              priority
              sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
              className="object-contain hidden dark:block transition-opacity duration-200"
            />
          </>
        ) : (
          // Default (always white logo)
          <Image
            src="/img/huzzar-main-logo-white.png"
            alt="Huzzar Logo"
            fill
            priority
            sizes="(max-width: 640px) 10rem, (max-width: 1024px) 12rem, 14rem"
            className="object-contain transition-opacity duration-200"
          />
        )}
      </div>
    </Link>
  )
}

export default Logo
