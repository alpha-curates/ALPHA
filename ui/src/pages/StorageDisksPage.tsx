import React, { useEffect, useState, useCallback } from 'react'
import {
  Disc3, AlertCircle, Check, Info, X, Loader,
  RefreshCw, Activity, HardDrive, Trash2, Zap,
  AlertTriangle, Search, Thermometer, Eye, Cpu
} from 'lucide-react'
import api from '../utils/api'

interface Disk {
  id: string; device: string; model: string; size: string; type: string; status: string; temp?: number; healthy: boolean
}

interface DiskDetails {
  id: string; device: string; model: string; serial: string; firmware: string; size: string; type: string; status: string; temp: number; healthy: boolean; smart_status: string; reallocated_sectors: number; bad_sectors: number; power_on_hours: number
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

export default function StorageDisksPage() {
  const [disks, setDisks] = useState<Disk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDisk, setSelectedDisk] = useState<DiskDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
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
    try { const r = await api.get('/storage/disks'); setDisks(r.data); setError('') }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load disks') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const showDiskDetails = async (id: string) => {
    setDetailsLoading(true)
    setSelectedDisk(null)
    try {
      const r = await api.get(`/storage/disks/${id}`)
      setSelectedDisk(r.data)
    } catch { addToast('Failed to load disk details', 'error') }
    finally { setDetailsLoading(false) }
  }

  const filtered = disks.filter(d => !search || d.model.toLowerCase().includes(search.toLowerCase()) || d.device.toLowerCase().includes(search.toLowerCase()))

  const healthColor = (d: Disk) => d.healthy ? 'var(--success)' : 'var(--danger)'
  const healthPct = (d: Disk) => d.healthy ? 100 : 30

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading disks...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Disc3 size={18} /> Disks</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search model or device..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><Disc3 size={48} /><h3>{search ? 'No matching disks' : 'No disks detected'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(d => (
            <div key={d.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => showDiskDetails(d.id)}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: d.healthy ? 'var(--success-dim)' : 'var(--danger-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: d.healthy ? 'var(--success)' : 'var(--danger)', flexShrink: 0
              }}><Disc3 size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{d.model || d.device}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace' }}>{d.device}</span>
                  <span>·</span>
                  <span>{d.size}</span>
                  <span>·</span>
                  <span>{d.type}</span>
                  {d.temp !== undefined && <><span>·</span><span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Zap size={10} /> {d.temp}°C</span></>}
                </div>
                <div style={{ width: '100%', height: 3, background: 'var(--glass-bg)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${healthPct(d)}%`, height: '100%', background: healthColor(d), borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              </div>
              <span className={`badge ${d.healthy ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>{d.healthy ? 'Healthy' : 'Unhealthy'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); showDiskDetails(d.id) }} title="Details"><Eye size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {selectedDisk && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedDisk(null)}>
          <div className="glass-card" style={{ padding: 20, maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Disc3 size={20} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{selectedDisk.model || selectedDisk.device}</h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDisk(null)}><X size={14} /></button>
            </div>
            {detailsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 20 }}>
                <Loader size={16} className="spin" /> <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading details...</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Device</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedDisk.device}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Model</div><div style={{ fontWeight: 500 }}>{selectedDisk.model}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Serial</div><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedDisk.serial}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Firmware</div><div style={{ fontWeight: 500 }}>{selectedDisk.firmware}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Size</div><div style={{ fontWeight: 500 }}>{selectedDisk.size}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Type</div><div style={{ fontWeight: 500 }}>{selectedDisk.type}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Status</div>
                  <div><span className={`badge ${selectedDisk.healthy ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>{selectedDisk.healthy ? 'Healthy' : 'Unhealthy'}</span></div>
                  <div style={{ color: 'var(--text-muted)' }}>SMART Status</div><div style={{ fontWeight: 500 }}>{selectedDisk.smart_status}</div>
                </div>
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
                  <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> SMART Data</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}><Thermometer size={12} /> Temperature</div>
                    <div style={{ fontWeight: 500 }}>{selectedDisk.temp}°C</div>
                    <div style={{ color: 'var(--text-muted)' }}>Reallocated Sectors</div>
                    <div style={{ fontWeight: 500 }}>{selectedDisk.reallocated_sectors}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Bad Sectors</div>
                    <div style={{ fontWeight: 500, color: selectedDisk.bad_sectors > 0 ? 'var(--danger)' : 'var(--success)' }}>{selectedDisk.bad_sectors}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}><Cpu size={12} /> Power-On Hours</div>
                    <div style={{ fontWeight: 500 }}>{selectedDisk.power_on_hours}h</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
