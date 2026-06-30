import React, { useEffect, useState, useCallback } from 'react'
import {
  Database, Download, Upload, Trash2, Plus, X, File,
  Loader, AlertCircle, Check, Info, HardDrive,
  AlertTriangle, Search, ArrowUpDown
} from 'lucide-react'
import api from '../utils/api'

interface BackupArchive {
  id: string; filename: string; size: number
  includes_storage: boolean; created_at: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

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

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '90%' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(b: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupArchive[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState(0)
  const [includeStorage, setIncludeStorage] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'size'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; filename: string } | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => { setToasts(prev => prev.filter(t => t.id !== id)) }, [])

  const load = useCallback(async () => {
    try {
      const r = await api.get('/backup/list')
      setBackups(r.data)
      setLoadError('')
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || 'Failed to load backups')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const createBackup = async () => {
    setCreating(true)
    setCreateProgress(0)
    const interval = setInterval(() => {
      setCreateProgress(prev => Math.min(prev + 10, 90))
    }, 500)
    try {
      const r = await api.post('/backup/create', { include_storage: includeStorage })
      clearInterval(interval)
      setCreateProgress(100)
      setTimeout(() => { setCreating(false); setCreateProgress(0) }, 500)
      addToast(r.data.message || 'Backup created', 'success')
      setIncludeStorage(false); load()
    } catch (err: any) {
      clearInterval(interval)
      setCreating(false)
      setCreateProgress(0)
      addToast(err.response?.data?.error || err.message || 'Failed to create backup', 'error')
    }
  }

  const downloadBackup = async (id: string) => {
    try {
      const r = await api.get(`/backup/download/${id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'backup.tar.gz'; a.click()
      window.URL.revokeObjectURL(url)
      addToast('Download started', 'success')
    } catch { addToast('Failed to download backup', 'error') }
  }

  const deleteBackup = async (id: string) => {
    try {
      await api.delete(`/backup/delete/${id}`)
      setBackups(prev => prev.filter(b => b.id !== id))
      addToast('Backup deleted', 'success')
    } catch { addToast('Failed to delete backup', 'error') }
  }

  const restoreBackup = async () => {
    if (!restoreFile) return
    setRestoring(true)
    try {
      const form = new FormData()
      form.append('file', restoreFile)
      await api.post('/backup/restore', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Backup restored. Server may restart.', 'success')
      setRestoreFile(null)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to restore backup', 'error')
    } finally { setRestoring(false) }
  }

  const filteredBackups = backups
    .filter(b => !searchQuery || b.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'date') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return dir * (a.size - b.size)
    })

  const toggleSort = (field: 'date' | 'size') => {
    if (sortBy === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const sortLabel = sortDir === 'asc' ? ' ▲' : ' ▼'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} /> Backups
        </h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={creating}>
          {creating ? <><Loader size={14} className="spin" /> Creating...</> : <><Plus size={14} /> Create Backup</>}
        </button>
      </div>

      {creating && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Creating backup...</div>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{ width: `${createProgress}%`, height: '100%', borderRadius: 4, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeStorage} onChange={e => setIncludeStorage(e.target.checked)} style={{ width: 16, height: 16 }} />
          Include storage files in backup
        </label>
        <div style={{ flex: 1 }} />
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> Restore
          <input type="file" accept=".tar.gz" style={{ display: 'none' }} onChange={e => setRestoreFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      {restoreFile && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--warning)' }}>
          <File size={16} style={{ color: 'var(--warning)' }} />
          <span style={{ flex: 1, fontSize: 13 }}>{restoreFile.name}</span>
          <button className="btn btn-primary btn-sm" onClick={restoreBackup} disabled={restoring}>
            {restoring ? <><Loader size={14} className="spin" /> Restoring...</> : 'Restore'}
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRestoreFile(null)}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Filter by filename..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }} />
        </div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => toggleSort('date')}>
          <ArrowUpDown size={12} /> Date{sortBy === 'date' ? sortLabel : ''}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => toggleSort('size')}>
          <ArrowUpDown size={12} /> Size{sortBy === 'size' ? sortLabel : ''}
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading backups...</h3></div>
      ) : loadError ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{loadError}</h3></div>
      ) : filteredBackups.length === 0 ? (
        <div className="empty-state"><Database size={48} /><h3>{searchQuery ? 'No matching backups' : 'No backups yet'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredBackups.map(b => (
            <div key={b.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                <HardDrive size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                  <span>{formatBytes(b.size)}</span><span>·</span>
                  <span>{new Date(b.created_at).toLocaleString()}</span>
                  {b.includes_storage && <><span>·</span><span style={{ color: 'var(--info)' }}>Includes storage</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => downloadBackup(b.id)} title="Download"><Download size={14} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete({ id: b.id, filename: b.filename })} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Backup"
        message={`Are you sure you want to delete "${confirmDelete?.filename}"? This action cannot be undone.`}
        onConfirm={() => { if (confirmDelete) { deleteBackup(confirmDelete.id); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
