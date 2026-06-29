import React, { useEffect, useState } from 'react'
import api from '../utils/api'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('personal')

  const load = async () => {
    try {
      const r = await api.get('/tools/notes')
      setNotes(r.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (editing) {
      await api.put(`/tools/notes/${editing.id}`, { title, content, category })
    } else {
      await api.post('/tools/notes', { title, content, category })
    }
    setEditing(null); setTitle(''); setContent(''); setCategory('personal')
    load()
  }

  const remove = async (id: string) => {
    await api.delete(`/tools/notes/${id}`)
    load()
  }

  const togglePin = async (note: any) => {
    await api.put(`/tools/notes/${note.id}`, { pinned: !note.pinned })
    load()
  }

  const edit = (note: any) => {
    setEditing(note); setTitle(note.title); setContent(note.content); setCategory(note.category)
  }

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setTitle(''); setContent(''); setCategory('personal') }}>New Note</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? <div className="loading">Loading notes...</div> : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No notes yet</div>
          ) : filtered.map(n => (
            <div key={n.id} onClick={() => edit(n)}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                transition: 'all 0.2s', opacity: n.pinned ? 1 : 0.85,
                borderLeft: `3px solid ${n.pinned ? 'var(--accent)' : 'var(--glass-border)'}`
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>{n.title || 'Untitled'}</strong>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{n.category}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); togglePin(n) }} title={n.pinned ? 'Unpin' : 'Pin'}>
                    📌
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); remove(n.id) }} title="Delete">🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.content?.slice(0, 120) || 'Empty note'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{editing ? 'Edit Note' : 'New Note'}</h3>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
        <textarea placeholder="Content..." value={content} onChange={e => setContent(e.target.value)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }} />
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="personal">Personal</option>
          <option value="work">Work</option>
          <option value="idea">Ideas</option>
          <option value="todo">To-Do</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>{editing ? 'Update' : 'Create'}</button>
          {editing && <button className="btn" onClick={() => { setEditing(null); setTitle(''); setContent(''); setCategory('personal') }}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}
