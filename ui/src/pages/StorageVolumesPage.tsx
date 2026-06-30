import React, { useEffect, useState, useCallback } from 'react'
import {
  HardDrive, Plus, X, Loader, AlertCircle, Check, Info,
  RefreshCw, Trash2, Activity, Server, AlertTriangle, Search, Upload, Download
} from 'lucide-react'
import api from '../utils/api'

interface Volume {
  id: string; name: string; size: string; used: string; available: string; mount: string; fs: string; status: string
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

export default function StorageVolumesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSize, setNewSize] = useState('10')
  const [newFs, setNewFs] = useState('ext4')
  const [search, setSearch] = useState('')
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
    try { const r = await api.get('/storage/volumes'); setVolumes(r.data); setError('') }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load volumes') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const createVolume = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/storage/volumes/create', { name: newName.trim(), size: newSize, fs: newFs })
      addToast('Volume created', 'success'); setShowCreate(false); setNewName(''); load()
    } catch { addToast('Failed to create volume', 'error') }
  }

  const deleteVolume = async (id: string) => {
    try { await api.delete(`/storage/volumes/delete/${id}`); setVolumes(prev => prev.filter(v => v.id !== id)); addToast('Volume deleted', 'success') }
    catch { addToast('Failed to delete volume', 'error') }
    finally { setConfirmDelete(null) }
  }

  const mountVolume = async (id: string) => {
    try { await api.post(`/storage/volumes/mount/${id}`); addToast('Volume mounted', 'success'); load() }
    catch { addToast('Failed to mount volume', 'error') }
  }

  const unmountVolume = async (id: string) => {
    try { await api.post(`/storage/volumes/unmount/${id}`); addToast('Volume unmounted', 'success'); load() }
    catch { addToast('Failed to unmount volume', 'error') }
  }

  const filtered = volumes.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()))

  const totalSize = volumes.reduce((acc, v) => acc + (parseInt(v.size) || 0), 0)
  const totalUsed = volumes.reduce((acc, v) => acc + (parseInt(v.used) || 0), 0)
  const totalAvailable = volumes.reduce((acc, v) => acc + (parseInt(v.available) || 0), 0)
  const totalPct = totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0
  const totalBarColor = totalPct >= 80 ? 'var(--danger)' : totalPct >= 60 ? 'var(--warning)' : 'var(--success)'

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading volumes...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><HardDrive size={18} /> Volumes</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Filter by name..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus size={14} /> Create</button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>
      {showCreate && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 8 }}>
          <input placeholder="Volume name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, height: 32, fontSize: 13 }} />
          <input placeholder="Size (GB)" type="number" value={newSize} onChange={e => setNewSize(e.target.value)} style={{ width: 80, height: 32, fontSize: 13 }} />
          <select value={newFs} onChange={e => setNewFs(e.target.value)} style={{ width: 80, height: 32, fontSize: 12 }}>
            <option value="ext4">ext4</option><option value="btrfs">btrfs</option><option value="xfs">xfs</option><option value="ntfs">NTFS</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={createVolume} style={{ height: 32 }}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)} style={{ height: 32 }}>Cancel</button>
        </div>
      )}
      {volumes.length > 0 && (
        <div className="glass-card" style={{ padding: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Total Storage</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <span>Size: {totalSize} GB</span>
              <span>Used: {totalUsed} GB</span>
              <span>Available: {totalAvailable} GB</span>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 200 }}>
            <div style={{ width: '100%', height: 6, background: 'var(--glass-bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${totalPct}%`, height: '100%', background: totalBarColor, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>{totalPct}% used</div>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="empty-state"><HardDrive size={48} /><h3>{search ? 'No matching volumes' : 'No volumes'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(v => {
            const usedPct = v.size && v.used ? Math.round((parseInt(v.used) / parseInt(v.size)) * 100) : 0
            const barColor = usedPct >= 80 ? 'var(--danger)' : usedPct >= 60 ? 'var(--warning)' : 'var(--success)'
            return (
              <div key={v.id} className="glass-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <HardDrive size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{v.name}</span>
                  <span className={`badge ${v.status === 'mounted' ? 'badge-success' : 'badge-ghost'}`} style={{ fontSize: 10 }}>{v.status}</span>
                  {v.status === 'mounted' ? (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => unmountVolume(v.id)} title="Unmount"><Download size={12} /></button>
                  ) : (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => mountVolume(v.id)} title="Mount"><Upload size={12} /></button>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(v.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, marginBottom: 6 }}>
                  <span>Size: {v.size}</span><span>Used: {v.used}</span><span>Available: {v.available}</span>
                  <span>FS: {v.fs}</span><span>Mount: {v.mount}</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'var(--glass-bg)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${usedPct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog open={confirmDelete !== null} message="Are you sure you want to delete this volume? This action cannot be undone." onConfirm={() => confirmDelete && deleteVolume(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
