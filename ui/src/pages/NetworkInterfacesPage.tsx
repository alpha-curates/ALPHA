import React, { useEffect, useState, useCallback } from 'react'
import {
  Network, Wifi, WifiOff, Activity, Loader, AlertCircle,
  Check, Info, X, RefreshCw, ArrowUp, ArrowDown, Globe,
  AlertTriangle, Search, Eye, RadioTower, Repeat
} from 'lucide-react'
import api from '../utils/api'

interface NetInterface {
  id: string; name: string; type: string; ip: string; mac: string; status: string; speed?: string; duplex?: string; rx_bytes?: number; tx_bytes?: number; rx_errors?: number; tx_errors?: number
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

function formatBytes(b: number) { const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let s = b; while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ } return `${s.toFixed(1)} ${u[i]}` }

export default function NetworkInterfacesPage() {
  const [interfaces, setInterfaces] = useState<NetInterface[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIntf, setSelectedIntf] = useState<NetInterface | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<NetInterface | null>(null)
  const [rxHistory, setRxHistory] = useState<number[]>([])
  const [txHistory, setTxHistory] = useState<number[]>([])
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((m: string, t: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message: m, type: t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/network/interfaces')
      setInterfaces(r.data)
      if (r.data.length > 0) {
        const totalRx = r.data.reduce((acc: number, i: NetInterface) => acc + (i.rx_bytes || 0), 0)
        const totalTx = r.data.reduce((acc: number, i: NetInterface) => acc + (i.tx_bytes || 0), 0)
        setRxHistory(prev => [...prev.slice(-19), totalRx])
        setTxHistory(prev => [...prev.slice(-19), totalTx])
      }
      setError('')
    }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load interfaces') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const toggleInterface = async (id: string, name: string, currentStatus: string) => {
    try {
      await api.post(`/network/interfaces/${currentStatus === 'up' ? 'down' : 'up'}/${name}`)
      addToast('Interface ' + name + ' ' + (currentStatus === 'up' ? 'disabled' : 'enabled'), 'success')
      setConfirmToggle(null)
      load()
    } catch { addToast('Failed to toggle interface', 'error'); setConfirmToggle(null) }
  }

  const dhcpRenew = async (name: string) => {
    try { await api.post('/network/interfaces/dhcp-renew/' + name); addToast('DHCP renewed for ' + name, 'success'); load() }
    catch { addToast('Failed to renew DHCP for ' + name, 'error') }
  }

  const filtered = interfaces.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.ip && i.ip.includes(search)))

  const maxVal = Math.max(1, ...rxHistory, ...txHistory)
  const sparkW = 80

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading interfaces...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Network size={18} /> Network Interfaces</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search name or IP..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><Network size={48} /><h3>{search ? 'No matching interfaces' : 'No interfaces'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(intf => {
            const up = intf.status === 'up'
            return (
              <div key={intf.id} className="glass-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: up ? 'var(--success-dim)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: up ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }}>
                    {intf.type === 'wifi' ? (up ? <Wifi size={18} /> : <WifiOff size={18} />) : <Globe size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{intf.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{intf.ip || 'No IP'}</span>
                      {intf.mac && <><span>.</span><span style={{ fontFamily: 'monospace', fontSize: 10 }}>{intf.mac}</span></>}
                      {intf.speed && <><span>.</span><span>{intf.speed}</span></>}
                    </div>
                  </div>
                  {rxHistory.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 24 }}>
                      {rxHistory.slice(-10).map((v, i) => (
                        <div key={'rx'+i} style={{ width: 4, height: Math.max(2, (v / maxVal) * 22), background: 'var(--success)', borderRadius: 1, opacity: 0.8 }} title="RX" />
                      ))}
                      {txHistory.slice(-10).map((v, i) => (
                        <div key={'tx'+i} style={{ width: 4, height: Math.max(2, (v / maxVal) * 22), background: 'var(--info)', borderRadius: 1, opacity: 0.6 }} title="TX" />
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {intf.rx_bytes !== undefined && (
                      <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><ArrowDown size={10} style={{ color: 'var(--success)' }} /> {formatBytes(intf.rx_bytes)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 1 }}><ArrowUp size={10} style={{ color: 'var(--info)' }} /> {formatBytes(intf.tx_bytes)}</div>
                      </div>
                    )}
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedIntf(intf)} title="Details"><Eye size={12} /></button>
                    {up && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dhcpRenew(intf.name)} title="Renew DHCP"><Repeat size={12} /></button>
                    )}
                    <button className={'btn btn-sm ' + (up ? 'btn-success' : 'btn-ghost')} onClick={() => setConfirmToggle(intf)} style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}>
                      {up ? 'Up' : 'Down'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedIntf && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedIntf(null)}>
          <div className="glass-card" style={{ padding: 20, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Network size={18} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{selectedIntf.name}</h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedIntf(null)}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)' }}>Name</div><div style={{ fontWeight: 500 }}>{selectedIntf.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>Type</div><div style={{ fontWeight: 500 }}>{selectedIntf.type}</div>
              <div style={{ color: 'var(--text-muted)' }}>IP</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedIntf.ip || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>MAC</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedIntf.mac || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Speed</div><div style={{ fontWeight: 500 }}>{selectedIntf.speed || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Duplex</div><div style={{ fontWeight: 500 }}>{selectedIntf.duplex || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Status</div>
              <div><span className={'badge ' + (selectedIntf.status === 'up' ? 'badge-success' : 'badge-ghost')} style={{ fontSize: 10 }}>{selectedIntf.status}</span></div>
              <div style={{ color: 'var(--text-muted)' }}>RX Bytes</div><div style={{ fontWeight: 500 }}>{selectedIntf.rx_bytes !== undefined ? formatBytes(selectedIntf.rx_bytes) : 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>TX Bytes</div><div style={{ fontWeight: 500 }}>{selectedIntf.tx_bytes !== undefined ? formatBytes(selectedIntf.tx_bytes) : 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>RX Errors</div><div style={{ fontWeight: 500, color: (selectedIntf.rx_errors || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>{selectedIntf.rx_errors ?? 0}</div>
              <div style={{ color: 'var(--text-muted)' }}>TX Errors</div><div style={{ fontWeight: 500, color: (selectedIntf.tx_errors || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>{selectedIntf.tx_errors ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmToggle !== null} message={'Are you sure you want to ' + (confirmToggle?.status === 'up' ? 'disable' : 'enable') + ' ' + (confirmToggle?.name || '') + '?'} onConfirm={() => confirmToggle && toggleInterface(confirmToggle.id, confirmToggle.name, confirmToggle.status)} onCancel={() => setConfirmToggle(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
