import React, { useEffect, useState, useCallback } from 'react'
import {
  Image, Search, Loader, AlertCircle, Check, Info, X,
  Grid3X3, List, Trash2, FolderOpen, ChevronRight, Home
} from 'lucide-react'
import api from '../utils/api'

interface Photo {
  id: string; name: string; path: string; thumbnail: string; size: number; created_at: string
}

interface Album {
  id: string; name: string; count: number; cover?: string
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

export default function PhotosPage() {
  const [mode, setMode] = useState<'albums' | 'photos'>('albums')
  const [albums, setAlbums] = useState<Album[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [preview, setPreview] = useState<Photo | null>(null)
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
      const [albRes, phRes] = await Promise.all([
        api.get('/photos/albums'),
        api.get('/photos/list')
      ])
      setAlbums(albRes.data)
      setPhotos(phRes.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load photos')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const deletePhoto = async (id: string) => {
    try {
      await api.delete(`/photos/delete/${id}`)
      setPhotos(prev => prev.filter(p => p.id !== id))
      addToast('Photo deleted', 'success')
    } catch { addToast('Failed to delete', 'error') }
  }

  const filtered = photos.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading photos...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image size={18} /> Photos
        </h3>
        <div style={{ flex: 1 }} />
        <button className={`btn btn-sm ${mode === 'albums' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('albums')}><FolderOpen size={14} /> Albums</button>
        <button className={`btn btn-sm ${mode === 'photos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('photos')}><Image size={14} /> Photos</button>
        {mode === 'photos' && (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 160 }} />
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}
            </button>
          </>
        )}
      </div>

      {mode === 'albums' && (
        albums.length === 0 ? (
          <div className="empty-state"><FolderOpen size={48} /><h3>No albums</h3></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {albums.map(a => (
              <div key={a.id} className="card-liquid" style={{ padding: 16, cursor: 'pointer', textAlign: 'center' }} onClick={() => setMode('photos')}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
                  {a.cover ? <img src={`/api/photos/thumbnail/${a.cover}`} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Image size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.count} photos</div>
              </div>
            ))}
          </div>
        )
      )}

      {mode === 'photos' && (
        filtered.length === 0 ? (
          <div className="empty-state"><Image size={48} /><h3>{search ? 'No matching photos' : 'No photos'}</h3></div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
            {filtered.map(p => (
              <div key={p.id} className="card-liquid" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', position: 'relative' }} onClick={() => setPreview(p)}>
                <img src={`/api/photos/thumbnail/${p.id}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.style.background = 'var(--glass-bg)'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:11px\">Error</div>' }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(p => (
              <div key={p.id} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--glass-bg)' }}>
                  <img src={`/api/photos/thumbnail/${p.id}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deletePhoto(p.id)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )
      )}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}
          onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8 }}><X size={24} /></button>
          <img src={`/api/photos/image/${preview.id}`} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
