import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Bookmark, Plus, X, Trash2, Loader, AlertCircle, Check,
  Info, Search, Edit3, Save, Link, Folder, ExternalLink,
  AlertTriangle, Download, Upload, MoreHorizontal, Copy
} from 'lucide-react'
import api from '../utils/api'

interface BookmarkItem {
  id: string; title: string; url: string; folder: string; created_at: string
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

function ConfirmDialog({ show, title, message, onConfirm, onCancel }: { show: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div className="glass-card" style={{ padding: 20, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>{title}</h4>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-sm" onClick={onConfirm} style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('All')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newFolder, setNewFolder] = useState('General')
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
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
      const r = await api.get('/bookmarks/list')
      setBookmarks(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load bookmarks')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const handleClick = () => setMenuOpen(null); document.addEventListener('click', handleClick); return () => document.removeEventListener('click', handleClick) }, [])

  const addBookmark = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return
    try {
      await api.post('/bookmarks/add', { title: newTitle.trim(), url: newUrl.trim(), folder: newFolder })
      addToast('Bookmark added', 'success')
      setNewTitle(''); setNewUrl(''); setNewFolder('General'); setShowAdd(false)
      load()
    } catch { addToast('Failed to add bookmark', 'error') }
  }

  const confirmDelete = (id: string) => {
    setDeleteTarget(id)
    setShowConfirm(true)
  }

  const deleteBookmark = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/bookmarks/delete/${deleteTarget}`)
      setBookmarks(prev => prev.filter(b => b.id !== deleteTarget))
      addToast('Bookmark deleted', 'success')
    } catch { addToast('Failed to delete', 'error') }
    finally { setShowConfirm(false); setDeleteTarget(null) }
  }

  const updateBookmark = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) return
    try {
      await api.put(`/bookmarks/update/${id}`, { title: editTitle.trim(), url: editUrl.trim() })
      addToast('Bookmark updated', 'success')
      setEditing(null)
      load()
    } catch { addToast('Failed to update', 'error') }
  }

  const exportBookmarks = async () => {
    try {
      const r = await api.get('/bookmarks/export')
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'bookmarks.json'; a.click()
      URL.revokeObjectURL(url)
      addToast('Bookmarks exported', 'success')
    } catch { addToast('Failed to export', 'error') }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post('/bookmarks/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Bookmarks imported', 'success')
      load()
    } catch { addToast('Failed to import', 'error') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      addToast('URL copied', 'success')
    } catch { addToast('Failed to copy URL', 'error') }
  }

  const folders = ['All', ...new Set(bookmarks.map(b => b.folder).filter(Boolean))]
  const filtered = bookmarks.filter(b => {
    if (selectedFolder !== 'All' && b.folder !== selectedFolder) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.url.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading bookmarks...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfirmDialog show={showConfirm} title="Delete Bookmark" message="Are you sure you want to delete this bookmark?" onConfirm={deleteBookmark} onCancel={() => { setShowConfirm(false); setDeleteTarget(null) }} />
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bookmark size={18} /> Bookmarks <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({bookmarks.length})</span>
        </h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportBookmarks} title="Export JSON"><Download size={14} /> Export</button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} title="Import JSON"><Upload size={14} /> Import</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Add</button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ flex: 1, height: 32, fontSize: 13 }} />
            <input placeholder="URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ flex: 2, height: 32, fontSize: 13 }} />
            <input placeholder="Folder" value={newFolder} onChange={e => setNewFolder(e.target.value)} style={{ width: 120, height: 32, fontSize: 13 }} />
            <button className="btn btn-primary btn-sm" onClick={addBookmark} style={{ height: 32 }}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ height: 32 }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {folders.map(f => (
          <button key={f} className={`btn btn-sm ${selectedFolder === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedFolder(f)}
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Folder size={12} /> {f} {f !== 'All' && `(${bookmarks.filter(b => b.folder === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><Bookmark size={48} /><h3>{search ? 'No matching bookmarks' : 'No bookmarks'}</h3></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
          {filtered.map(b => (
            <div key={b.id} className="glass-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                <Bookmark size={14} />
              </div>
              {editing === b.id ? (
                <div style={{ flex: 1, display: 'flex', gap: 4, flexDirection: 'column' }}>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ height: 28, fontSize: 12 }} />
                  <input value={editUrl} onChange={e => setEditUrl(e.target.value)} style={{ height: 28, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => updateBookmark(b.id)} style={{ fontSize: 10, height: 24, padding: '0 8px' }}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} style={{ fontSize: 10, height: 24, padding: '0 8px' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.url}</div>
                  </div>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Open"><ExternalLink size={12} /></a>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(b.id); setEditTitle(b.title); setEditUrl(b.url) }} title="Edit"><Edit3 size={12} /></button>
                  <div style={{ position: 'relative' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === b.id ? null : b.id) }} title="More"><MoreHorizontal size={12} /></button>
                    {menuOpen === b.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, minWidth: 150, background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, gap: 6 }} onClick={() => { copyUrl(b.url); setMenuOpen(null) }}><Copy size={12} /> Copy URL</button>
                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, gap: 6 }} onClick={() => { window.open(b.url, '_blank'); setMenuOpen(null) }}><ExternalLink size={12} /> Open in new tab</button>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => confirmDelete(b.id)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
