import React, { useEffect, useState, useMemo, useCallback, useRef, Component, ReactNode, ErrorInfo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cpu, HardDrive, Thermometer, Activity,
  Monitor, Database, Wifi, Clock, Brain,
  ExternalLink, Star, History, File,
  TrendingUp, ArrowUp, ArrowDown, Zap,
  Shield, Download, Upload, Server as ServerIcon,
  Gauge, Cloud, Settings, Wrench, Sparkles, Palette,
  AlertTriangle, X, CheckCircle, Info, Bell,
  Layers, Box, WifiOff, Sliders, RefreshCw,
  Network, Terminal, Users, AlertCircle,
  Globe, Loader, Circle, ChevronRight,
  Moon, Sun
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { SystemStatus, StorageInfo, Device, MetricPoint, DashboardWidget, Notification as NotificationType } from '../types'
import PopupModal from '../components/common/PopupModal'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import WidgetGrid from '../components/dashboard/WidgetGrid'
import AIWidgetGenerator from '../components/dashboard/AIWidgetGenerator'
import PlusButton from '../components/dashboard/PlusButton'
import CustomizationMenu from '../components/dashboard/CustomizationMenu'

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

interface ErrorBoundaryProps { children: ReactNode; fallback?: ReactNode; name?: string }
interface ErrorBoundaryState { hasError: boolean }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Dashboard:${this.props.name || 'panel'}]`, error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="card-liquid" style={{ padding: 22, textAlign: 'center' }}>
          <AlertTriangle size={22} style={{ color: 'var(--danger)', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Panel crashed</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
            onClick={() => this.setState({ hasError: false })}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Skeleton({ width, height, borderRadius = 10 }: { width?: string | number; height?: string | number; borderRadius?: number }) {
  return (
    <div style={{
      width: width || '100%', height: height || 20,
      borderRadius, background: 'var(--glass-border)',
      animation: 'skeleton 1.5s ease-in-out infinite',
    }} />
  )
}

function AnimatedNumber({ value, suffix = '', decimals = 0, duration = 900 }: { value: number; suffix?: string; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number>()
  const startRef = useRef(0)
  const fromRef = useRef(value)

  useEffect(() => {
    fromRef.current = display
    startRef.current = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startRef.current
      const p = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = fromRef.current + (value - fromRef.current) * eased
      setDisplay(current)
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return <>{display.toFixed(decimals)}{suffix}</>
}

function Sparkline({ data, color, height = 32 }: { data: { v: number }[]; color: string; height?: number }) {
  const id = useRef(`spk-${Math.random().toString(36).slice(2, 8)}`).current
  if (!data || data.length < 2) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const SERVICE_NAMES: Record<string, { label: string; icon: React.ReactNode }> = {
  api_server: { label: 'API Server', icon: <ServerIcon size={14} /> },
  database: { label: 'Database Engine', icon: <Database size={14} /> },
  ai_service: { label: 'AI Service', icon: <Brain size={14} /> },
  file_monitor: { label: 'File Monitor', icon: <File size={14} /> },
  disk_scheduler: { label: 'Disk Scheduler', icon: <HardDrive size={14} /> },
  network_manager: { label: 'Network Manager', icon: <Wifi size={14} /> },
}

const quickActions = [
  { icon: HardDrive, label: 'Storage', color: '#10b981', path: '/storage' },
  { icon: Brain, label: 'AI Studio', color: '#6c5ce7', path: '/ai' },
  { icon: Monitor, label: 'Devices', color: '#3b82f6', path: '/devices' },
  { icon: Settings, label: 'Settings', color: '#f59e0b', path: '/settings' },
  { icon: Wrench, label: 'Tools', color: '#ec4899', path: '/tools' },
  { icon: Download, label: 'Downloads', color: '#14b8a6', path: '/downloads' },
]

function Greeting({ username, currentTime, sys }: { username?: string; currentTime: Date; sys: SystemStatus | null }) {
  const h = currentTime.getHours()
  let g = 'evening'
  let icon = <Moon size={20} />
  if (h < 5) { g = 'night owl'; icon = <Moon size={20} /> }
  else if (h < 12) { g = 'morning'; icon = <Sun size={20} /> }
  else if (h < 17) { g = 'afternoon'; icon = <Sun size={20} /> }
  else if (h < 21) { g = 'evening'; icon = <Cloud size={20} /> }

  const displayName = username || 'Admin'
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          Good {g}, {displayName.split(' ')[0]}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
          <span>{dateStr}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
          {sys && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--text-muted)' }}>CPU {sys.cpu.percent}% · {sys.memory.percent}% mem</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const formatBytes = (b: number) => {
  if (!b && b !== 0) return '—'
  if (b === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

const formatBytesPerSec = (b: number) => {
  if (!b && b !== 0) return '—'
  if (b === 0) return '0 bps'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

const TypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--accent)', success: 'var(--success)',
    critical: 'var(--danger)',
  }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 6,
      background: `${colors[type] || 'var(--glass-border)'}22`,
      color: colors[type] || 'var(--text-muted)',
      fontWeight: 600, textTransform: 'capitalize',
    }}>
      {type}
    </span>
  )
}

const severityColor = (sev: string) => {
  switch (sev) {
    case 'critical': case 'error': return 'var(--danger)'
    case 'warning': return 'var(--warning)'
    case 'info': return 'var(--accent)'
    default: return 'var(--text-muted)'
  }
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 400, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderLeft: `3px solid ${
            t.type === 'error' ? 'var(--danger)' :
            t.type === 'warning' ? 'var(--warning)' :
            t.type === 'success' ? 'var(--success)' : 'var(--accent)'
          }`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 500,
          animation: 'slideUp 0.25s ease',
          pointerEvents: 'auto',
          backdropFilter: 'blur(16px)',
        }}>
          {t.type === 'error' ? <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} /> :
           t.type === 'warning' ? <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} /> :
           t.type === 'success' ? <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} /> :
           <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, setTheme, wallpaper, setWallpaper, config, updateConfig, providers } = useTheme()
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [sys, setSys] = useState<SystemStatus | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [favFiles, setFavFiles] = useState<any[]>([])
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [metricRange, setMetricRange] = useState('1h')
  const [alerts, setAlerts] = useState<NotificationType[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [showGen, setShowGen] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [hideAiBanner, setHideAiBanner] = useState(() => localStorage.getItem('alpha-hide-ai-banner') === 'true')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [sysRes, stoRes, devRes, aiRes, metRes] = await Promise.all([
        api.get('/system/status'),
        api.get('/storage/status'),
        api.get('/devices/'),
        api.get('/ai/status'),
        api.get(`/monitor/history?range=${metricRange}`),
      ])
      setSys(sysRes.data)
      setStorage(stoRes.data)
      setDevices(devRes.data || [])
      setAiStatus(aiRes.data)
      setMetrics(metRes.data || [])
      setLoading(false)
    } catch (err: any) {
      setLoading(false)
      if (err.response?.status !== 401) {
        addToast(err.response?.data?.message || err.message || 'Failed to load dashboard data', 'error')
      }
      return
    }

    const secondaryCalls: Promise<any>[] = []
    secondaryCalls.push(
      api.get('/notifications/').then(r => {
        setAlerts(r.data?.slice?.(0, 8) || r.data || [])
      }).catch(() => {})
    )
    secondaryCalls.push(
      api.get('/system/processes').then(r => {
        setProcesses((r.data?.processes || r.data || []).slice(0, 7))
      }).catch(() => {})
    )
    secondaryCalls.push(
      api.get('/system/services').then(r => {
        setServices(r.data || [])
      }).catch(() => {})
    )
    await Promise.allSettled(secondaryCalls)
  }, [metricRange, addToast])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alpha-ai-widgets')
      if (saved) setWidgets(JSON.parse(saved))
    } catch { /* */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('alpha-ai-widgets', JSON.stringify(widgets))
  }, [widgets])

  const onlineCount = useMemo(() =>
    devices.filter(d => d.status === 'online' || d.status === 'approved').length,
    [devices]
  )

  const uptimeShort = useMemo(() => {
    if (!sys?.uptime) return '—'
    const parts = sys.uptime.match(/(\d+)\s*(day|hour|minute|second)/gi)
    return parts?.slice(0, 2).join(', ') || sys.uptime
  }, [sys])

  const cpuSparkData = useMemo(() => metrics.map(m => ({ v: m.cpu })).slice(-30), [metrics])
  const memSparkData = useMemo(() => metrics.map(m => ({ v: m.memory })).slice(-30), [metrics])

  const handleAiGenerate = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(prev => [...prev, ...newWidgets])
    setShowGen(false)
    addToast(`${newWidgets.length} AI widget${newWidgets.length !== 1 ? 's' : ''} generated`, 'success')
  }, [addToast])

  const dismissAiBanner = useCallback(() => {
    setHideAiBanner(true)
    localStorage.setItem('alpha-hide-ai-banner', 'true')
  }, [])

  const panelError = (name: string) => (
    <div className="card-liquid" style={{ padding: 22, textAlign: 'center' }}>
      <AlertTriangle size={22} style={{ color: 'var(--warning)', marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{name} unavailable</div>
      <button className="btn btn-ghost btn-sm" onClick={() => { addToast(`Refreshing ${name}...`, 'info'); fetchAll() }}>
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  )

  const onlineColor = sys && sys.cpu.percent != null
    ? sys.cpu.percent > 80 ? 'var(--danger)' : sys.cpu.percent > 60 ? 'var(--warning)' : 'var(--success)'
    : 'var(--text-muted)'

  return (
    <>
      <PopupModal />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: config.widgetDensity === 'compact' ? 12 : config.widgetDensity === 'comfortable' ? 24 : 18,
        paddingBottom: 80, transition: 'gap 0.3s',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 12,
        }}>
          <Greeting username={user?.username} currentTime={now} sys={sys} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="badge badge-accent" style={{ fontSize: 11, padding: '5px 14px', gap: 6 }}>
              <Activity size={12} />
              {loading ? <span style={{ opacity: 0.5 }}>—</span> : uptimeShort}
            </div>
            <div className="badge badge-info" style={{ fontSize: 11, padding: '5px 14px', gap: 6 }}>
              <Monitor size={12} />
              {loading ? <span style={{ opacity: 0.5 }}>—</span> : `${onlineCount} online`}
            </div>
            {sys && (
              <div className="badge" style={{
                fontSize: 11, padding: '5px 14px', gap: 6,
                background: `${onlineColor}18`, color: onlineColor,
              }}>
                <Circle size={8} style={{ color: onlineColor, fill: onlineColor }} />
                {sys.hostname || 'ALPHA'}
              </div>
            )}
          </div>
        </div>

        {/* AI Setup Banner */}
        {aiStatus && !aiStatus.ollama && !hideAiBanner && (
          <div className="card-liquid" style={{
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: '3px solid var(--accent)', position: 'relative',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Brain size={18} style={{ color: 'white' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Resume AI Setup</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                Ollama is not connected. Install Ollama to enable local AI chat, file analysis, and system assistant.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/ai')} style={{ flexShrink: 0 }}>
              <Zap size={13} /> Open AI Studio
            </button>
            <button onClick={dismissAiBanner}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, flexShrink: 0,
              }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {quickActions.map(qa => (
            <button key={qa.label} className="card-liquid" onClick={() => navigate(qa.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                color: 'var(--text-primary)', flex: 1, minWidth: 110,
                transition: 'all 0.2s',
              }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `color-mix(in srgb, ${qa.color} 15%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: qa.color,
              }}>
                <qa.icon size={17} />
              </div>
              <span style={{ fontWeight: 500 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* 12-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>

          {/* Stat Cards */}
          <div style={{ gridColumn: 'span 3' }}>
            <ErrorBoundary name="stat-cpu">
              <div className="card-liquid" style={{ padding: 18, position: 'relative', overflow: 'hidden', height: '100%' }}>
                {loading && !sys ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={26} />
                    <Skeleton width={100} height={12} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Cpu size={15} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>CPU</span>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {sys?.cpu.percent != null ? <AnimatedNumber value={sys.cpu.percent} suffix="%" decimals={0} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sys ? `${sys.cpu.cores} cores` : '—'}</div>
                      </div>
                      {cpuSparkData.length >= 2 && (
                        <div style={{ width: 80, height: 32, flexShrink: 0 }}>
                          <Sparkline data={cpuSparkData} color="var(--accent)" height={32} />
                        </div>
                      )}
                    </div>
                    {sys?.cpu.percent != null && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: sys.cpu.percent > 70 ? 'var(--danger)' : 'var(--success)' }}>
                        {sys.cpu.percent > 70 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        <span style={{ fontWeight: 600 }}>{sys.cpu.percent > 70 ? 'High load' : 'Normal'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <ErrorBoundary name="stat-memory">
              <div className="card-liquid" style={{ padding: 18, position: 'relative', overflow: 'hidden', height: '100%' }}>
                {loading && !sys ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={26} />
                    <Skeleton width={100} height={12} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Database size={15} style={{ color: 'var(--success)' }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Memory</span>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {sys?.memory?.percent != null ? <AnimatedNumber value={sys.memory.percent} suffix="%" decimals={0} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sys?.memory?.used ? `${formatBytes(sys.memory.used)} used` : '—'}</div>
                      </div>
                      {memSparkData.length >= 2 && (
                        <div style={{ width: 80, height: 32, flexShrink: 0 }}>
                          <Sparkline data={memSparkData} color="var(--success)" height={32} />
                        </div>
                      )}
                    </div>
                    {sys?.memory?.percent != null && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: sys.memory.percent > 80 ? 'var(--danger)' : 'var(--success)' }}>
                        {sys.memory.percent > 80 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        <span style={{ fontWeight: 600 }}>{sys.memory.percent > 80 ? 'Critical' : 'Stable'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <ErrorBoundary name="stat-temp">
              <div className="card-liquid" style={{ padding: 18, height: '100%' }}>
                {loading && !sys ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={26} />
                    <Skeleton width={100} height={12} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Thermometer size={15} style={{ color: 'var(--warning)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Temperature</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700 }}>
                      {typeof sys?.temperature === 'number'
                        ? <AnimatedNumber value={sys.temperature} suffix="°" decimals={0} />
                        : sys?.temperature ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>System temp</div>
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <ErrorBoundary name="stat-uptime">
              <div className="card-liquid" style={{ padding: 18, height: '100%' }}>
                {loading && !sys ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={26} />
                    <Skeleton width={100} height={12} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Clock size={15} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Uptime</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{uptimeShort}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {sys?.platform?.split('-')?.[0] || ''}{sys?.hostname ? ` / ${sys.hostname}` : ''}
                    </div>
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Storage */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="storage" fallback={panelError('Storage')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HardDrive size={16} /> Storage
                </h3>
                {loading && !storage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton height={12} borderRadius={6} />
                  </div>
                ) : storage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
                      {[
                        { label: 'Total', value: formatBytes(storage.total), color: 'var(--text-primary)' },
                        { label: 'Used', value: formatBytes(storage.used), color: storage.percent > 85 ? 'var(--danger)' : 'var(--warning)' },
                        { label: 'Free', value: formatBytes(storage.free), color: 'var(--success)' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--glass-bg)', borderRadius: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="progress-bar" style={{ height: 12, borderRadius: 6 }}>
                        <div className="fill" style={{
                          width: `${storage.percent}%`, borderRadius: 6,
                          background: storage.percent > 85
                            ? 'linear-gradient(90deg, var(--danger), #e17055)'
                            : storage.percent > 60
                              ? 'linear-gradient(90deg, var(--warning), #fdcb6e)'
                              : 'linear-gradient(90deg, var(--success), var(--accent))',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                        {storage.percent.toFixed(1)}% used
                        {storage.percent > 85 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>· Action needed</span>}
                        {storage.percent <= 85 && storage.percent > 60 && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>· Monitor</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <HardDrive size={28} />
                    <h3>No data</h3>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Connected Devices */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="devices" fallback={panelError('Devices')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={16} /> Connected Devices
                  {!loading && devices.length > 0 && (
                    <span className="badge badge-info" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {onlineCount}/{devices.length}
                    </span>
                  )}
                </h3>
                {loading && devices.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={44} borderRadius={10} />)}
                  </div>
                ) : devices.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <Wifi size={28} />
                    <h3>No devices found</h3>
                    <p style={{ fontSize: 12 }}>Scan your network to discover devices</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {devices.slice(0, 6).map(d => {
                      const isOnline = d.status === 'online' || d.status === 'approved'
                      return (
                        <div key={d.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 12px', background: 'var(--glass-bg)', borderRadius: 10,
                          border: '1px solid var(--glass-border)', transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: isOnline ? 'var(--success)' : 'var(--text-muted)',
                              boxShadow: isOnline ? '0 0 8px var(--success)' : 'none',
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip}</div>
                            </div>
                          </div>
                          <span className="badge" style={{
                            background: isOnline ? 'var(--success-dim)' : 'var(--glass-border)',
                            color: isOnline ? 'var(--success)' : 'var(--text-muted)',
                            fontSize: 10, padding: '2px 8px', flexShrink: 0,
                          }}>
                            {d.status}
                          </span>
                        </div>
                      )
                    })}
                    {devices.length > 6 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/devices')}
                        style={{ marginTop: 4, fontSize: 12, justifyContent: 'center' }}>
                        View all {devices.length} devices <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Services */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="services" fallback={panelError('Services')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} /> Services
                </h3>
                {loading && services.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4].map(i => <Skeleton key={i} height={38} borderRadius={8} />)}
                  </div>
                ) : services.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {services.slice(0, 6).map((svc: any) => {
                      const running = svc.status === 'running' || svc.status === 'active'
                      const info = SERVICE_NAMES[svc.id || svc.name] || { label: svc.name || svc.id || 'Service', icon: <Box size={14} /> }
                      return (
                        <div key={svc.id || svc.name} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', background: 'var(--glass-bg)', borderRadius: 8,
                          border: '1px solid var(--glass-border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: running ? 'var(--success)' : 'var(--text-muted)',
                              boxShadow: running ? '0 0 6px var(--success)' : 'none',
                            }} />
                            <span style={{ color: 'var(--text-muted)' }}>{info.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{info.label}</div>
                              {svc.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{svc.description}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {svc.uptime && running && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{svc.uptime}</span>}
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                              background: running ? 'var(--success-dim)' : 'var(--danger-dim)',
                              color: running ? 'var(--success)' : 'var(--danger)',
                            }}>
                              {running ? 'Active' : 'Stopped'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(SERVICE_NAMES).slice(0, 5).map(([id, info]) => (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'var(--glass-bg)', borderRadius: 8,
                        border: '1px solid var(--glass-border)', opacity: 0.7,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--success)', boxShadow: '0 0 6px var(--success)',
                          }} />
                          <span style={{ color: 'var(--text-muted)' }}>{info.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{info.label}</span>
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: 'var(--success-dim)', color: 'var(--success)' }}>Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Recent Alerts */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="alerts" fallback={panelError('Alerts')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={16} /> Recent Alerts
                    {alerts.filter(a => !a.read).length > 0 && (
                      <span className="badge" style={{ fontSize: 10, padding: '1px 7px', background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                        {alerts.filter(a => !a.read).length}
                      </span>
                    )}
                  </h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')} style={{ fontSize: 11 }}>
                    View all
                  </button>
                </div>
                {loading && alerts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4].map(i => <Skeleton key={i} height={44} borderRadius={10} />)}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <Bell size={28} />
                    <h3>No alerts</h3>
                    <p style={{ fontSize: 12 }}>All clear — no recent notifications</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.slice(0, 6).map(a => {
                      const IconComp = a.type === 'error' || a.type === 'critical' ? AlertCircle :
                        a.type === 'warning' ? AlertTriangle : Bell
                      return (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '9px 12px', background: 'var(--glass-bg)', borderRadius: 10,
                          border: '1px solid var(--glass-border)',
                          opacity: a.read ? 0.6 : 1,
                        }}>
                          <IconComp size={14} style={{ color: severityColor(a.type), flexShrink: 0, marginTop: 1 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: a.read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.message || (a as any).description || ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <TypeBadge type={a.type} />
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Top Processes */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="processes" fallback={panelError('Processes')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Terminal size={16} /> Top Processes
                </h3>
                {loading && processes.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4,5].map(i => <Skeleton key={i} height={34} borderRadius={8} />)}
                  </div>
                ) : processes.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <Terminal size={28} />
                    <h3>No process data</h3>
                    <p style={{ fontSize: 12 }}>Process data will appear when available</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 8,
                      padding: '6px 10px', fontSize: 10, color: 'var(--text-muted)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      <span>Process</span>
                      <span style={{ textAlign: 'right' }}>CPU%</span>
                      <span style={{ textAlign: 'right' }}>MEM%</span>
                    </div>
                    {processes.slice(0, 5).map((p: any, i: number) => {
                      const cpuVal = p.cpu_percent ?? p.cpu ?? 0
                      const memVal = p.memory_percent ?? p.memory ?? 0
                      return (
                        <div key={p.pid || p.name || i} style={{
                          display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 8,
                          alignItems: 'center', padding: '7px 10px',
                          background: 'var(--glass-bg)', borderRadius: 8,
                          border: '1px solid var(--glass-border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{
                              width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700,
                              background: cpuVal > 50 ? 'var(--danger-dim)' : cpuVal > 20 ? 'var(--warning-dim)' : 'var(--accent-dim)',
                              color: cpuVal > 50 ? 'var(--danger)' : cpuVal > 20 ? 'var(--warning)' : 'var(--accent)',
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name || p.command || 'Unknown'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {typeof cpuVal === 'number' ? cpuVal.toFixed(1) : cpuVal}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {typeof memVal === 'number' ? memVal.toFixed(1) : memVal}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Network Bandwidth */}
          <div style={{ gridColumn: 'span 6' }}>
            <ErrorBoundary name="network" fallback={panelError('Network')}>
              <div className="card-liquid" style={{ padding: 20, height: '100%' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Network size={16} /> Network I/O
                </h3>
                {loading && metrics.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skeleton height={32} />
                    <Skeleton height={32} />
                    <Skeleton height={60} borderRadius={8} />
                  </div>
                ) : metrics.length < 2 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <Network size={28} />
                    <h3>Collecting data...</h3>
                    <p style={{ fontSize: 12 }}>Network metrics will appear after first collection cycle</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1, padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          <Download size={12} /> Download
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>
                          {formatBytesPerSec(metrics[metrics.length - 1]?.net_recv || 0)}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          <Upload size={12} /> Upload
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                          {formatBytesPerSec(metrics[metrics.length - 1]?.net_sent || 0)}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 60 }}>
                      <ResponsiveContainer width="100%" height={60}>
                        <AreaChart data={metrics.slice(-40)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="net-dl" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="net-ul" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="net_recv" stroke="var(--success)" strokeWidth={1.5} fill="url(#net-dl)" dot={false} isAnimationActive={false} />
                          <Area type="monotone" dataKey="net_sent" stroke="var(--accent)" strokeWidth={1.5} fill="url(#net-ul)" dot={false} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
                    }}>
                      <span><Download size={10} /> Peak: {formatBytesPerSec(Math.max(...metrics.map(m => m.net_recv)))}</span>
                      <span><Upload size={10} /> Peak: {formatBytesPerSec(Math.max(...metrics.map(m => m.net_sent)))}</span>
                    </div>
                  </>
                )}
              </div>
            </ErrorBoundary>
          </div>
        </div>

        {/* Live Metrics */}
        <ErrorBoundary name="metrics" fallback={panelError('Live Metrics')}>
          <div className="card-liquid" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} /> Live Metrics
                {!loading && metrics.length > 1 && (
                  <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 7px' }}>
                    {metrics.length} pts
                  </span>
                )}
              </h3>
              <div className="tabs" style={{ padding: 3 }}>
                {['1h', '6h', '24h', '7d'].map(r => (
                  <button key={r} className={`tab ${metricRange === r ? 'active' : ''}`}
                    onClick={() => setMetricRange(r)}
                    style={{ padding: '3px 10px', fontSize: 11 }}>{r}</button>
                ))}
              </div>
            </div>
            {loading && metrics.length === 0 ? (
              <Skeleton height={200} borderRadius={12} />
            ) : metrics.length > 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginBottom: 6,
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    CPU · Memory · Disk <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(%)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={metrics} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="mcpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="mmem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="mdsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--warning)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--warning)" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" strokeOpacity={0.5} />
                      <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                          borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-lg)',
                          backdropFilter: 'blur(12px)',
                        }}
                        cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        labelFormatter={(label) => {
                          if (!label) return ''
                          const d = new Date(label)
                          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        }}
                      />
                      <Area type="monotone" dataKey="cpu" stroke="var(--accent)" strokeWidth={2} fill="url(#mcpu)" dot={false} name="CPU" />
                      <Area type="monotone" dataKey="memory" stroke="var(--success)" strokeWidth={2} fill="url(#mmem)" dot={false} name="Memory" />
                      <Area type="monotone" dataKey="disk" stroke="var(--warning)" strokeWidth={2} fill="url(#mdsk)" dot={false} name="Disk" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginBottom: 6,
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    Network I/O <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(bytes/s)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={metrics} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="mndl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="mnul" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" strokeOpacity={0.5} />
                      <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                          borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-lg)',
                          backdropFilter: 'blur(12px)',
                        }}
                        cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        labelFormatter={(label) => {
                          if (!label) return ''
                          const d = new Date(label)
                          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        }}
                        formatter={(value: number) => formatBytesPerSec(value)}
                      />
                      <Area type="monotone" dataKey="net_recv" stroke="var(--success)" strokeWidth={2} fill="url(#mndl)" dot={false} name="Download" />
                      <Area type="monotone" dataKey="net_sent" stroke="var(--accent)" strokeWidth={2} fill="url(#mnul)" dot={false} name="Upload" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>
                <TrendingUp size={28} />
                <h3>Collecting data...</h3>
                <p style={{ fontSize: 12 }}>Metrics will appear after first collection cycle</p>
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* AI Widget Section */}
        <ErrorBoundary name="ai-widgets" fallback={panelError('AI Widgets')}>
          <div className="card-liquid" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} /> AI Widgets
                {widgets.length > 0 && (
                  <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 7px' }}>
                    {widgets.length.toLocaleString()}
                  </span>
                )}
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowGen(true)}>
                <Sparkles size={13} /> Generate
              </button>
            </div>

            {showGen && (
              <AIWidgetGenerator
                providers={providers}
                onGenerate={handleAiGenerate}
                onClose={() => setShowGen(false)}
              />
            )}

            <WidgetGrid widgets={widgets} onRemove={(id) => setWidgets(prev => prev.filter(w => w.id !== id))} />

            {widgets.length === 0 && !showGen && (
              <div className="empty-state" style={{ padding: 36 }}>
                <Sparkles size={36} style={{ opacity: 0.25 }} />
                <h3>No AI widgets yet</h3>
                <p style={{ fontSize: 12 }}>Click Generate to have AI create custom dashboard widgets based on what you want to monitor</p>
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* System Info */}
        <ErrorBoundary name="system-info" fallback={panelError('System Info')}>
          <div className="card-liquid" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ServerIcon size={16} /> System Info
            </h3>
            {loading && !sys ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {[1,2,3,4].map(i => <Skeleton key={i} height={60} borderRadius={10} />)}
              </div>
            ) : sys ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  ['Hostname', sys.hostname, <ServerIcon size={13} />],
                  ['Platform', sys.platform, <Monitor size={13} />],
                  ['Python', sys.python, <File size={13} />],
                  ['System Time', new Date(sys.time).toLocaleString(), <Clock size={13} />],
                  ['CPU Cores', String(sys.cpu.cores), <Cpu size={13} />],
                  ['Architecture', sys.platform?.split('-')?.[1] || '—', <Terminal size={13} />],
                ].map(([label, value, icon]) => (
                  <div key={label as string} style={{
                    padding: '11px 14px', background: 'var(--glass-bg)',
                    borderRadius: 10, border: '1px solid var(--glass-border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {icon} {label as string}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(value as string) || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ErrorBoundary>
      </div>

      <PlusButton
        onAddWidget={() => setShowGen(true)}
        onCustomize={() => setShowCustomize(true)}
      />

      {showCustomize && (
        <CustomizationMenu
          config={config}
          theme={theme}
          wallpaper={wallpaper}
          onUpdateConfig={updateConfig}
          onSetTheme={setTheme}
          onSetWallpaper={setWallpaper}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </>
  )
}
