'use client'

import clsx from 'clsx'
import Image from 'next/image'

type Props = {
  show: boolean
}

/**
 * Minimal floating logo loader (bottom-right).
 * - No blur, non-blocking (pointer-events: none)
 * - Subtle pulse animation on the logo
 */
const LoaderLogo = ({ show }: Props) => {
  return (
    <div
      className={clsx(
        'pointer-events-none fixed top-4 right-4 z-[1000] transition-opacity duration-150',
        show ? 'opacity-100' : 'opacity-0'
      )}
      aria-hidden={!show}
    >
      <div className="rounded-full border border-border bg-card shadow-md p-2 flex items-center justify-center">
        <Image
          src="/img/huzzar-logo.svg"
          width={40}
          height={40}
          alt="Loading"
          className="animate-pulse"
          priority
        />
      </div>
      {/* a11y helper */}
      <span className="sr-only">{show ? 'Loading' : ''}</span>
    </div>
  )
}

export default LoaderLogo
