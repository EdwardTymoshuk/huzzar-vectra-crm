'use client'

import Link, { LinkProps } from 'next/link'
import { usePathname } from 'next/navigation'
import NProgress from 'nprogress'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import LoaderLogo from './LoaderLogo'

type Ctx = {
  navigating: boolean
  start: () => void
  done: () => void
}

const NavCtx = createContext<Ctx | null>(null)

/**
 * Global provider for navigation progress state.
 * - start(): immediately starts NProgress and shows the corner logo
 * - done(): stops NProgress and hides the corner logo
 * - automatically calls done() after the pathname changes
 */
export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [navigating, setNavigating] = useState(false)
  const pathname = usePathname()
  const lastPathRef = useRef(pathname)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    // avoid redundant state updates on rapid clicks
    setNavigating((prev) => prev || true)
    NProgress.start()

    // safety auto-timeout (15s) in case something hangs
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setNavigating(false)
      NProgress.done()
    }, 15000)
  }

  const done = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setNavigating(false)
    NProgress.done()
  }

  // When the pathname changes, consider navigation finished
  useEffect(() => {
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname
      // tiny delay to let the target page mount its own local loaders
      const id = setTimeout(done, 120)
      return () => clearTimeout(id)
    }
  }, [pathname])

  const value = useMemo<Ctx>(() => ({ navigating, start, done }), [navigating])
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}

/** Hook for manual control (e.g., around router.push) */
export const useNavProgress = () => {
  const ctx = useContext(NavCtx)
  if (!ctx)
    throw new Error(
      'useNavProgress must be used within NavigationProgressProvider'
    )
  return ctx
}

/** Global corner loader; render once at the app layout level */
export function GlobalRouteLoader() {
  const { navigating } = useNavProgress()
  return <LoaderLogo show={navigating} />
}

/**
 * NavLink — drop-in replacement for Next <Link/>:
 * - starts NProgress on click
 * - ignores new-tab interactions (ctrl/cmd/middle click, target="_blank")
 */
type NavLinkProps = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>

export function NavLink({ onClick, href, target, ...rest }: NavLinkProps) {
  const { start } = useNavProgress()

  return (
    <Link
      href={href}
      target={target}
      {...rest}
      onClick={(e) => {
        const before = e.defaultPrevented
        onClick?.(e)
        if (before || e.defaultPrevented) return

        const isNewTab =
          target === '_blank' ||
          e.metaKey || // mac
          e.ctrlKey || // win/linux
          e.shiftKey ||
          e.button === 1

        if (!isNewTab) start()
      }}
    />
  )
}
