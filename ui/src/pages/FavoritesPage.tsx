import React, { useEffect, useState, useCallback } from 'react'
import {
  Star, File, FileText, Image, Music, Video, Archive,
  Trash2, Loader, AlertCircle, Check, Info, X,
  AlertTriangle, Search
} from 'lucide-react'
import api from '../utils/api'

interface FavoriteItem {
  id: string; file_path: string; file_name: string; created_at: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

const typeIcons: Record<string, any> = {
  txt: FileText, md: FileText, py: FileText, js: FileText, ts: FileText,
  html: FileText, css: FileText, json: FileText, xml: FileText,
  jpg: Image, jpeg: Image, png: Image, gif: Image, webp: Image, svg: Image,
  mp3: Music, wav: Music, flac: Music, ogg: Music,
  mp4: Video, mov: Video, avi: Video, mkv: Video,
  zip: Archive, tar: Archive, gz: Archive, rar: Archive, '7z': Archive,
  pdf: FileText, doc: FileText, docx: FileText, xls: FileText, ppt: FileText,
  folder: File,
}

const typeCategories: Record<string, string> = {
  txt: 'document', md: 'document', py: 'document', js: 'document', ts: 'document',
  html: 'document', css: 'document', json: 'document', xml: 'document',
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document', ppt: 'document',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive',
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return typeIcons[ext] || File
}

function getFileCategory(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return typeCategories[ext] || 'other'
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

const filterTypes = [
  { key: 'all', label: 'All', icon: null },
  { key: 'document', label: 'Documents', icon: FileText },
  { key: 'image', label: 'Images', icon: Image },
  { key: 'audio', label: 'Audio', icon: Music },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'archive', label: 'Archives', icon: Archive },
] as const

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [removeTarget, setRemoveTarget] = useState<{ filePath: string; fileName: string } | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    try {
      const r = await api.get('/favorites')
      setItems(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load favorites')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const removeFavorite = async (filePath: string) => {
    setRemoveTarget(null)
    try {
      await api.post('/favorites/toggle', { file_path: filePath })
      setItems(prev => prev.filter(i => i.file_path !== filePath))
      addToast('Removed from favorites', 'success')
    } catch { addToast('Failed to remove', 'error') }
  }

  const filteredItems = items.filter(item => {
    const ext = item.file_name.split('.').pop()?.toLowerCase() || ''
    const cat = typeCategories[ext] || 'other'
    const matchesType = typeFilter === 'all' ? true : cat === typeFilter
    const matchesSearch = !searchQuery || item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.file_path.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading favorites...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={18} /> Favorites
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search favorites..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {filterTypes.map(ft => {
          const Icon = ft.icon
          const isActive = typeFilter === ft.key
          return (
            <button key={ft.key}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setTypeFilter(ft.key)}>
              {Icon && <Icon size={12} />} {ft.label}
            </button>
          )
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state"><Star size={48} /><h3>{searchQuery ? 'No matching favorites' : typeFilter !== 'all' ? 'No matching favorites' : 'No favorites yet'}</h3><p style={{ fontSize: 13 }}>Star files from the file manager to see them here</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {filteredItems.map(item => {
            const Icon = getFileIcon(item.file_name)
            return (
              <div key={item.id} className="glass-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--warning-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_path}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRemoveTarget({ filePath: item.file_path, fileName: item.file_name })} title="Remove" style={{ color: 'var(--warning)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove from Favorites"
        message={`Are you sure you want to remove "${removeTarget?.fileName}" from favorites?`}
        onConfirm={() => removeTarget && removeFavorite(removeTarget.filePath)}
        onCancel={() => setRemoveTarget(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
