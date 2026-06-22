import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const THEMES = [
  { id: 'theme-purple', name: 'Purple', color: '#6c5ce7' },
  { id: 'theme-blue', name: 'Blue', color: '#3b82f6' },
  { id: 'theme-green', name: 'Green', color: '#10b981' },
  { id: 'theme-orange', name: 'Orange', color: '#f59e0b' },
  { id: 'theme-pink', name: 'Pink', color: '#ec4899' },
  { id: 'theme-teal', name: 'Teal', color: '#14b8a6' },
  { id: 'theme-red', name: 'Red', color: '#ef4444' },
]

const WALLPAPERS = [
  { id: 'wallpaper-none', name: 'None', icon: '▢' },
  { id: 'wallpaper-dots', name: 'Dots', icon: '⋯' },
  { id: 'wallpaper-stripes', name: 'Stripes', icon: '≡' },
  { id: 'wallpaper-grid', name: 'Grid', icon: '▣' },
  { id: 'wallpaper-glow-top', name: 'Glow Top', icon: '◜' },
  { id: 'wallpaper-glow-right', name: 'Glow Right', icon: '◝' },
  { id: 'wallpaper-glow-bottom', name: 'Glow Bottom', icon: '◟' },
]

export function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('alpha-theme') || 'theme-purple')
  const [wallpaper, setWallpaperState] = useState(() => localStorage.getItem('alpha-wallpaper') || 'wallpaper-none')

  useEffect(() => {
    document.body.classList.remove(...THEMES.map(t => t.id), ...WALLPAPERS.map(w => w.id))
    document.body.classList.add(theme, wallpaper)
    localStorage.setItem('alpha-theme', theme)
    localStorage.setItem('alpha-wallpaper', wallpaper)
  }, [theme, wallpaper])

  useEffect(() => {
    api.get('/users/settings').then(r => {
      if (r.data.theme) setThemeState(r.data.theme)
      if (r.data.wallpaper) setWallpaperState(r.data.wallpaper)
    }).catch(() => {})
  }, [])

  const setTheme = useCallback(async (t: string) => {
    setThemeState(t)
    await api.put('/users/settings', { theme: t }).catch(() => {})
  }, [])

  const setWallpaper = useCallback(async (w: string) => {
    setWallpaperState(w)
    await api.put('/users/settings', { wallpaper: w }).catch(() => {})
  }, [])

  return { theme, setTheme, wallpaper, setWallpaper, THEMES, WALLPAPERS }
}
