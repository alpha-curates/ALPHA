import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Network, Wifi, Monitor, Server, Radio, Activity,
  RefreshCw, Search, Loader, AlertCircle, Check, Info, X,
  WifiOff, Map, List, Zap, Clock, Globe
} from 'lucide-react'
import api from '../utils/api'

interface NetDevice {
  id: string; name: string; type: string; ip: string; mac: string
  status: string; last_seen: string; room?: string; latency?: number
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

const typeIcons: Record<string, any> = {
  server: Server, router: Wifi, switch: Radio, firewall: Activity,
  'raspberry-pi': Monitor, desktop: Monitor, laptop: Monitor,
  phone: Radio, tablet: Radio, printer: Monitor,
  esp32: Radio, camera: Activity,
}

function getIcon(type: string) { return typeIcons[type] || Monitor }

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

export default function NetworkPage() {
  const [tab, setTab] = useState<'topology' | 'devices'>('topology')
  const [devices, setDevices] = useState<NetDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pingHost, setPingHost] = useState('')
  const [pingResult, setPingResult] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/devices/')
      setDevices(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load devices')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const scan = async () => {
    try {
      await api.post('/devices/scan')
      addToast('Network scan completed', 'success')
      load()
    } catch { addToast('Scan failed', 'error') }
  }

  const ping = async () => {
    if (!pingHost.trim()) return
    setPingResult('Pinging...')
    try {
      const r = await api.post('/system_tools/ping', { host: pingHost.trim(), count: 2 })
      setPingResult(r.data.output || 'Host unreachable')
    } catch (err: any) {
      setPingResult(err.response?.data?.error || 'Ping failed')
    }
  }

  const routers = useMemo(() => devices.filter(d => d.type === 'router' || d.type === 'network'), [devices])
  const others = useMemo(() => devices.filter(d => d.type !== 'router' && d.type !== 'network'), [devices])

  const filteredDevices = useMemo(() => {
    if (!search) return devices
    const q = search.toLowerCase()
    return devices.filter(d =>
      d.name.toLowerCase().includes(q) || d.ip?.toLowerCase().includes(q) || d.mac?.toLowerCase().includes(q)
    )
  }, [devices, search])

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading network...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network size={18} /> Network
        </h3>
        <div style={{ flex: 1 }} />
        <button className={`btn btn-sm ${tab === 'topology' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('topology')}>
          <Map size={14} /> Topology
        </button>
        <button className={`btn btn-sm ${tab === 'devices' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('devices')}>
          <List size={14} /> Devices
        </button>
        <button className="btn btn-primary btn-sm" onClick={scan}><RefreshCw size={14} /> Scan</button>
      </div>

      {tab === 'topology' && (
        <>
          <div className="liquid-glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Map size={16} style={{ color: 'var(--accent)' }} /> Network Topology
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {routers.length === 0 && others.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No devices found. Scan your network.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {routers.map(r => (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
                        borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent)',
                        fontSize: 12, fontWeight: 600
                      }}>
                        <Wifi size={14} /> {r.name}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ width: 2, height: 14, background: 'var(--glass-border)', borderRadius: 1 }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500 }}>
                    {others.slice(0, 20).map(d => {
                      const Icon = getIcon(d.type)
                      const online = d.status === 'online' || d.status === 'approved'
                      return (
                        <div key={d.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px',
                          borderRadius: 16, background: online ? 'var(--success-dim)' : 'var(--glass-bg)',
                          fontSize: 11, color: online ? 'var(--success)' : 'var(--text-muted)'
                        }}>
                          <Icon size={12} /> {d.name}
                        </div>
                      )
                    })}
                    {others.length > 20 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>
                        +{others.length - 20} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} /> Ping Tool
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Hostname or IP address" value={pingHost}
                onChange={e => setPingHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ping()}
                style={{ flex: 1, height: 34, fontSize: 13 }} />
              <button className="btn btn-primary btn-sm" onClick={ping} style={{ height: 34 }}>
                <Activity size={14} /> Ping
              </button>
            </div>
            {pingResult && (
              <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--glass-bg)', padding: 10, borderRadius: 8, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {pingResult}
              </pre>
            )}
          </div>
        </>
      )}

      {tab === 'devices' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }} />
            </div>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="empty-state"><Wifi size={48} /><h3>No devices found</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredDevices.map(d => {
                const Icon = getIcon(d.type)
                const online = d.status === 'online' || d.status === 'approved'
                return (
                  <div key={d.id} className="glass-card" style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: online ? 'var(--success-dim)' : 'var(--glass-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: online ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                        <span>{d.ip || 'No IP'}</span>
                        {d.mac && <><span>·</span><span style={{ fontSize: 10 }}>{d.mac}</span></>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {d.latency !== undefined && <span style={{ fontSize: 10, color: d.latency < 50 ? 'var(--success)' : 'var(--warning)' }}>{d.latency}ms</span>}
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: online ? 'var(--success)' : 'var(--text-muted)',
                        boxShadow: online ? '0 0 6px var(--success)' : 'none'
                      }} />
                      <span style={{ fontSize: 10, color: online ? 'var(--success)' : 'var(--text-muted)' }}>{online ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
