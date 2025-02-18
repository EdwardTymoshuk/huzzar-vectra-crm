'use client'

import { Switch } from '@/app/components/ui/switch'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { LuMoonStar, LuSunMedium } from 'react-icons/lu'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center space-x-3">
      {/* Sun Icon */}
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

      {/* Switch Button with animated colors */}
      <Switch
        checked={isDark}
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
        <motion.div
          className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform"
          initial={{ x: 0 }}
          animate={{ x: isDark ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        />
      </Switch>

      {/* Moon Icon */}
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
