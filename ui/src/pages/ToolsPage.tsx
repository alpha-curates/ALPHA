import React, { useEffect, useState } from 'react'
import { Key, QrCode, Link, FileText, CheckSquare, Bookmark, Plus, Trash2, Pin, Edit3 } from 'lucide-react'
import api from '../utils/api'

export default function ToolsPage() {
  const [tab, setTab] = useState('notes')
  const tabs = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'todos', label: 'Todos', icon: CheckSquare },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'qrcode', label: 'QR Code', icon: QrCode },
    { id: 'shorten', label: 'Shorten', icon: Link },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'notes' && <NotesTab />}
      {tab === 'todos' && <TodosTab />}
      {tab === 'bookmarks' && <BookmarksTab />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'qrcode' && <QRCodeTab />}
      {tab === 'shorten' && <ShortenTab />}
    </div>
  )
}

function NotesTab() {
  const [notes, setNotes] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('personal')

  useEffect(() => { api.get('/tools/notes').then(r => setNotes(r.data)).catch(() => {}) }, [])

  const save = async () => {
    if (editing) {
      await api.put(`/tools/notes/${editing.id}`, { title, content, category })
    } else {
      await api.post('/tools/notes', { title, content, category })
    }
    setEditing(null); setTitle(''); setContent('')
    const r = await api.get('/tools/notes'); setNotes(r.data)
  }

  const remove = async (id: string) => {
    await api.delete(`/tools/notes/${id}`)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const togglePin = async (n: any) => {
    await api.put(`/tools/notes/${n.id}`, { pinned: !n.pinned })
    const r = await api.get('/tools/notes'); setNotes(r.data)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 32, fontSize: 13 }} />
        <textarea placeholder="Content (Markdown supported)" value={content} onChange={e => setContent(e.target.value)} style={{ height: 100, fontSize: 13, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: 'auto', height: 32, fontSize: 12 }}>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="idea">Ideas</option>
            <option value="recipe">Recipes</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={save}>{editing ? 'Update' : 'Add Note'}</button>
          {editing && <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setTitle(''); setContent('') }}>Cancel</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
        {notes.map(n => (
          <div key={n.id} className="glass-card" style={{ padding: 12, borderLeft: n.pinned ? '3px solid var(--accent)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.category}</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => togglePin(n)} title={n.pinned ? 'Unpin' : 'Pin'}>
                <Pin size={12} style={{ color: n.pinned ? 'var(--accent)' : undefined }} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(n); setTitle(n.title); setContent(n.content); setCategory(n.category) }} title="Edit">
                <Edit3 size={12} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(n.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'hidden' }}>
              {n.content?.slice(0, 200)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{new Date(n.updated_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TodosTab() {
  const [todos, setTodos] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')

  useEffect(() => { api.get('/tools/todos').then(r => setTodos(r.data)).catch(() => {}) }, [])

  const add = async () => {
    if (!title.trim()) return
    await api.post('/tools/todos', { title, priority })
    setTitle('')
    const r = await api.get('/tools/todos'); setTodos(r.data)
  }

  const toggle = async (t: any) => {
    await api.put(`/tools/todos/${t.id}`, { completed: !t.completed })
    setTodos(prev => prev.map(t2 => t2.id === t.id ? { ...t2, completed: !t.completed } : t2))
  }

  const remove = async (id: string) => {
    await api.delete(`/tools/todos/${id}`)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const filtered = todos.filter(t => filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed)
  const pending = todos.filter(t => !t.completed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 6 }}>
        <input placeholder="Add a task..." value={title} onChange={e => setTitle(e.target.value)}
          style={{ flex: 1, height: 32, fontSize: 13 }}
          onKeyDown={e => e.key === 'Enter' && add()} />
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: 'auto', height: 32, fontSize: 12 }}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={add}>Add</button>
      </div>
      <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <button className={`btn btn-ghost btn-sm ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>All ({todos.length})</button>
        <button className={`btn btn-ghost btn-sm ${filter === 'active' ? 'btn-primary' : ''}`} onClick={() => setFilter('active')}>Active ({pending})</button>
        <button className={`btn btn-ghost btn-sm ${filter === 'done' ? 'btn-primary' : ''}`} onClick={() => setFilter('done')}>Done ({todos.length - pending})</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(t => (
          <div key={t.id} className="glass-card" style={{
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            opacity: t.completed ? 0.5 : 1
          }}>
            <input type="checkbox" checked={t.completed} onChange={() => toggle(t)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <div style={{
              flex: 1, fontSize: 14,
              textDecoration: t.completed ? 'line-through' : 'none',
              color: t.completed ? 'var(--text-muted)' : undefined
            }}>{t.title}</div>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8,
              background: t.priority === 'high' ? 'var(--danger-dim)' : t.priority === 'medium' ? 'var(--warning-dim)' : 'var(--success-dim)',
              color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'var(--success)'
            }}>{t.priority}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(t.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookmarksTab() {
  const [bms, setBms] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('General')
  const [folders, setFolders] = useState<string[]>(['General'])
  const [newFolder, setNewFolder] = useState('')

  useEffect(() => {
    api.get('/tools/bookmarks').then(r => setBms(r.data)).catch(() => {})
    api.get('/tools/bookmarks/folders').then(r => setFolders(['General', ...r.data.filter((f: string) => f !== 'General')])).catch(() => {})
  }, [])

  const add = async () => {
    if (!url.trim()) return
    const f = newFolder || folder
    await api.post('/tools/bookmarks', { url, title: title || url, folder: f })
    setUrl(''); setTitle(''); setNewFolder('')
    const r = await api.get('/tools/bookmarks'); setBms(r.data)
  }

  const remove = async (id: string) => {
    await api.delete(`/tools/bookmarks/${id}`)
    setBms(prev => prev.filter(b => b.id !== id))
  }

  const grouped = folders.reduce((acc: any, f) => {
    acc[f] = bms.filter(b => b.folder === f)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} style={{ height: 32, fontSize: 13 }} />
        <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 32, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={newFolder || folder} onChange={e => { setFolder(e.target.value); setNewFolder('') }} style={{ width: 'auto', height: 32, fontSize: 12 }}>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
            <option value="__new__">+ New Folder</option>
          </select>
          {newFolder && <input placeholder="Folder name" value={newFolder} onChange={e => setNewFolder(e.target.value)} style={{ height: 32, fontSize: 12, flex: 1 }} />}
          <button className="btn btn-primary btn-sm" onClick={add}>Add</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(grouped).map(([f, items]) =>
          items.length > 0 && (
            <div key={f}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>{f}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(b => (
                  <div key={b.id} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {b.favicon ? <img src={b.favicon} alt="" style={{ width: 16, height: 16 }} /> : '🔗'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={b.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>{b.title || b.url}</a>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.url}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function PasswordTab() {
  const [password, setPassword] = useState('')
  const [length, setLength] = useState(20)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)

  const generate = async () => {
    const r = await api.post('/tools/password', { length, upper, lower, digits, symbols })
    setPassword(r.data.password)
  }

  const copy = () => navigator.clipboard.writeText(password)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600 }}>Password Generator</h4>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={generate}><Key size={14} /> Generate</button>
        </div>
        {password && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              flex: 1, fontFamily: 'monospace', fontSize: 18, padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)', borderRadius: 8, letterSpacing: 1,
              wordBreak: 'break-all'
            }}>{password}</div>
            <button className="btn btn-ghost btn-icon" onClick={copy} title="Copy">📋</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            Length: <input type="number" value={length} onChange={e => setLength(+e.target.value)} min="4" max="128" style={{ width: 56, height: 28, fontSize: 12 }} />
          </label>
          {[
            ['A-Z', upper, setUpper], ['a-z', lower, setLower],
            ['0-9', digits, setDigits], ['!@#', symbols, setSymbols]
          ].map(([label, val, setter]) => (
            <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={val as boolean} onChange={() => (setter as Function)(!(val as boolean))} style={{ accentColor: 'var(--accent)' }} />
              {label as string}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function QRCodeTab() {
  const [text, setText] = useState('')
  const [image, setImage] = useState('')

  const generate = async () => {
    if (!text.trim()) return
    const r = await api.post('/tools/qrcode', { text })
    setImage(r.data.image || '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QR Code Generator</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Text or URL to encode" value={text} onChange={e => setText(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }}
            onKeyDown={e => e.key === 'Enter' && generate()} />
          <button className="btn btn-primary btn-sm" onClick={generate}><QrCode size={14} /> Generate</button>
        </div>
        {image && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <img src={image} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 12, background: 'white', padding: 8 }} />
          </div>
        )}
      </div>
    </div>
  )
}

function ShortenTab() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')

  const shorten = async () => {
    if (!url.trim()) return
    const r = await api.post('/tools/shorten', { url })
    setShortUrl(r.data.short_url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>URL Shortener</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Long URL" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }}
            onKeyDown={e => e.key === 'Enter' && shorten()} />
          <button className="btn btn-primary btn-sm" onClick={shorten}><Link size={14} /> Shorten</button>
        </div>
        {shortUrl && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--accent)', fontFamily: 'monospace' }}>
              {window.location.origin}{shortUrl}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(window.location.origin + shortUrl)}>📋 Copy</button>
          </div>
        )}
      </div>
    </div>
  )
}
