import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { CustomizationConfig } from '../types'
import { VIRTUAL_PROVIDERS } from '../data/aiModels'

export const THEMES = [
  { id: 'theme-purple', name: 'Purple', color: '#6c5ce7' },
  { id: 'theme-blue', name: 'Blue', color: '#3b82f6' },
  { id: 'theme-green', name: 'Green', color: '#10b981' },
  { id: 'theme-orange', name: 'Orange', color: '#f59e0b' },
  { id: 'theme-pink', name: 'Pink', color: '#ec4899' },
  { id: 'theme-teal', name: 'Teal', color: '#14b8a6' },
  { id: 'theme-red', name: 'Red', color: '#ef4444' },
  { id: 'theme-rose', name: 'Rose', color: '#f43f5e' },
  { id: 'theme-amber', name: 'Amber', color: '#d97706' },
  { id: 'theme-lime', name: 'Lime', color: '#65a30d' },
  { id: 'theme-emerald', name: 'Emerald', color: '#059669' },
  { id: 'theme-cyan', name: 'Cyan', color: '#06b6d4' },
  { id: 'theme-sky', name: 'Sky', color: '#0284c7' },
  { id: 'theme-indigo', name: 'Indigo', color: '#4f46e5' },
  { id: 'theme-violet', name: 'Violet', color: '#7c3aed' },
  { id: 'theme-fuchsia', name: 'Fuchsia', color: '#d946ef' },
  { id: 'theme-coral', name: 'Coral', color: '#ff6b6b' },
  { id: 'theme-turquoise', name: 'Turquoise', color: '#00d2d3' },
  { id: 'theme-sunset', name: 'Sunset', color: '#ff7675' },
  { id: 'theme-ocean', name: 'Ocean', color: '#0984e3' },
  { id: 'theme-forest', name: 'Forest', color: '#27ae60' },
  { id: 'theme-midnight', name: 'Midnight', color: '#2c3e50' },
  { id: 'theme-lavender', name: 'Lavender', color: '#a29bfe' },
  { id: 'theme-gold', name: 'Gold', color: '#b7950b' },
]

export const WALLPAPERS = [
  { id: 'wallpaper-none', name: 'None', icon: '▢' },
  { id: 'wallpaper-dots', name: 'Dots', icon: '⋯' },
  { id: 'wallpaper-stripes', name: 'Stripes', icon: '≡' },
  { id: 'wallpaper-grid', name: 'Grid', icon: '▣' },
  { id: 'wallpaper-glow-top', name: 'Glow Top', icon: '◜' },
  { id: 'wallpaper-glow-right', name: 'Glow Right', icon: '◝' },
  { id: 'wallpaper-glow-bottom', name: 'Glow Bottom', icon: '◟' },
  { id: 'wallpaper-glow-left', name: 'Glow Left', icon: '◞' },
  { id: 'wallpaper-glow-center', name: 'Glow Center', icon: '◉' },
  { id: 'wallpaper-glow-corner-tr', name: 'Glow TR', icon: '◥' },
  { id: 'wallpaper-glow-corner-bl', name: 'Glow BL', icon: '◣' },
  { id: 'wallpaper-waves', name: 'Waves', icon: '≈' },
  { id: 'wallpaper-hex', name: 'Hex', icon: '⬡' },
  { id: 'wallpaper-zigzag', name: 'Zigzag', icon: '⚡' },
  { id: 'wallpaper-circles', name: 'Circles', icon: '◎' },
  { id: 'wallpaper-cross', name: 'Cross', icon: '✚' },
  { id: 'wallpaper-diamond', name: 'Diamond', icon: '◇' },
  { id: 'wallpaper-bubbles', name: 'Bubbles', icon: '○' },
  { id: 'wallpaper-mesh', name: 'Mesh', icon: '▓' },
  { id: 'wallpaper-aurora', name: 'Aurora', icon: '🌌' },
  { id: 'wallpaper-sakura', name: 'Sakura', icon: '🌸' },
  { id: 'wallpaper-stars', name: 'Stars', icon: '★' },
  { id: 'wallpaper-rain', name: 'Rain', icon: '☔' },
  { id: 'wallpaper-mountain', name: 'Mountain', icon: '🏔️' },
  { id: 'wallpaper-ocean', name: 'Ocean', icon: '🌊' },
  { id: 'wallpaper-sunset', name: 'Sunset', icon: '🌅' },
  { id: 'wallpaper-forest', name: 'Forest', icon: '🌲' },
  { id: 'wallpaper-cosmos', name: 'Cosmos', icon: '🌌' },
  { id: 'wallpaper-cherry', name: 'Cherry', icon: '🌸' },
  { id: 'wallpaper-snow', name: 'Snow', icon: '❄️' },
  { id: 'wallpaper-fire', name: 'Fire', icon: '🔥' },
  { id: 'wallpaper-matrix-rain', name: 'Matrix Rain', icon: '🌧' },
  { id: 'wallpaper-circuit-board', name: 'Circuit Board', icon: '⚙' },
  { id: 'wallpaper-geometric', name: 'Geometric', icon: '🔷' },
  { id: 'wallpaper-honeycomb', name: 'Honeycomb', icon: '⬡' },
  { id: 'wallpaper-polka-dot', name: 'Polka Dot', icon: '●' },
  { id: 'wallpaper-plaid', name: 'Plaid', icon: '🏁' },
  { id: 'wallpaper-tartan', name: 'Tartan', icon: '🏴' },
  { id: 'wallpaper-camouflage', name: 'Camouflage', icon: '🟩' },
  { id: 'wallpaper-galaxy', name: 'Galaxy', icon: '🌌' },
  { id: 'wallpaper-nebula', name: 'Nebula', icon: '🌈' },
  { id: 'wallpaper-parchment', name: 'Parchment', icon: '📜' },
  { id: 'wallpaper-marble', name: 'Marble', icon: '◍' },
  { id: 'wallpaper-wood-texture', name: 'Wood Texture', icon: '🪵' },
  { id: 'wallpaper-brick-wall', name: 'Brick Wall', icon: '🧱' },
  { id: 'wallpaper-wave-grid', name: 'Wave Grid', icon: '〰' },
  { id: 'wallpaper-constellation', name: 'Constellation', icon: '✦' },
  { id: 'wallpaper-topographic', name: 'Topographic', icon: '◠' },
  { id: 'wallpaper-morse-code', name: 'Morse Code', icon: '▄' },
  { id: 'wallpaper-bar-code', name: 'Bar Code', icon: '▍' },
  { id: 'wallpaper-blue-print', name: 'Blue Print', icon: '📐' },
  { id: 'wallpaper-led-matrix', name: 'LED Matrix', icon: '🔲' },
  { id: 'wallpaper-pixel-heart', name: 'Pixel Heart', icon: '❤' },
]

const DEFAULT_CONFIG: CustomizationConfig = {
  darkMode: false,
  glassOpacity: 55,
  blurStrength: 20,
  borderRadius: 16,
  glowIntensity: 50,
  animationSpeed: 100,
  cardStyle: 'liquid',
  sidebarPosition: 'left',
  widgetDensity: 'normal',
  fontSize: 'medium',
  showLabels: true,
  showAnimations: true,
  wallpaperOpacity: 30,
  wallpaperBlend: 'overlay',
  bgGradientIntensity: 20,
  noiseOverlay: false,
  glassBorderOpacity: 50,
  glowSpread: 50,
  customWallpaper: '',
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('alpha-theme') || 'theme-purple')
  const [wallpaper, setWallpaperState] = useState(() => localStorage.getItem('alpha-wallpaper') || 'wallpaper-none')
  const [config, setConfigState] = useState<CustomizationConfig>(() => {
    try { return JSON.parse(localStorage.getItem('alpha-config') || 'null') || DEFAULT_CONFIG }
    catch { return DEFAULT_CONFIG }
  })
  const [providers, setProviders] = useState<any[]>([])

  useEffect(() => {
    api.get('/ai/providers').then(r => {
      const dp = r.data || []
      if (dp.length > 0) {
        setProviders(dp)
      } else {
        setProviders(VIRTUAL_PROVIDERS.map(vp => ({
          id: vp.id, name: vp.name, type: vp.type,
          api_url: vp.api_url, api_key: vp.api_key,
          default_model: vp.default_model, enabled: true,
        })))
      }
    }).catch(() => {
      setProviders(VIRTUAL_PROVIDERS.map(vp => ({
        id: vp.id, name: vp.name, type: vp.type,
        api_url: vp.api_url, api_key: vp.api_key,
        default_model: vp.default_model, enabled: true,
      })))
    })
  }, [])

  useEffect(() => {
    const allIds = [...THEMES.map(t => t.id), ...WALLPAPERS.map(w => w.id)]
    document.body.classList.remove(...allIds)
    document.body.classList.add(theme, wallpaper)
    document.body.classList.toggle('dark', config.darkMode)

    document.documentElement.style.setProperty('--glass-bg-opacity', String(config.glassOpacity / 100))
    document.documentElement.style.setProperty('--glass-blur', `${config.blurStrength}px`)
    document.documentElement.style.setProperty('--radius', `${config.borderRadius}px`)
    document.documentElement.style.setProperty('--radius-sm', `${Math.round(config.borderRadius * 0.6)}px`)
    document.documentElement.style.setProperty('--radius-lg', `${Math.round(config.borderRadius * 1.5)}px`)
    document.documentElement.style.setProperty('--radius-xl', `${Math.round(config.borderRadius * 2)}px`)

    const glowVal = config.glowIntensity / 100
    document.documentElement.style.setProperty('--glow-opacity', String(glowVal))

    const animSpeed = config.animationSpeed / 100
    document.documentElement.style.setProperty('--anim-speed', `${animSpeed}s`)
    document.documentElement.style.setProperty('--anim-speed-fast', `${animSpeed * 0.3}s`)

    document.documentElement.style.setProperty('--font-size-mult', config.fontSize === 'small' ? '0.9' : config.fontSize === 'large' ? '1.1' : '1')

    document.documentElement.style.setProperty('--wallpaper-opacity', String(config.wallpaperOpacity / 100))
    document.documentElement.style.setProperty('--wallpaper-blend', config.wallpaperBlend)
    document.documentElement.style.setProperty('--bg-gradient-intensity', String(config.bgGradientIntensity / 100))
    document.documentElement.style.setProperty('--glass-border-opacity', String(config.glassBorderOpacity / 100))
    document.documentElement.style.setProperty('--glow-spread', `${config.glowSpread}%`)

    if (config.noiseOverlay) {
      document.documentElement.style.setProperty('--noise-overlay', '1')
    } else {
      document.documentElement.style.setProperty('--noise-overlay', '0')
    }

    if (config.customWallpaper) {
      document.body.style.backgroundImage = `url(${config.customWallpaper})`
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundPosition = 'center'
      document.body.style.backgroundRepeat = 'no-repeat'
    } else {
      document.body.style.backgroundImage = ''
    }

    localStorage.setItem('alpha-theme', theme)
    localStorage.setItem('alpha-wallpaper', wallpaper)
    localStorage.setItem('alpha-config', JSON.stringify(config))
  }, [theme, wallpaper, config])

  useEffect(() => {
    api.get('/users/settings').then(r => {
      if (r.data.theme) setThemeState(r.data.theme)
      if (r.data.wallpaper) setWallpaperState(r.data.wallpaper)
      if (r.data.config) {
        try { setConfigState({ ...DEFAULT_CONFIG, ...JSON.parse(r.data.config) }) }
        catch {}
      }
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

  const updateConfig = useCallback(async (updates: Partial<CustomizationConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('alpha-config', JSON.stringify(next))
      api.put('/users/settings', { config: JSON.stringify(next) }).catch(() => {})
      return next
    })
  }, [])

  const toggleDarkMode = useCallback(() => {
    updateConfig({ darkMode: !config.darkMode })
  }, [config.darkMode, updateConfig])

  const uploadWallpaper = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/wallpaper/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await updateConfig({ customWallpaper: res.data.url })
  }, [updateConfig])

  return {
    theme, setTheme,
    wallpaper, setWallpaper,
    config, updateConfig,
    darkMode: config.darkMode,
    toggleDarkMode,
    providers,
    uploadWallpaper,
    THEMES, WALLPAPERS,
  }
}
