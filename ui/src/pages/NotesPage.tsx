import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText, Plus, X, Trash2, Loader, AlertCircle, Check,
  Info, Search, Edit3, Save, Clock
} from 'lucide-react'
import api from '../utils/api'

interface Note {
  id: string; title: string; content: string; created_at: string; updated_at: string
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

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
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
      const r = await api.get('/notes/list')
      setNotes(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load notes')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setShowCreate(false)
  }

  const saveNote = async () => {
    if (!selectedNote || !editTitle.trim()) return
    setSaving(true)
    try {
      await api.put(`/notes/update/${selectedNote.id}`, { title: editTitle.trim(), content: editContent })
      addToast('Note saved', 'success')
      setSelectedNote(n => n ? { ...n, title: editTitle.trim(), content: editContent } : n)
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title: editTitle.trim(), content: editContent, updated_at: new Date().toISOString() } : n))
    } catch { addToast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const createNote = async () => {
    if (!newTitle.trim()) return
    try {
      const r = await api.post('/notes/create', { title: newTitle.trim(), content: newContent })
      addToast('Note created', 'success')
      setNewTitle(''); setNewContent(''); setShowCreate(false)
      load()
    } catch { addToast('Failed to create note', 'error') }
  }

  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/notes/delete/${id}`)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (selectedNote?.id === id) setSelectedNote(null)
      addToast('Note deleted', 'success')
    } catch { addToast('Failed to delete', 'error') }
  }

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading notes...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} /> Notes
        </h3>
        <div style={{ flex: 1 }} />
        {selectedNote ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={saving}>
              {saving ? <><Loader size={14} className="spin" /> Saving...</> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedNote(null); setShowCreate(false) }}><X size={14} /> Back</button>
          </>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus size={14} /> New Note</button>
          </>
        )}
      </div>

      {showCreate && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder="Note title" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', height: 36, fontSize: 14, fontWeight: 600 }} autoFocus />
          <textarea placeholder="Write your note..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ width: '100%', minHeight: 120, fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={createNote}>Create</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {selectedNote ? (
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', height: 40, fontSize: 18, fontWeight: 600, border: 'none', background: 'transparent', color: 'var(--text-primary)' }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span>Created: {new Date(selectedNote.created_at).toLocaleString()}</span>
            <span>Updated: {new Date(selectedNote.updated_at).toLocaleString()}</span>
          </div>
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', minHeight: 300, fontSize: 13, lineHeight: 1.8, resize: 'vertical', border: 'none', background: 'transparent', color: 'var(--text-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><FileText size={48} /><h3>{search ? 'No matching notes' : 'No notes yet'}</h3></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {filtered.map(n => (
            <div key={n.id} className="glass-card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => selectNote(n)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.title || 'Untitled'}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{n.content || 'No content'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> {new Date(n.updated_at || n.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
