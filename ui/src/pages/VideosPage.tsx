import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Video, Play, Search, Loader, AlertCircle, Check, Info,
  X, Clock, HardDrive, Film, Trash2, Upload, ArrowUpDown
} from 'lucide-react'
import api from '../utils/api'

interface VideoFile {
  id: string; title: string; duration: number; size: number; path: string; thumbnail?: string; created_at: string
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

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatBytes(b: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

type SortKey = 'title' | 'duration' | 'date'

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [playing, setPlaying] = useState<VideoFile | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VideoFile | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/videos/library')
      setVideos(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load videos')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/videos/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Video uploaded', 'success')
      load()
    } catch { addToast('Upload failed', 'error') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const deleteVideo = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/videos/delete/${deleteTarget.id}`)
      setVideos(prev => prev.filter(v => v.id !== deleteTarget.id))
      if (playing?.id === deleteTarget.id) setPlaying(null)
      addToast('Video deleted', 'success')
    } catch { addToast('Failed to delete', 'error') }
    finally { setDeleteTarget(null) }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const filtered = videos.filter(v =>
    !search || v.title.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortKey === 'duration') cmp = a.duration - b.duration
    else if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sortAsc ? cmp : -cmp
  })

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading videos...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={deleteVideo}
        onCancel={() => setDeleteTarget(null)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={18} /> Videos
        </h3>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center' }}>
          <button className={`btn btn-xs ${sortKey === 'title' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleSort('title')}>
            Title {sortKey === 'title' && (sortAsc ? '↑' : '↓')}
          </button>
          <button className={`btn btn-xs ${sortKey === 'duration' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleSort('duration')}>
            Duration {sortKey === 'duration' && (sortAsc ? '↑' : '↓')}
          </button>
          <button className={`btn btn-xs ${sortKey === 'date' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleSort('date')}>
            Date {sortKey === 'date' && (sortAsc ? '↑' : '↓')}
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
        <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUpload} />
        <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader size={14} className="spin" /> Uploading...</> : <><Upload size={14} /> Upload</>}
        </button>
      </div>

      {playing && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0 }}>
              <Video size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{playing.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDuration(playing.duration)}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPlaying(null)}><X size={14} /> Close</button>
          </div>
          <div style={{ background: '#000', borderRadius: 8, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <video controls style={{ width: '100%', height: '100%', borderRadius: 8 }} src={`/api/videos/stream/${playing.id}`} autoPlay>
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state"><Video size={48} /><h3>{search ? 'No matching videos' : 'No videos found'}</h3></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {sorted.map(v => (
            <div key={v.id} className="card-liquid" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
              <div onClick={() => setPlaying(v)}>
                <div style={{ background: 'var(--glass-bg)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {v.thumbnail ? (
                    <img src={`/api/videos/thumbnail/${v.id}`} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Film size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  )}
                  <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                    {formatDuration(v.duration)}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.3)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Play size={20} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {formatDuration(v.duration)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><HardDrive size={10} /> {formatBytes(v.size)}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(v)}
                title="Delete" style={{ position: 'absolute', top: 6, right: 6, color: 'var(--danger)', background: 'rgba(0,0,0,0.5)' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
