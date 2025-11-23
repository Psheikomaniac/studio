"use client"

import * as React from 'react'
import { Moon, Sun, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { ThemeMode, getStoredTheme, setTheme, subscribeSystemPreference, resolveEffectiveTheme } from '@/lib/theme'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [mode, setMode] = React.useState<ThemeMode>('system')
  const [effective, setEffective] = React.useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = getStoredTheme()
    if (stored) {
      setMode(stored)
    }
    setEffective(resolveEffectiveTheme(stored ?? 'system'))
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribeSystemPreference((isDark) => {
      setEffective(isDark ? 'dark' : 'light')
    })
    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    setTheme(mode)
    setEffective(resolveEffectiveTheme(mode))
  }, [mode, mounted])

  const icon = effective === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="justify-start gap-2 w-full" suppressHydrationWarning>
          {icon}
          <span className="text-sm">{t('theme.label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" /> {t('theme.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" /> {t('theme.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Laptop className="mr-2 h-4 w-4" /> {t('theme.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
