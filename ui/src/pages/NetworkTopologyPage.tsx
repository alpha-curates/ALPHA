import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Network, Wifi, Monitor, Server, Radio, Activity,
  RefreshCw, Loader, AlertCircle, Check, Info, X,
  Map, WifiOff, Zap, AlertTriangle, Search, Eye,
  RadioTower
} from 'lucide-react'
import api from '../utils/api'

interface NetDevice {
  id: string; name: string; type: string; ip: string; mac: string; status: string; room?: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

interface ConfirmDialogProps {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void
}

function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card" style={{ padding: 20, maxWidth: 360, width: '90%' }}>
        <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

const toastStyle = (t: ToastData['type']) => ({
  padding: '10px 14px', borderRadius: 10,
  background: t === 'error' ? 'var(--danger-dim)' : t === 'success' ? 'var(--success-dim)' : t === 'warning' ? 'var(--warning-dim)' : 'var(--info-dim)',
  color: t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)',
  fontSize: 13, fontWeight: 500, animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
  boxShadow: 'var(--shadow-md)', border: `1px solid ${t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
  display: 'flex', alignItems: 'center', gap: 8,
})

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
      {toasts.map(t => (
        <div key={t.id} style={toastStyle(t.type)}>
          {t.type === 'error' ? <AlertCircle size={14} /> : t.type === 'success' ? <Check size={14} /> : t.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, opacity: 0.6 }}><X size={12} /></button>
        </div>
      ))}
    </div>
  )
}

const typeIcons: Record<string, any> = { server: Server, router: Wifi, switch: Radio, firewall: Activity, 'raspberry-pi': Monitor, desktop: Monitor, laptop: Monitor, phone: Radio, tablet: Radio, printer: Monitor, esp32: Radio, camera: Activity }
function getIcon(type: string) { return typeIcons[type] || Monitor }

export default function NetworkTopologyPage() {
  const [devices, setDevices] = useState<NetDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<NetDevice | null>(null)
  const [scanning, setScanning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((m: string, t: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message: m, type: t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/devices/'); setDevices(r.data); setError('') }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load devices') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const scanNetwork = async () => {
    setScanning(true)
    try {
      await api.post('/system_tools/scan', {})
      addToast('Network scan completed', 'success'); load()
    } catch { addToast('Network scan failed', 'error') }
    finally { setScanning(false) }
  }

  const pingDevice = async (ip: string) => {
    try {
      await api.post('/system_tools/ping', { host: ip, count: 2 })
      addToast('Ping to ' + ip + ' successful', 'success')
    } catch { addToast('Ping to ' + ip + ' failed', 'error') }
  }

  const routers = useMemo(() => devices.filter(d => d.type === 'router' || d.type === 'network'), [devices])
  const others = useMemo(() => {
    let filtered = devices.filter(d => d.type !== 'router' && d.type !== 'network')
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || d.ip?.includes(q) || d.type.toLowerCase().includes(q))
    }
    return filtered
  }, [devices, search])

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading topology...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Map size={18} /> Network Topology</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={scanNetwork} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {scanning ? <Loader size={14} className="spin" /> : <RadioTower size={14} />} {scanning ? 'Scanning...' : 'Scan'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      <div className="liquid-glass" style={{ padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {routers.length === 0 && others.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No devices found. Scan your network.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {routers.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 24, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedDevice(r)}>
                  <Wifi size={16} /> {r.name}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ width: 2, height: 16, background: 'var(--glass-border)', borderRadius: 1 }} />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
              {others.map(d => {
                const Icon = getIcon(d.type)
                const online = d.status === 'online' || d.status === 'approved'
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: online ? 'var(--success-dim)' : 'var(--glass-bg)', fontSize: 12, color: online ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSelectedDevice(d)}>
                    <Icon size={14} /> {d.name}
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? 'var(--success)' : 'var(--text-muted)', boxShadow: online ? '0 0 6px var(--success)' : 'none' }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedDevice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedDevice(null)}>
          <div className="glass-card" style={{ padding: 20, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Eye size={18} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{selectedDevice.name}</h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDevice(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)' }}>Name</div><div style={{ fontWeight: 500 }}>{selectedDevice.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>Type</div><div style={{ fontWeight: 500 }}>{selectedDevice.type}</div>
              <div style={{ color: 'var(--text-muted)' }}>IP</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedDevice.ip || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>MAC</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedDevice.mac || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Room</div><div style={{ fontWeight: 500 }}>{selectedDevice.room || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Status</div>
              <div><span className={`badge ${selectedDevice.status === 'online' || selectedDevice.status === 'approved' ? 'badge-success' : 'badge-ghost'}`} style={{ fontSize: 10 }}>{selectedDevice.status}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { pingDevice(selectedDevice.ip); setSelectedDevice(null) }} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                <Zap size={12} /> Ping Device
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
