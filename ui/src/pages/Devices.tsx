import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Monitor, Wifi, RefreshCw, Check, X, Search,
  Trash2, Edit3, Smartphone, Radio, Cpu, Plus,
  Lightbulb, Thermometer, Lock, Camera, Speaker,
  Fan, Tv, Disc, Plug, Wind, Droplets, Sun, Sword,
  Home, Zap, Clock, MapPin, Activity, Globe,
  WifiOff, Loader, Circle, ChevronRight,
  Network, Server, Tablet, MoreHorizontal
} from 'lucide-react'
import api from '../utils/api'
import { Device as DeviceType } from '../types'

interface ExtendedDevice extends DeviceType {
  room?: string
  area?: string
  latency?: number
  online?: boolean
}

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const DEVICE_TYPES = [
  { id: 'server', label: 'Server', icon: Server },
  { id: 'raspberry-pi', label: 'Raspberry Pi', icon: Cpu },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'laptop', label: 'Laptop', icon: Monitor },
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'esp32', label: 'ESP32/ESP8266', icon: Radio },
  { id: 'arduino', label: 'Arduino', icon: Radio },
  { id: 'light', label: 'Light', icon: Lightbulb },
  { id: 'switch', label: 'Switch', icon: Plug },
  { id: 'sensor', label: 'Sensor', icon: Thermometer },
  { id: 'motion-sensor', label: 'Motion Sensor', icon: Wind },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'thermostat', label: 'Thermostat', icon: Thermometer },
  { id: 'media-player', label: 'Media Player', icon: Speaker },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'speaker', label: 'Speaker', icon: Speaker },
  { id: 'fan', label: 'Fan', icon: Fan },
  { id: 'vacuum', label: 'Vacuum', icon: Disc },
  { id: 'climate', label: 'Climate', icon: Sun },
  { id: 'humidifier', label: 'Humidifier', icon: Droplets },
  { id: 'cover', label: 'Cover/Blind', icon: Sword },
  { id: 'printer', label: 'Printer', icon: Monitor },
  { id: 'nas', label: 'NAS', icon: Monitor },
  { id: 'router', label: 'Router', icon: Wifi },
  { id: 'network', label: 'Network Device', icon: Radio },
  { id: 'unknown', label: 'Unknown', icon: Monitor },
]

const TYPE_COLORS: Record<string, string> = {
  server: '#6c5ce7', 'raspberry-pi': '#00b894', desktop: '#0984e3',
  laptop: '#74b9ff', phone: '#a29bfe', tablet: '#a29bfe',
  esp32: '#00cec9', arduino: '#00cec9', light: '#fdcb6e',
  switch: '#e17055', sensor: '#55efc4', 'motion-sensor': '#81ecec',
  camera: '#00b894', lock: '#636e72', thermostat: '#e17055',
  'media-player': '#6c5ce7', tv: '#e17055', speaker: '#6c5ce7',
  fan: '#74b9ff', vacuum: '#00b894', climate: '#fdcb6e',
  humidifier: '#74b9ff', cover: '#636e72', printer: '#0984e3',
  nas: '#6c5ce7', router: '#00b894', network: '#0984e3',
  unknown: '#b2bec3',
}

const ROOM_ICONS: Record<string, React.ReactNode> = {
  'living room': <Home size={16} />,
  'living': <Home size={16} />,
  'office': <Monitor size={16} />,
  'bedroom': <Home size={16} />,
  'kitchen': <Home size={16} />,
  'garage': <Wifi size={16} />,
  'outdoor': <Sun size={16} />,
  'basement': <Home size={16} />,
}

let toastCounter = 0

const iconCache: Record<string, React.ElementType> = {}
DEVICE_TYPES.forEach(t => { iconCache[t.id] = t.icon })

function getIcon(typeId: string) {
  return iconCache[typeId] || Monitor
}

function getTypeLabel(typeId: string) {
  return DEVICE_TYPES.find(t => t.id === typeId)?.label || typeId
}

function formatLastSeen(ts: string) {
  if (!ts) return 'Never'
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function getRoom(device: ExtendedDevice): string {
  return device.room || device.area || 'Unassigned'
}

function SkeletonBlock({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return (
    <div className="skeleton" style={{ width: width || '100%', height: height || 20, ...style }} />
  )
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={11} />
        <SkeletonBlock width="30%" height={10} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
        <SkeletonBlock width={40} height={10} />
      </div>
    </div>
  )
}

function MiniNetworkMap({ devices }: { devices: ExtendedDevice[] }) {
  const routers = devices.filter(d => d.type === 'router' || d.type === 'network')
  const others = devices.filter(d => d.type !== 'router' && d.type !== 'network')
  if (routers.length === 0) return null

  const routerColors = ['#6c5ce7', '#00b894', '#0984e3', '#e17055']

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Network size={14} style={{ color: 'var(--accent)' }} />
        Network Topology
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {routers.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20,
            background: 'var(--accent-dim)', color: routerColors[i % routerColors.length],
            fontSize: 12, fontWeight: 600,
          }}>
            <Wifi size={14} />
            {r.name}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              width: 2, height: 12,
              background: 'var(--glass-border)',
              borderRadius: 1,
            }} />
          ))}
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          justifyContent: 'center', maxWidth: 400,
        }}>
          {others.slice(0, 12).map(d => {
            const TypeIcon = getIcon(d.type)
            const isOnline = d.status === 'approved' || d.status === 'online'
            return (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 16,
                background: isOnline ? 'var(--success-dim)' : 'var(--glass-bg)',
                fontSize: 11, color: isOnline ? 'var(--success)' : 'var(--text-muted)',
              }}>
                <TypeIcon size={12} />
                {d.name}
              </div>
            )
          })}
          {others.length > 12 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>
              +{others.length - 12} more
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const bgMap = {
    success: 'var(--success-dim)',
    error: 'var(--danger-dim)',
    info: 'var(--info-dim)',
    warning: 'var(--warning-dim)',
  }
  const colorMap = {
    success: 'var(--success)',
    error: 'var(--danger)',
    info: 'var(--info)',
    warning: 'var(--warning)',
  }
  const iconMap = {
    success: <Check size={14} />,
    error: <X size={14} />,
    info: <Activity size={14} />,
    warning: <Zap size={14} />,
  }

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 10,
      background: bgMap[toast.type],
      color: colorMap[toast.type],
      fontSize: 13, fontWeight: 500,
      animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
      boxShadow: 'var(--shadow-md)',
      border: `1px solid ${colorMap[toast.type]}`,
    }}>
      {iconMap[toast.type]}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, opacity: 0.6 }}>
        <X size={12} />
      </button>
    </div>
  )
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<ExtendedDevice[]>([])
  const [pending, setPending] = useState<ExtendedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newDevice, setNewDevice] = useState({ name: '', ip: '', mac: '', type: 'unknown', room: '' })
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [pinging, setPinging] = useState<Set<string>>(new Set())
  const [lastScanTime, setLastScanTime] = useState<string | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        api.get('/devices/'),
        api.get('/devices/pending')
      ])
      setDevices(d.data)
      setPending(p.data)
      if (d.data.length > 0) setLastScanTime(new Date().toISOString())
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load devices'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const scan = useCallback(async () => {
    setLoading(true)
    try {
      await api.post('/devices/scan')
      addToast('Network scan completed', 'success')
      await load()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Scan failed'
      addToast(msg, 'error')
      setLoading(false)
    }
  }, [load, addToast])

  const addDevice = useCallback(async () => {
    if (!newDevice.name.trim()) {
      addToast('Device name is required', 'warning')
      return
    }
    try {
      await api.post('/devices/add', newDevice)
      setShowAdd(false)
      setNewDevice({ name: '', ip: '', mac: '', type: 'unknown', room: '' })
      addToast('Device added successfully', 'success')
      await load()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add device'
      addToast(msg, 'error')
    }
  }, [newDevice, load, addToast])

  const approve = useCallback(async (id: string) => {
    try {
      await api.post(`/devices/${id}/approve`)
      addToast('Device approved', 'success')
      await load()
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to approve', 'error')
    }
  }, [load, addToast])

  const deny = useCallback(async (id: string) => {
    try {
      await api.post(`/devices/${id}/deny`)
      addToast('Device denied', 'info')
      await load()
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to deny', 'error')
    }
  }, [load, addToast])

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/devices/${id}`)
      addToast('Device removed', 'success')
      await load()
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to remove', 'error')
    }
  }, [load, addToast])

  const rename = useCallback(async (id: string) => {
    if (!editName.trim()) {
      addToast('Name cannot be empty', 'warning')
      return
    }
    try {
      await api.put(`/devices/${id}`, { name: editName.trim(), room: editRoom.trim() || undefined })
      setEditingId(null)
      addToast('Device updated', 'success')
      await load()
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to rename', 'error')
    }
  }, [editName, editRoom, load, addToast])

  const ping = useCallback(async (id: string) => {
    setPinging(prev => new Set(prev).add(id))
    try {
      const res = await api.post(`/devices/${id}/ping`)
      const latency = res.data?.latency ?? res.data?.ms
      if (latency !== undefined) {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, latency, status: 'online' } : d))
        addToast(`Ping: ${latency}ms`, 'success')
      } else {
        addToast('Device is reachable', 'success')
      }
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Device unreachable', 'error')
    } finally {
      setPinging(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }, [addToast])

  const toggleOnline = useCallback(async (device: ExtendedDevice) => {
    const targetStatus = device.status === 'online' || device.status === 'approved' ? 'offline' : 'online'
    try {
      await api.put(`/devices/${device.id}`, { status: targetStatus })
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: targetStatus } : d))
      addToast(`${device.name} set to ${targetStatus}`, 'success')
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to update status', 'error')
    }
  }, [addToast])

  const filtered = useMemo(() => {
    return devices.filter(d => {
      const q = search.toLowerCase()
      const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.ip?.toLowerCase().includes(q) || d.mac?.toLowerCase().includes(q)
      const matchesType = typeFilter === 'all' || d.type === typeFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'online' && (d.status === 'online' || d.status === 'approved')) ||
        (statusFilter === 'offline' && d.status !== 'online' && d.status !== 'approved')
      return matchesSearch && matchesType && matchesStatus
    })
  }, [devices, search, typeFilter, statusFilter])

  const groupedByRoom = useMemo(() => {
    const map = new Map<string, ExtendedDevice[]>()
    filtered.forEach(d => {
      const room = getRoom(d)
      if (!map.has(room)) map.set(room, [])
      map.get(room)!.push(d)
    })
    const order = ['Living Room', 'Living', 'Office', 'Bedroom', 'Kitchen', 'Garage', 'Outdoor', 'Basement', 'Unassigned']
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
  }, [filtered])

  const totalOnline = useMemo(() => devices.filter(d => d.status === 'online' || d.status === 'approved').length, [devices])
  const totalOffline = useMemo(() => devices.filter(d => d.status !== 'online' && d.status !== 'approved').length, [devices])

  const onlineCount = devices.filter(d => d.status === 'online' || d.status === 'approved').length
  const offlineCount = devices.length - onlineCount
  const pendingCount = pending.length

  const editStart = useCallback((d: ExtendedDevice) => {
    setEditingId(d.id)
    setEditName(d.name)
    setEditRoom(d.room || d.area || '')
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          maxWidth: 360,
        }}>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {/* Network Overview */}
      <div className="liquid-glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={18} style={{ color: 'var(--accent)' }} />
          Network Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'var(--text-primary)' }}>{devices.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'var(--success)' }}>{onlineCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'var(--text-muted)' }}>{offlineCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offline</div>
          </div>
          {pending.length > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'var(--warning)' }}>{pendingCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</div>
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'var(--accent)' }}>{devices.filter(d => d.type === 'router' || d.type === 'network').length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gateways</div>
          </div>
        </div>
        {lastScanTime && (
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />
            Last scan: {formatLastSeen(lastScanTime)}
          </div>
        )}
      </div>

      {/* Pending Approval */}
      {pending.length > 0 && (
        <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--warning)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={14} style={{ color: 'var(--warning)' }} />
            Pending Approval ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(d => {
              const TypeIcon = getIcon(d.type)
              const room = getRoom(d)
              return (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--warning-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--warning)'
                  }}>
                    <TypeIcon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span>{d.ip || 'No IP'}</span>
                      {d.mac && <><span>·</span><span>{d.mac}</span></>}
                      <span>·</span>
                      <span>{getTypeLabel(d.type)}</span>
                      {room !== 'Unassigned' && (
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>{room}</span>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => approve(d.id)} style={{ height: 30 }}>
                    <Check size={13} /> Approve
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deny(d.id)} style={{ height: 30, padding: '0 10px' }}>
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexWrap: 'wrap', padding: 0,
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 140, maxWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input style={{ paddingLeft: 32, height: 34, fontSize: 13, paddingRight: 8 }}
            placeholder="Search by name, IP, MAC..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ width: 'auto', height: 34, fontSize: 12, padding: '0 28px 0 10px', minWidth: 100 }}>
          <option value="all">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', height: 34, fontSize: 12, padding: '0 28px 0 10px', minWidth: 90 }}>
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={scan} style={{ height: 34 }} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Scan
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)} style={{ height: 34 }}>
          <Plus size={14} /> Add Device
        </button>
      </div>

      {/* Add Device Form */}
      {showAdd && (
        <div className="card-liquid" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} style={{ color: 'var(--accent)' }} />
            Add New Device
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Name *</label>
              <input placeholder="Device name" value={newDevice.name}
                onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))}
                style={{ height: 34, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>IP</label>
              <input placeholder="192.168.1.x" value={newDevice.ip}
                onChange={e => setNewDevice(p => ({ ...p, ip: e.target.value }))}
                style={{ height: 34, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>MAC</label>
              <input placeholder="AA:BB:CC:DD:EE:FF" value={newDevice.mac}
                onChange={e => setNewDevice(p => ({ ...p, mac: e.target.value }))}
                style={{ height: 34, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Type</label>
              <select value={newDevice.type} onChange={e => setNewDevice(p => ({ ...p, type: e.target.value }))}
                style={{ height: 34, fontSize: 12 }}>
                {DEVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, display: 'block', color: 'var(--text-secondary)' }}>Room</label>
              <input placeholder="e.g. Living Room" value={newDevice.room}
                onChange={e => setNewDevice(p => ({ ...p, room: e.target.value }))}
                style={{ height: 34, fontSize: 13 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={addDevice} style={{ height: 34 }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ alignSelf: 'flex-end' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Mini Network Map */}
      {!loading && devices.length > 0 && (
        <MiniNetworkMap devices={devices} />
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Wifi size={48} />
          <h3>{search || typeFilter !== 'all' || statusFilter !== 'all' ? 'No matching devices' : 'No devices found'}</h3>
          <p style={{ fontSize: 13 }}>
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try a different search or filter'
              : 'Scan your network or manually add a device'}
          </p>
        </div>
      ) : (
        groupedByRoom.map(([room, roomDevices]) => (
          <div key={room} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Room Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 4px', cursor: 'default',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                {ROOM_ICONS[room.toLowerCase()] || <MapPin size={14} />}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{room}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{
                display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-muted)',
              }}>
                <span style={{ color: 'var(--success)' }}>
                  {roomDevices.filter(d => d.status === 'online' || d.status === 'approved').length} online
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {roomDevices.filter(d => d.status !== 'online' && d.status !== 'approved').length} offline
                </span>
              </span>
            </div>

            {/* Device Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 8 }}>
              {roomDevices.map(d => {
                const TypeIcon = getIcon(d.type)
                const isOnline = d.status === 'online' || d.status === 'approved'
                const typeColor = TYPE_COLORS[d.type] || TYPE_COLORS.unknown
                const roomName = getRoom(d)
                return (
                  <div key={d.id} className="card-liquid" style={{
                    padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {/* Top Row: Icon + Name + Status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: isOnline ? `${typeColor}18` : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isOnline ? typeColor : 'var(--text-muted)',
                        flexShrink: 0,
                        transition: 'all var(--transition)',
                      }}>
                        <TypeIcon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingId === d.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && rename(d.id)}
                              style={{ height: 30, fontSize: 13 }} autoFocus />
                            <input value={editRoom} onChange={e => setEditRoom(e.target.value)}
                              placeholder="Room / Area"
                              onKeyDown={e => e.key === 'Enter' && rename(d.id)}
                              style={{ height: 28, fontSize: 12 }} />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => rename(d.id)}
                                style={{ height: 26, padding: '0 10px', fontSize: 11 }}>Save</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}
                                style={{ height: 26, padding: '0 10px', fontSize: 11 }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {d.name}
                              {roomName !== 'Unassigned' && (
                                <span className="badge badge-accent" style={{ fontSize: 10, gap: 3 }}>
                                  <MapPin size={10} />
                                  {roomName}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span>{d.ip || 'No IP'}</span>
                              {d.mac && <><span>·</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{d.mac}</span></>}
                              <span>·</span>
                              <span>{getTypeLabel(d.type)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: isOnline ? 'var(--success)' : 'var(--text-muted)',
                            boxShadow: isOnline ? '0 0 6px var(--success)' : 'none',
                          }} />
                          <span style={{ fontSize: 10, color: isOnline ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500 }}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        {d.latency !== undefined && (
                          <span style={{ fontSize: 10, color: d.latency < 50 ? 'var(--success)' : d.latency < 150 ? 'var(--warning)' : 'var(--danger)' }}>
                            {d.latency}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Meta + Actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      paddingTop: 8, borderTop: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ flex: 1, display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {formatLastSeen(d.last_seen)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => toggleOnline(d)}
                          title={isOnline ? 'Set offline' : 'Set online'}
                          style={{ color: isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => ping(d.id)}
                          disabled={pinging.has(d.id)}
                          title="Ping device"
                          style={{ color: 'var(--info)' }}>
                          {pinging.has(d.id) ? <Loader size={12} className="spin" /> : <Activity size={12} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => editStart(d)}
                          title="Edit device"
                          style={{ color: 'var(--accent)' }}>
                          <Edit3 size={12} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => remove(d.id)}
                          title="Remove device"
                          style={{ color: 'var(--danger)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
