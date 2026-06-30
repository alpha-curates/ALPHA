import React, { useEffect, useState, useCallback } from 'react'
import {
  Camera, Plus, X, Loader, AlertCircle, Check, Info,
  RefreshCw, Trash2, Download, HardDrive, Clock,
  AlertTriangle, Search, RotateCcw
} from 'lucide-react'
import api from '../utils/api'

interface Snapshot {
  id: string; name: string; volume: string; size: string; created_at: string; status: string
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

export default function StorageSnapshotsPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVolume, setNewVolume] = useState('')
  const [volumes, setVolumes] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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
    try {
      const [sRes, vRes] = await Promise.all([api.get('/storage/snapshots'), api.get('/storage/volumes')])
      setSnapshots(sRes.data)
      setVolumes(vRes.data.map((v: any) => v.name))
      setError('')
    } catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load snapshots') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const createSnapshot = async () => {
    if (!newName.trim() || !newVolume) return
    try {
      await api.post('/storage/snapshots/create', { name: newName.trim(), volume: newVolume })
      addToast('Snapshot created', 'success'); setShowCreate(false); setNewName(''); load()
    } catch { addToast('Failed to create snapshot', 'error') }
  }

  const deleteSnapshot = async (id: string) => {
    try { await api.delete(`/storage/snapshots/delete/${id}`); setSnapshots(prev => prev.filter(s => s.id !== id)); addToast('Snapshot deleted', 'success') }
    catch { addToast('Failed to delete snapshot', 'error') }
    finally { setConfirmDelete(null) }
  }

  const downloadSnapshot = async (id: string) => {
    try {
      const r = await api.get(`/storage/snapshots/download/${id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `snapshot-${id}.img`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      addToast('Snapshot download started', 'success')
    } catch { addToast('Failed to download snapshot', 'error') }
  }

  const restoreSnapshot = async (id: string) => {
    try { await api.post(`/storage/snapshots/restore/${id}`); addToast('Snapshot restore started', 'success'); load() }
    catch { addToast('Failed to restore snapshot', 'error') }
  }

  const filtered = snapshots.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.volume.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && s.status !== statusFilter) return false
    return true
  })

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading snapshots...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={18} /> Snapshots</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search name or volume..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 32, fontSize: 12, width: 110 }}>
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="creating">Creating</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus size={14} /> Create</button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      {showCreate && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 8 }}>
          <input placeholder="Snapshot name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, height: 32, fontSize: 13 }} />
          <select value={newVolume} onChange={e => setNewVolume(e.target.value)} style={{ width: 140, height: 32, fontSize: 12 }}>
            <option value="">Select volume...</option>
            {volumes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={createSnapshot} style={{ height: 32 }}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)} style={{ height: 32 }}>Cancel</button>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="empty-state"><Camera size={48} /><h3>{search || statusFilter ? 'No matching snapshots' : 'No snapshots'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(s => (
            <div key={s.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}><Camera size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><HardDrive size={10} /> {s.volume}</span>
                  <span>·</span>
                  <span>{s.size}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {new Date(s.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'failed' ? 'badge-danger' : 'badge-ghost'}`} style={{ fontSize: 10 }}>{s.status}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => downloadSnapshot(s.id)} title="Download"><Download size={12} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => restoreSnapshot(s.id)} title="Restore"><RotateCcw size={12} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(s.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={confirmDelete !== null} message="Are you sure you want to delete this snapshot?" onConfirm={() => confirmDelete && deleteSnapshot(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
