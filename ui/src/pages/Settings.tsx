import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Settings as SettingsIcon, User, Palette,
  Server, Globe, Sun, Moon, LogOut, Save, Brain,
  Image, Wifi, WifiOff, RefreshCw,
  Check, X, Loader, Zap, Archive, Upload,
  Trash2, FileText, Download, Sliders,
  Type, Layers, Layout, Eye, Mouse, Pen,
  Square, Circle, Move, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Hash, Percent, Gauge, Grid, Columns,
  Bell, Volume2, VolumeX, Languages, Clock, Thermometer,
  DollarSign, Navigation, Tablet, Smartphone,
  Monitor, Sparkles, Droplets, SunDim, Pointer,
  Highlighter, Link, Heading, AlignJustify,
  ImageIcon, Wind, Play, Table, Tags,
  MessageSquare, FolderOpen, Minus, PanelTop,
  Scroll, TextCursor, Palette as PaletteIcon,
  Orbit, Command, ChevronRight, ChevronLeft,
  Maximize2, Minimize2, Search, Filter,
  Star, Heart, Flag, Globe2, EyeOff,
  Repeat, Timer, RotateCcw, MoveHorizontal,
  Frame, Crop, Eraser, Ruler, PaintBucket,
  Paintbrush, Shuffle, FastForward, Rewind,
  SkipForward, SkipBack, Copy, Scissors,
  Codepen, Figma, Chrome, Activity
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme, THEMES, WALLPAPERS } from '../hooks/useTheme'

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'customization', label: 'Customization', icon: Sliders },
  { id: 'network', label: 'Network', icon: Wifi },
  { id: 'system', label: 'System', icon: Server },
  { id: 'backup', label: 'Backup', icon: Archive },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'remote', label: 'Remote', icon: Globe },
] as const

type TabId = typeof SETTINGS_TABS[number]['id']

interface WidgetSetting {
  visible: boolean
  refresh: number
}

interface CustomizationSettings {
  font: { size: number; family: string; weight: number; lineHeight: number; paragraphSpacing: number }
  border: { radius: number }
  animation: { speed: string; reduceMotion: boolean; parallax: boolean; hoverEffects: boolean; transitionSpeed: number }
  card: { style: string }
  layout: { density: string; sidebarLabels: boolean; statusBar: boolean; navPosition: string }
  icons: { style: string }
  notifications: { position: string; sound: boolean }
  refresh: { interval: string }
  language: { locale: string; dateFormat: string; firstDayOfWeek: string }
  units: { temperature: string; speed: string; currency: string; numberFormat: string }
  dashboard: { widgets: Record<string, WidgetSetting> }
  customCSS: string
  background: { effects: string; glassIntensity: string; blur: number; shadowIntensity: string }
  components: { buttonStyle: string; inputStyle: string; scrollbarStyle: string; cursorStyle: string; selectionColor: string; linkColor: string }
  tables: { style: string }
  tags: { style: string }
  modals: { animation: string }
  toasts: { style: string }
  emptyStates: { style: string }
  panels: { style: string }
  separators: { style: string }
  media: { imageLazyLoading: boolean }
}

const DEFAULT_WIDGETS: Record<string, WidgetSetting> = {
  cpu: { visible: true, refresh: 5 },
  memory: { visible: true, refresh: 5 },
  storage: { visible: true, refresh: 10 },
  network: { visible: true, refresh: 10 },
  ai: { visible: true, refresh: 30 },
  devices: { visible: true, refresh: 30 },
  services: { visible: true, refresh: 30 },
  alerts: { visible: true, refresh: 15 },
  processes: { visible: false, refresh: 10 },
  systemInfo: { visible: true, refresh: 30 },
}

const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  font: { size: 14, family: 'system', weight: 600, lineHeight: 1.5, paragraphSpacing: 16 },
  border: { radius: 12 },
  animation: { speed: 'normal', reduceMotion: false, parallax: true, hoverEffects: true, transitionSpeed: 300 },
  card: { style: 'glass' },
  layout: { density: 'comfortable', sidebarLabels: true, statusBar: true, navPosition: 'side' },
  icons: { style: 'outline' },
  notifications: { position: 'top-right', sound: true },
  refresh: { interval: 'off' },
  language: { locale: 'en', dateFormat: '12h', firstDayOfWeek: 'monday' },
  units: { temperature: 'celsius', speed: 'metric', currency: 'USD', numberFormat: 'comma-dot' },
  dashboard: { widgets: { ...DEFAULT_WIDGETS } },
  customCSS: '',
  background: { effects: 'none', glassIntensity: 'medium', blur: 10, shadowIntensity: 'medium' },
  components: { buttonStyle: 'rounded', inputStyle: 'outlined', scrollbarStyle: 'default', cursorStyle: 'default', selectionColor: '#6c5ce7', linkColor: '#3b82f6' },
  tables: { style: 'striped' },
  tags: { style: 'rounded' },
  modals: { animation: 'fade' },
  toasts: { style: 'standard' },
  emptyStates: { style: 'illustration' },
  panels: { style: 'card' },
  separators: { style: 'line' },
  media: { imageLazyLoading: true },
}

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'fil', name: 'Filipino', native: 'Filipino' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'ca', name: 'Catalan', native: 'Català' },
  { code: 'eu', name: 'Basque', native: 'Euskara' },
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'mt', name: 'Maltese', native: 'Malti' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'mk', name: 'Macedonian', native: 'Македонски' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
  { code: 'kk', name: 'Kazakh', native: 'Қазақ' },
  { code: 'uz', name: 'Uzbek', native: 'Oʻzbek' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'mi', name: 'Maori', native: 'Māori' },
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  { code: 'gd', name: 'Scottish Gaelic', native: 'Gàidhlig' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
  { code: 'fy', name: 'Frisian', native: 'Frysk' },
]

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
]

function cardStyle() {
  return {
    padding: 20, borderRadius: 12,
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(8px)'
  }
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme, wallpaper, setWallpaper, config, updateConfig, toggleDarkMode } = useTheme()
  const [tab, setTab] = useState<TabId>('profile')
  const [email, setEmail] = useState(user?.email || '')
  const [saved, setSaved] = useState(false)
  const [profileErr, setProfileErr] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const saveProfile = async () => {
    setProfileLoading(true); setProfileErr('')
    try {
      await api.put('/users/settings', { email })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setProfileErr(e.response?.data?.error || 'Failed to save profile')
    }
    setProfileLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {SETTINGS_TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card-liquid" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 700, color: 'white'
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.username}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role} account</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} style={{ maxWidth: 400 }} />
            </div>
          </div>
          {profileErr && (
            <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
              {profileErr}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={profileLoading}>
              {profileLoading ? <Loader size={14} className="spin" /> : <Save size={14} />}
              {' '}{saved ? 'Saved!' : profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card-liquid" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sun size={16} /> Theme Mode
            </h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => updateConfig({ darkMode: false })}
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 12,
                  border: !config.darkMode ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
                  background: !config.darkMode ? 'var(--accent-dim)' : 'var(--glass-bg)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
                }}>
                <Sun size={18} style={{ color: !config.darkMode ? 'var(--accent)' : 'var(--text-muted)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: !config.darkMode ? 'var(--accent)' : 'var(--text-primary)' }}>Light</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Bright & clean</div>
                </div>
              </button>
              <button onClick={() => updateConfig({ darkMode: true })}
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 12,
                  border: config.darkMode ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
                  background: config.darkMode ? 'var(--accent-dim)' : 'var(--glass-bg)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
                }}>
                <Moon size={18} style={{ color: config.darkMode ? 'var(--accent)' : 'var(--text-muted)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: config.darkMode ? 'var(--accent)' : 'var(--text-primary)' }}>Dark</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Easy on the eyes</div>
                </div>
              </button>
            </div>
          </div>

          <div className="card-liquid" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} /> Accent Color
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: theme === t.id ? '2px solid var(--text-primary)' : '2px solid transparent',
                    background: t.color, cursor: 'pointer', transition: 'all 0.2s',
                    transform: theme === t.id ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: theme === t.id ? `0 0 16px ${t.color}66` : 'none',
                    position: 'relative'
                  }}
                  title={t.name}
                >
                  {theme === t.id && (
                    <Check size={14} color="white" style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card-liquid" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image size={16} /> Wallpaper Patterns
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {WALLPAPERS.map(w => {
                const active = wallpaper === w.id
                return (
                  <button key={w.id} onClick={() => setWallpaper(w.id)}
                    style={{
                      padding: '14px 4px', borderRadius: 10, fontSize: 20,
                      border: active ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
                      background: active ? 'var(--accent-dim)' : 'var(--glass-bg)',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                    }}
                    title={w.name}>
                    <span>{w.icon}</span>
                    <span style={{ fontSize: 10, color: active ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                      {w.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card-liquid" style={{ padding: 20, textAlign: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Sliders size={16} /> Live Preview
            </h3>
            <div style={{
              padding: 24, borderRadius: 12,
              background: 'var(--bg-primary)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--accent)', margin: '0 auto 12px',
                boxShadow: `0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent)`
              }} />
              <div style={{ fontWeight: 600, fontSize: 16 }}>Preview Card</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
                This is how your accent color looks
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--warning)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--danger)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'customization' && <CustomizationTab />}
      {tab === 'network' && <NetworkTab />}
      {tab === 'system' && <SystemTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'ai' && <AITab />}
      {tab === 'remote' && <RemoteTab />}
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <Icon size={16} /> {title}
      </h3>
      {children}
    </div>
  )
}

function SliderField({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{value}{unit || ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
    </div>
  )
}

function ToggleField({ label, value, onChange, desc }: {
  label: string; value: boolean; onChange: (v: boolean) => void; desc?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none',
          background: value ? 'var(--accent)' : 'var(--glass-border)',
          cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0
        }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 2, transition: 'all 0.2s',
          left: value ? 20 : 2
        }} />
      </button>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: 'var(--glass-bg)', color: 'var(--text-primary)',
          border: '1px solid var(--glass-border)', fontFamily: 'inherit',
          fontSize: 13, cursor: 'pointer'
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function RadioGroup({ label, value, options, onChange, columns }: {
  label: string; value: string; options: { value: string; label: string; icon?: string }[];
  onChange: (v: string) => void; columns?: number
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns || options.length}, 1fr)`, gap: 6 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              padding: '8px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              border: value === o.value ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
              background: value === o.value ? 'var(--accent-dim)' : 'var(--glass-bg)',
              color: value === o.value ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: value === o.value ? 600 : 400, fontFamily: 'inherit',
              transition: 'all 0.15s', textAlign: 'center'
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--glass-border)', padding: 2, cursor: 'pointer', background: 'none' }} />
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 90, padding: '6px 8px', borderRadius: 6, fontSize: 12, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontFamily: 'monospace' }} />
    </div>
  )
}

function CustomizationTab() {
  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULT_CUSTOMIZATION)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    setLoading(true); setLoadErr('')
    api.get('/users/settings').then(r => {
      if (r.data.customization) {
        try {
          const c = typeof r.data.customization === 'string' ? JSON.parse(r.data.customization) : r.data.customization
          setSettings(prev => deepMerge(prev, c))
        } catch { setLoadErr('Failed to parse saved customization') }
      }
    }).catch((e: any) => {
      setLoadErr(e.response?.data?.error || 'Failed to load customization')
    }).finally(() => setLoading(false))
  }, [])

  const deepMerge = (target: any, source: any): any => {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  const update = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let obj: any = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  const saveCustomization = async () => {
    setSaving(true); setError('')
    try {
      await api.put('/users/settings', { customization: JSON.stringify(settings) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save customization')
    }
    setSaving(false)
  }

  const updateWidget = (id: string, field: 'visible' | 'refresh', value: boolean | number) => {
    setSettings(prev => {
      const next = structuredClone(prev)
      if (field === 'visible') next.dashboard.widgets[id].visible = value as boolean
      else next.dashboard.widgets[id].refresh = value as number
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader size={24} className="spin" style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading customization...</span>
        </div>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div style={{ padding: '20px', borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><X size={16} /> {loadErr}</div>
        <button className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  const s = settings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* TYPOGRAPHY */}
      <SectionCard icon={Type} title="Typography">
        <SliderField label="Font Size" value={s.font.size} min={10} max={24} onChange={v => update('font.size', v)} unit="px" />
        <SelectField label="Font Family" value={s.font.family} onChange={v => update('font.family', v)}
          options={[
            { value: 'system', label: 'System UI' },
            { value: 'monospace', label: 'Monospace' },
            { value: 'serif', label: 'Serif' },
            { value: 'sans-serif', label: 'Sans-Serif' },
          ]} />
        <SliderField label="Heading Font Weight" value={s.font.weight} min={300} max={900} step={100} onChange={v => update('font.weight', v)} />
        <SliderField label="Line Height" value={s.font.lineHeight} min={1.2} max={2.0} step={0.1} onChange={v => update('font.lineHeight', v)} />
        <SliderField label="Paragraph Spacing" value={s.font.paragraphSpacing} min={0} max={32} onChange={v => update('font.paragraphSpacing', v)} unit="px" />
      </SectionCard>

      {/* LAYOUT */}
      <SectionCard icon={Layout} title="Layout">
        <RadioGroup label="Layout Density" value={s.layout.density} onChange={v => update('layout.density', v)}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]} />
        <RadioGroup label="Navigation Position" value={s.layout.navPosition} onChange={v => update('layout.navPosition', v)}
          options={[{ value: 'top', label: 'Top' }, { value: 'side', label: 'Side' }, { value: 'bottom', label: 'Bottom' }]} />
        <ToggleField label="Show Sidebar Labels" value={s.layout.sidebarLabels} onChange={v => update('layout.sidebarLabels', v)} desc="Display text labels alongside navigation icons" />
        <ToggleField label="Show Status Bar" value={s.layout.statusBar} onChange={v => update('layout.statusBar', v)} desc="Show system status bar at bottom" />
      </SectionCard>

      {/* STYLE */}
      <SectionCard icon={PaintBucket} title="Style">
        <RadioGroup label="Card Style" value={s.card.style} onChange={v => update('card.style', v)}
          options={[{ value: 'glass', label: 'Glass' }, { value: 'solid', label: 'Solid' }, { value: 'border-only', label: 'Border' }, { value: 'minimal', label: 'Minimal' }]} columns={4} />
        <SliderField label="Border Radius" value={s.border.radius} min={4} max={24} onChange={v => update('border.radius', v)} unit="px" />
        <RadioGroup label="Button Style" value={s.components.buttonStyle} onChange={v => update('components.buttonStyle', v)}
          options={[{ value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }, { value: 'pill', label: 'Pill' }, { value: 'minimal', label: 'Minimal' }]} columns={4} />
        <RadioGroup label="Input Style" value={s.components.inputStyle} onChange={v => update('components.inputStyle', v)}
          options={[{ value: 'outlined', label: 'Outlined' }, { value: 'filled', label: 'Filled' }, { value: 'underlined', label: 'Underlined' }, { value: 'minimal', label: 'Minimal' }]} columns={4} />
        <RadioGroup label="Panel Style" value={s.panels.style} onChange={v => update('panels.style', v)}
          options={[{ value: 'card', label: 'Card' }, { value: 'flat', label: 'Flat' }, { value: 'bordered', label: 'Bordered' }, { value: 'elevated', label: 'Elevated' }]} columns={4} />
        <RadioGroup label="Separator Style" value={s.separators.style} onChange={v => update('separators.style', v)}
          options={[{ value: 'line', label: 'Line' }, { value: 'gradient', label: 'Gradient' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'icon', label: 'Icon' }]} columns={5} />
      </SectionCard>

      {/* ICONS & MEDIA */}
      <SectionCard icon={ImageIcon} title="Icons & Media">
        <RadioGroup label="Icon Style" value={s.icons.style} onChange={v => update('icons.style', v)}
          options={[{ value: 'outline', label: 'Outline' }, { value: 'filled', label: 'Filled' }, { value: 'duotone', label: 'Duotone' }]} />
        <ToggleField label="Image Lazy Loading" value={s.media.imageLazyLoading} onChange={v => update('media.imageLazyLoading', v)} desc="Defer loading offscreen images" />
      </SectionCard>

      {/* ANIMATION */}
      <SectionCard icon={Wind} title="Animation">
        <RadioGroup label="Animation Speed" value={s.animation.speed} onChange={v => update('animation.speed', v)}
          options={[{ value: 'none', label: 'None' }, { value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }]} columns={4} />
        <SliderField label="Transition Speed" value={s.animation.transitionSpeed} min={100} max={1000} step={50} onChange={v => update('animation.transitionSpeed', v)} unit="ms" />
        <ToggleField label="Reduce Motion" value={s.animation.reduceMotion} onChange={v => update('animation.reduceMotion', v)} desc="Minimize animations and transitions" />
        <ToggleField label="Parallax Effects" value={s.animation.parallax} onChange={v => update('animation.parallax', v)} desc="Depth-based parallax scrolling" />
        <ToggleField label="Hover Effects" value={s.animation.hoverEffects} onChange={v => update('animation.hoverEffects', v)} desc="Interactive hover animations" />
      </SectionCard>

      {/* COMPONENTS */}
      <SectionCard icon={Layers} title="Components">
        <RadioGroup label="Table Style" value={s.tables.style} onChange={v => update('tables.style', v)}
          options={[{ value: 'striped', label: 'Striped' }, { value: 'bordered', label: 'Bordered' }, { value: 'compact', label: 'Compact' }, { value: 'hover', label: 'Hover' }]} columns={4} />
        <RadioGroup label="Tag / Chip Style" value={s.tags.style} onChange={v => update('tags.style', v)}
          options={[{ value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }, { value: 'outlined', label: 'Outlined' }, { value: 'filled', label: 'Filled' }]} columns={4} />
        <RadioGroup label="Modal Animation" value={s.modals.animation} onChange={v => update('modals.animation', v)}
          options={[{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'slide-up', label: 'Slide Up' }, { value: 'scale', label: 'Scale' }, { value: 'flip', label: 'Flip' }]} columns={5} />
        <RadioGroup label="Toast Style" value={s.toasts.style} onChange={v => update('toasts.style', v)}
          options={[{ value: 'standard', label: 'Standard' }, { value: 'modern', label: 'Modern' }, { value: 'minimalist', label: 'Minimal' }, { value: 'compact', label: 'Compact' }]} columns={4} />
        <RadioGroup label="Empty State Style" value={s.emptyStates.style} onChange={v => update('emptyStates.style', v)}
          options={[{ value: 'illustration', label: 'Illustration' }, { value: 'simple', label: 'Simple' }, { value: 'minimal', label: 'Minimal' }]} />
      </SectionCard>

      {/* SCROLLBAR & CURSOR */}
      <SectionCard icon={Scroll} title="Scrollbar & Cursor">
        <RadioGroup label="Scrollbar Style" value={s.components.scrollbarStyle} onChange={v => update('components.scrollbarStyle', v)}
          options={[{ value: 'default', label: 'Default' }, { value: 'thin', label: 'Thin' }, { value: 'hidden', label: 'Hidden' }, { value: 'custom', label: 'Custom' }]} columns={4} />
        <RadioGroup label="Cursor Style" value={s.components.cursorStyle} onChange={v => update('components.cursorStyle', v)}
          options={[{ value: 'default', label: 'Default' }, { value: 'pointer', label: 'Pointer' }, { value: 'crosshair', label: 'Crosshair' }, { value: 'text', label: 'Text' }]} columns={4} />
      </SectionCard>

      {/* COLORS */}
      <SectionCard icon={PaletteIcon} title="Colors">
        <ColorField label="Selection Color" value={s.components.selectionColor} onChange={v => update('components.selectionColor', v)} />
        <ColorField label="Link Color" value={s.components.linkColor} onChange={v => update('components.linkColor', v)} />
      </SectionCard>

      {/* BACKGROUND EFFECTS */}
      <SectionCard icon={Sparkles} title="Background Effects">
        <RadioGroup label="Background Effects" value={s.background.effects} onChange={v => update('background.effects', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'particles', label: 'Particles' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'stars', label: 'Stars' },
            { value: 'matrix', label: 'Matrix' },
          ]} columns={5} />
        <RadioGroup label="Glass Effect Intensity" value={s.background.glassIntensity} onChange={v => update('background.glassIntensity', v)}
          options={[{ value: 'subtle', label: 'Subtle' }, { value: 'medium', label: 'Medium' }, { value: 'strong', label: 'Strong' }]} />
        <SliderField label="Blur Amount" value={s.background.blur} min={0} max={20} onChange={v => update('background.blur', v)} unit="px" />
        <RadioGroup label="Shadow Intensity" value={s.background.shadowIntensity} onChange={v => update('background.shadowIntensity', v)}
          options={[{ value: 'none', label: 'None' }, { value: 'subtle', label: 'Subtle' }, { value: 'medium', label: 'Medium' }, { value: 'strong', label: 'Strong' }]} columns={4} />
      </SectionCard>

      {/* NOTIFICATIONS */}
      <SectionCard icon={Bell} title="Notifications">
        <RadioGroup label="Notification Position" value={s.notifications.position} onChange={v => update('notifications.position', v)}
          options={[
            { value: 'top-right', label: 'Top Right' },
            { value: 'top-left', label: 'Top Left' },
            { value: 'bottom-right', label: 'Bottom Right' },
            { value: 'bottom-left', label: 'Bottom Left' },
          ]} columns={4} />
        <ToggleField label="Sound Effects" value={s.notifications.sound} onChange={v => update('notifications.sound', v)} desc="Play sounds for notifications" />
      </SectionCard>

      {/* AUTO-REFRESH */}
      <SectionCard icon={RotateCcw} title="Auto-Refresh">
        <SelectField label="Auto-Refresh Interval" value={s.refresh.interval} onChange={v => update('refresh.interval', v)}
          options={[
            { value: 'off', label: 'Off' },
            { value: '10s', label: 'Every 10 seconds' },
            { value: '30s', label: 'Every 30 seconds' },
            { value: '60s', label: 'Every 60 seconds' },
            { value: '5m', label: 'Every 5 minutes' },
          ]} />
      </SectionCard>

      {/* DASHBOARD WIDGETS */}
      <SectionCard icon={Grid} title="Dashboard Widgets">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Show or hide individual widgets and set their refresh intervals</div>
        {Object.entries(s.dashboard.widgets).map(([id, w]) => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', marginBottom: 6, borderRadius: 8,
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)'
          }}>
            <button onClick={() => updateWidget(id, 'visible', !w.visible)}
              style={{
                width: 34, height: 22, borderRadius: 11, border: 'none',
                background: w.visible ? 'var(--accent)' : 'var(--glass-border)',
                cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2, transition: 'all 0.2s',
                left: w.visible ? 14 : 2
              }} />
            </button>
            <span style={{ flex: 1, fontSize: 13, textTransform: 'capitalize' }}>{id.replace(/([A-Z])/g, ' $1').trim()}</span>
            <select value={w.refresh} onChange={e => updateWidget(id, 'refresh', Number(e.target.value))}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 11,
                background: 'var(--glass-bg)', color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)', fontFamily: 'inherit',
                cursor: 'pointer'
              }}>
              {[2, 5, 10, 15, 30, 60].map(n => (
                <option key={n} value={n}>{n}s</option>
              ))}
            </select>
          </div>
        ))}
      </SectionCard>

      {/* REGIONAL */}
      <SectionCard icon={Globe2} title="Regional">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <SelectField label="Language" value={s.language.locale} onChange={v => update('language.locale', v)}
            options={LANGUAGES.map(l => ({ value: l.code, label: `${l.native} (${l.name})` }))} />
          <SelectField label="Date Format" value={s.language.dateFormat} onChange={v => update('language.dateFormat', v)}
            options={[
              { value: '12h', label: '12-hour (1:00 PM)' },
              { value: '24h', label: '24-hour (13:00)' },
              { value: 'relative', label: 'Relative (2m ago)' },
            ]} />
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <SelectField label="First Day of Week" value={s.language.firstDayOfWeek} onChange={v => update('language.firstDayOfWeek', v)}
            options={[
              { value: 'monday', label: 'Monday' },
              { value: 'sunday', label: 'Sunday' },
              { value: 'saturday', label: 'Saturday' },
            ]} />
          <SelectField label="Temperature Unit" value={s.units.temperature} onChange={v => update('units.temperature', v)}
            options={[
              { value: 'celsius', label: 'Celsius (°C)' },
              { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
              { value: 'kelvin', label: 'Kelvin (K)' },
            ]} />
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <SelectField label="Speed Unit" value={s.units.speed} onChange={v => update('units.speed', v)}
            options={[
              { value: 'metric', label: 'Metric (km/h)' },
              { value: 'imperial', label: 'Imperial (mph)' },
            ]} />
          <SelectField label="Number Format" value={s.units.numberFormat} onChange={v => update('units.numberFormat', v)}
            options={[
              { value: 'comma-dot', label: '1,000.00' },
              { value: 'dot-comma', label: '1.000,00' },
              { value: 'space-comma', label: '1 000,00' },
            ]} />
        </div>
        <SelectField label="Currency Display" value={s.units.currency} onChange={v => update('units.currency', v)}
          options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} - ${c.name} (${c.code})` }))} />
      </SectionCard>

      {/* CUSTOM CSS */}
      <SectionCard icon={Codepen} title="Custom CSS">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Inject custom CSS to override any styles. Use at your own risk.</div>
        <textarea value={s.customCSS} onChange={e => update('customCSS', e.target.value)}
          placeholder="/* Enter custom CSS here */\nbody { background: red; }"
          style={{
            width: '100%', minHeight: 120, padding: 12, borderRadius: 8,
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--glass-border)', fontFamily: 'monospace',
            fontSize: 12, resize: 'vertical', lineHeight: 1.5
          }} />
      </SectionCard>

      {/* SAVE */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0' }}>
        <button className="btn btn-primary" onClick={saveCustomization} disabled={saving}>
          {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
          {' '}{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Customization'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setSettings(DEFAULT_CUSTOMIZATION) }}>
          <RefreshCw size={14} /> Reset to Defaults
        </button>
      </div>
    </div>
  )
}

function NetworkTab() {
  const [wifiStatus, setWifiStatus] = useState<any>(null)
  const [networks, setNetworks] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectSsid, setConnectSsid] = useState('')
  const [connectPass, setConnectPass] = useState('')
  const [wifiMsg, setWifiMsg] = useState('')
  const [wifiErr, setWifiErr] = useState('')
  const [hotspotSsid, setHotspotSsid] = useState('ALPHA-Setup')
  const [hotspotPass, setHotspotPass] = useState('alphasetup')
  const [hotspotBusy, setHotspotBusy] = useState(false)

  useEffect(() => { loadWifiStatus() }, [])

  const loadWifiStatus = async () => {
    setWifiErr('')
    try { setWifiStatus((await api.get('/wifi/status')).data) }
    catch (e: any) { setWifiErr(e.response?.data?.error || 'Failed to load WiFi status') }
  }

  const scanNetworks = async () => {
    setScanning(true); setWifiMsg('')
    try { setNetworks((await api.get('/wifi/scan')).data.networks || []) }
    catch { setWifiMsg('Scan failed') }
    setScanning(false)
  }

  const connectToNetwork = async () => {
    if (!connectSsid) return
    setConnecting(true); setWifiMsg('')
    try {
      await api.post('/wifi/connect', { ssid: connectSsid, password: connectPass })
      setWifiMsg(`Connected to ${connectSsid}`); setConnectSsid(''); setConnectPass('')
      setTimeout(loadWifiStatus, 3000)
    } catch { setWifiMsg('Connection failed') }
    setConnecting(false)
  }

  const enableHotspot = async () => {
    setHotspotBusy(true); setWifiMsg('')
    try {
      const r = await api.post('/wifi/hotspot/on', { ssid: hotspotSsid, password: hotspotPass })
      setWifiMsg(`Hotspot "${r.data.ssid}" active`)
      setTimeout(loadWifiStatus, 3000)
    } catch { setWifiMsg('Hotspot failed') }
    setHotspotBusy(false)
  }

  const disableHotspot = async () => {
    setHotspotBusy(true)
    try { await api.post('/wifi/hotspot/off'); setWifiMsg('Hotspot stopped'); setTimeout(loadWifiStatus, 3000) }
    catch { setWifiMsg('Failed to stop hotspot') }
    setHotspotBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {wifiErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {wifiErr}
        </div>
      )}
      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            {wifiStatus?.hotspot_active ? <WifiOff size={16} /> : wifiStatus?.connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            WiFi {wifiStatus?.hotspot_active ? 'Hotspot' : wifiStatus?.connected ? 'Connected' : 'Disconnected'}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={loadWifiStatus} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
        {wifiStatus && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <span>SSID: <strong>{wifiStatus.ssid || '—'}</strong></span>
            <span>IP: <strong>{wifiStatus.ip || '—'}</strong></span>
            <span>Mode: <strong>{wifiStatus.mode}</strong></span>
            <span>Signal: <strong>{wifiStatus.signal || 0}%</strong></span>
          </div>
        )}
      </div>

      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wifi size={16} /> Join a Network
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input placeholder="SSID" value={connectSsid} onChange={e => setConnectSsid(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }} />
          <input placeholder="Password" type="password" value={connectPass} onChange={e => setConnectPass(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={connectToNetwork} disabled={!connectSsid || connecting}
            style={{ height: 34 }}>
            {connecting ? <Loader size={14} className="spin" /> : <Check size={14} />}
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={scanNetworks} disabled={scanning} style={{ fontSize: 12 }}>
          <RefreshCw size={12} /> {scanning ? 'Scanning...' : 'Scan for networks'}
        </button>
        {networks.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {networks.map((n, i) => (
              <div key={i} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => { setConnectSsid(n.ssid); setConnectPass('') }}>
                <Wifi size={14} style={{ color: n.signal > 60 ? 'var(--success)' : n.signal > 30 ? 'var(--warning)' : 'var(--text-muted)' }} />
                <span style={{ flex: 1, fontSize: 13 }}>{n.ssid}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.signal}%</span>
                <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--glass-border)', color: 'var(--text-muted)' }}>{n.security}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <WifiOff size={16} /> Hotspot Access Point
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input placeholder="SSID" value={hotspotSsid} onChange={e => setHotspotSsid(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }} disabled={wifiStatus?.hotspot_active} />
          <input placeholder="Password" value={hotspotPass} onChange={e => setHotspotPass(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }} disabled={wifiStatus?.hotspot_active} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {wifiStatus?.hotspot_active ? (
            <button className="btn btn-danger btn-sm" onClick={disableHotspot} disabled={hotspotBusy}>
              <X size={14} /> Stop Hotspot
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={enableHotspot} disabled={hotspotBusy}>
              <WifiOff size={14} /> Start Hotspot
            </button>
          )}
        </div>
      </div>

      {wifiMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: wifiMsg.includes('fail') ? 'var(--danger-dim)' : 'var(--success-dim)',
          color: wifiMsg.includes('fail') ? 'var(--danger)' : 'var(--success)'
        }}>
          {wifiMsg}
        </div>
      )}
    </div>
  )
}

function SystemTab() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [systemErr, setSystemErr] = useState('')
  const [updating, setUpdating] = useState(false)

  const loadUpdateInfo = async () => {
    setSystemErr('')
    try { setUpdateInfo((await api.get('/system/update/check')).data) }
    catch (e: any) { setSystemErr(e.response?.data?.error || 'Failed to check for updates') }
  }

  const applyUpdate = async () => {
    if (!confirm('Apply update and restart ALPHA?')) return
    setUpdating(true); setSystemErr('')
    try { await api.post('/system/update/apply') }
    catch (e: any) { setSystemErr(e.response?.data?.error || 'Update failed') }
    setUpdating(false)
  }

  const restartServer = async () => {
    if (!confirm('Restart ALPHA server?')) return
    setSystemErr('')
    try { await api.post('/system/restart') }
    catch (e: any) { setSystemErr(e.response?.data?.error || 'Restart failed') }
  }

  const shutdownServer = async () => {
    if (!confirm('Shutdown server?')) return
    setSystemErr('')
    try { await api.post('/system/shutdown') }
    catch (e: any) { setSystemErr(e.response?.data?.error || 'Shutdown failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {systemErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {systemErr}
        </div>
      )}
      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ALPHA Updates</div>
        {updateInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13 }}>Current: <strong>{updateInfo.current}</strong></div>
            <div style={{ fontSize: 13 }}>Latest: <strong>{updateInfo.latest}</strong></div>
            {updateInfo.update_available ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--success)' }}>An update is available!</div>
                <button className="btn btn-primary btn-sm" onClick={applyUpdate} disabled={updating} style={{ width: 'fit-content' }}>
                  {updating ? <Loader size={14} className="spin" /> : <Download size={14} />}
                  {' '}{updating ? 'Installing...' : 'Install Update'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>ALPHA is up to date</div>
            )}
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={loadUpdateInfo}>
            <RefreshCw size={14} /> Check for Updates
          </button>
        )}
      </div>

      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Server Control</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={restartServer}>
            <RefreshCw size={14} /> Restart ALPHA
          </button>
          <button className="btn btn-danger btn-sm" onClick={shutdownServer}>
            <Server size={14} /> Shutdown
          </button>
        </div>
      </div>
    </div>
  )
}

function BackupTab() {
  const [backups, setBackups] = useState<any[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [includeStorage, setIncludeStorage] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupErr, setBackupErr] = useState('')
  const [loadingBackups, setLoadingBackups] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadBackups() }, [])

  const loadBackups = async () => {
    setLoadingBackups(true); setBackupErr('')
    try { setBackups((await api.get('/backup/list')).data) }
    catch (e: any) { setBackupErr(e.response?.data?.error || 'Failed to load backups') }
    setLoadingBackups(false)
  }

  const createBackup = async () => {
    setCreatingBackup(true); setBackupMsg('')
    try {
      await api.post('/backup/create', { include_storage: includeStorage })
      setBackupMsg('Backup created!')
      loadBackups()
    } catch { setBackupMsg('Backup failed') }
    setCreatingBackup(false)
  }

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setRestoring(true); setBackupMsg('')
    const form = new FormData()
    form.append('file', e.target.files[0])
    try {
      await api.post('/backup/restore', form, { headers: { 'Content-Type': 'multipart/form-data' }})
      setBackupMsg('Restore complete! Rebooting...')
    } catch { setBackupMsg('Restore failed') }
    setRestoring(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const deleteBackup = async (id: string) => {
    if (!confirm('Delete this backup?')) return
    setBackupErr('')
    try { await api.delete(`/backup/delete/${id}`); loadBackups() }
    catch (e: any) { setBackupErr(e.response?.data?.error || 'Failed to delete backup') }
  }

  const formatBytes = (b: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0; let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${size.toFixed(1)} ${units[i]}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {backupErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {backupErr}
        </div>
      )}
      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Archive size={16} /> Create Backup
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={creatingBackup}>
            {creatingBackup ? <Loader size={14} className="spin" /> : <Download size={14} />}
            {creatingBackup ? ' Creating...' : ' Create Backup'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeStorage} onChange={e => setIncludeStorage(e.target.checked)} />
            Include storage files
          </label>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginLeft: 'auto' }}>
            <Upload size={14} /> Restore
            <input ref={fileInputRef} type="file" accept=".tar.gz" style={{ display: 'none' }} onChange={restoreBackup} disabled={restoring} />
          </label>
        </div>
      </div>

      {loadingBackups ? (
        <div className="card-liquid" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader size={14} className="spin" style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading backups...</span>
        </div>
      ) : backups.length > 0 ? (
        <div className="card-liquid" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} /> Available Backups
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadBackups}><RefreshCw size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {backups.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                fontSize: 13
              }}>
                <Archive size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{b.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                    <span>{formatBytes(b.size)}</span>
                    <span>{new Date(b.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => window.open(`/api/backup/download/${b.id}`, '_blank')}>
                  <Download size={14} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteBackup(b.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-liquid" style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No backups yet</div>
        </div>
      )}

      {backupMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: backupMsg.includes('fail') ? 'var(--danger-dim)' : 'var(--success-dim)',
          color: backupMsg.includes('fail') ? 'var(--danger)' : 'var(--success)'
        }}>
          {backupMsg}
        </div>
      )}
    </div>
  )
}

function AITab() {
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [aiErr, setAiErr] = useState('')

  useEffect(() => {
    api.get('/ai/status')
      .then(r => setOllamaStatus(r.data?.ollama ? 'online' : 'offline'))
      .catch((e: any) => {
        setOllamaStatus('offline')
        setAiErr(e.response?.data?.error || 'Failed to check AI status')
      })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {aiErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {aiErr}
        </div>
      )}
      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={16} /> AI Configuration
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: ollamaStatus === 'online' ? 'var(--success)' : ollamaStatus === 'offline' ? 'var(--danger)' : 'var(--warning)',
            boxShadow: ollamaStatus === 'online' ? '0 0 8px var(--success)' : 'none'
          }} />
          <span style={{ fontSize: 13 }}>
            Ollama: {ollamaStatus === 'online' ? 'Connected' : ollamaStatus === 'offline' ? 'Not connected' : 'Checking...'}
          </span>
        </div>
      </div>

      <div className="card-liquid" style={{
        padding: 18, borderLeft: '3px solid var(--accent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>AI Setup</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {ollamaStatus === 'online'
                ? 'Ollama is running. Open AI Studio to chat.'
                : 'Install Ollama, pull a model, and configure your AI provider'}
            </div>
          </div>
          {ollamaStatus !== 'online' && (
            <button className="btn btn-primary" onClick={async () => {
              if (!confirm('Install Ollama and pull llama3.2:1b? This may take several minutes.')) return
              try {
                const r = await api.post('/ai/install-ollama')
                alert(r.data.message || 'Done!')
                setOllamaStatus('online')
                setAiErr('')
              } catch (e: any) {
                alert(e.response?.data?.error || 'Installation failed')
              }
            }}>
              <Zap size={16} /> Install
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RemoteTab() {
  const [remoteErr, setRemoteErr] = useState('')
  const [enableBusy, setEnableBusy] = useState(false)
  const [remoteEnabled, setRemoteEnabled] = useState(false)

  const toggleRemote = async () => {
    setEnableBusy(true); setRemoteErr('')
    try {
      if (remoteEnabled) {
        await api.post('/remote/disable')
        setRemoteEnabled(false)
      } else {
        await api.post('/remote/enable')
        setRemoteEnabled(true)
      }
    } catch (e: any) {
      setRemoteErr(e.response?.data?.error || 'Failed to toggle remote access')
    }
    setEnableBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {remoteErr && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'var(--danger-dim)', color: 'var(--danger)' }}>
          {remoteErr}
        </div>
      )}
      <div className="card-liquid" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} /> Remote Access
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          Access your ALPHA server from anywhere without port forwarding.
          Enable remote access to get a secure tunnel URL.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: remoteEnabled ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0
            }} />
            <span style={{ fontSize: 13 }}>Remote access is currently <strong>{remoteEnabled ? 'enabled' : 'disabled'}</strong></span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={toggleRemote} disabled={enableBusy} style={{ width: 'fit-content' }}>
            {enableBusy ? <Loader size={14} className="spin" /> : <Globe size={14} />}
            {' '}{enableBusy ? 'Processing...' : remoteEnabled ? 'Disable Remote Access' : 'Enable Remote Access'}
          </button>
        </div>
      </div>
    </div>
  )
}
