'use client'

import { Switch } from '@/app/components/ui/switch'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { LuMoonStar, LuSunMedium } from 'react-icons/lu'

/**
 * ThemeToggle component
 *
 * This component renders a toggle switch that allows the user to change the theme
 * between light and dark modes. It uses the "next-themes" library to manage themes,
 * and "framer-motion" to animate the icons and the switch.
 */
const ThemeToggle = () => {
  // Get theme, resolvedTheme (actual applied theme), and setTheme function from next-themes
  const { resolvedTheme, setTheme } = useTheme()

  // Local state to track if the component has mounted (to prevent mismatches between SSR and client)
  const [mounted, setMounted] = useState(false)

  // Determine if the current theme is dark by checking resolvedTheme.
  // Using resolvedTheme ensures the actual theme is used, even if defaultTheme is set to 'system'.
  const isDark = resolvedTheme === 'dark'

  // Set the mounted flag to true when the component has been mounted on the client side.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent rendering on the server or before mounting, to avoid theme mismatch errors.
  if (!mounted) return null

  return (
    <div className="flex items-center space-x-3">
      {/* Sun Icon with entry animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <LuSunMedium
          className={`h-5 w-5 transition-colors ${
            isDark ? 'text-muted-foreground' : 'text-yellow-400'
          }`}
        />
      </motion.div>

      {/* Switch Button with animated movement */}
      <Switch
        // The switch is checked if the current theme is dark.
        checked={isDark}
        // When the switch value changes, set the theme accordingly.
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        className={`
          relative w-11 h-6 transition-all rounded-full
          ${
            isDark
              ? 'bg-primary hover:bg-primary-hover'
              : 'bg-warning hover:bg-secondary-hover'
          }
        `}
      >
        {/* Animated circle that moves to indicate the toggle state */}
        <motion.div
          className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform"
          initial={{ x: 0 }}
          animate={{ x: isDark ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        />
      </Switch>

      {/* Moon Icon with entry animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <LuMoonStar
          className={`h-5 w-5 transition-colors ${
            isDark ? 'text-indigo-800' : 'text-muted-foreground'
          }`}
        />
      </motion.div>
    </div>
  )
}

export default ThemeToggle
