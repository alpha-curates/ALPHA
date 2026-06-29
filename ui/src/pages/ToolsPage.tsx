import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Key, QrCode, Link, FileText, CheckSquare, Bookmark, Plus, Trash2, Pin, Edit3, Terminal, RotateCcw, RefreshCw,
  Loader, AlertCircle, Check, Info, X, Copy
} from 'lucide-react'
import api from '../utils/api'

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

const toastStyle = (t: ToastData['type']) => ({
  padding: '10px 14px', borderRadius: 10,
  background: t === 'error' ? 'var(--danger-dim)' : t === 'success' ? 'var(--success-dim)' : t === 'warning' ? 'var(--warning-dim)' : 'var(--info-dim)',
  color: t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)',
  fontSize: 13, fontWeight: 500,
  animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
  boxShadow: 'var(--shadow-md)',
  border: `1px solid ${t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
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

export default function ToolsPage() {
  const [tab, setTab] = useState('notes')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const tabs = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'todos', label: 'Todos', icon: CheckSquare },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'update', label: 'Update', icon: RefreshCw },
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

      {tab === 'notes' && <NotesTab addToast={addToast} />}
      {tab === 'todos' && <TodosTab addToast={addToast} />}
      {tab === 'bookmarks' && <BookmarksTab addToast={addToast} />}
      {tab === 'terminal' && <TerminalTab addToast={addToast} />}
      {tab === 'update' && <UpdateTab addToast={addToast} />}
      {tab === 'password' && <PasswordTab addToast={addToast} />}
      {tab === 'qrcode' && <QRCodeTab addToast={addToast} />}
      {tab === 'shorten' && <ShortenTab addToast={addToast} />}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function TerminalTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [lines, setLines] = useState<string[]>(['ALPHA Terminal - persistent shell\n'])
  const [cmd, setCmd] = useState('')
  const [running, setRunning] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  useEffect(() => {
    const es = new EventSource('/tools/terminal/stream')
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.done) { setRunning(false); return }
        if (d.output) {
          setLines(prev => [...prev, d.output])
        }
      } catch {}
    }
    es.onerror = () => {
      addToast('Terminal stream disconnected', 'warning')
    }
    return () => es.close()
  }, [addToast])

  const run = async () => {
    if (!cmd.trim() || running) return
    setRunning(true)
    const c = cmd
    setLines(prev => [...prev, '$ ' + c + '\n'])
    setCmd('')
    try {
      await api.post('/tools/terminal/write', { command: c })
    } catch {
      setLines(prev => [...prev, 'Failed to run command\n'])
      setRunning(false)
      addToast('Failed to execute command', 'error')
    }
  }

  const reset = async () => {
    try {
      await api.post('/tools/terminal/reset')
      addToast('Terminal session reset', 'info')
    } catch {
      addToast('Failed to reset terminal', 'error')
    }
    setLines(['ALPHA Terminal - session reset\n'])
  }

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid var(--glass-border)', fontSize: 11
      }}>
        <Terminal size={13} />
        <span style={{ flex: 1, color: 'var(--text-muted)' }}>Real-time terminal — output streams as it arrives</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={reset} title="Reset terminal (kill stuck processes)">
          <RotateCcw size={13} />
        </button>
      </div>
      <div style={{ background: '#0a0a0a', padding: '8px 16px', fontFamily: 'monospace', fontSize: 13, minHeight: 280, maxHeight: 500, overflow: 'auto' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.startsWith('$ ') ? 'var(--accent)' : 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {line}
          </div>
        ))}
        {running && <div style={{ color: 'var(--warning)', fontSize: 11 }}>⏳ running...</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ color: 'var(--accent)' }}>$</span>
          <input value={cmd} onChange={e => setCmd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run() }}
            placeholder={running ? 'Waiting...' : 'Type command or input...'}
            disabled={running}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, outline: 'none', padding: 0 }}
            autoFocus />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  )
}

function UpdateTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [output])

  const run = async () => {
    setRunning(true)
    setOutput('')
    setDone(false)
    try {
      const r = await api.post('/tools/update')
      setOutput(r.data.output || '(no output)')
      setDone(true)
      addToast('Update completed', 'success')
    } catch {
      setOutput('Failed to trigger update\n')
      addToast('Update failed', 'error')
    }
    setRunning(false)
  }

  const restart = async () => {
    try {
      await api.post('/tools/restart')
      setOutput(prev => prev + '\n=== Restart command sent ===')
      addToast('Restart command sent', 'info')
    } catch {
      setOutput(prev => prev + '\n=== Restart failed ===')
      addToast('Restart failed', 'error')
    }
  }

  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={16} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Push Updates</span>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={running}>
          {running ? <><Loader size={14} className="spin" /> Running...</> : 'Push Updates'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Runs: <code>git pull</code> → <code>pip install</code> → <code>npm build</code> → restart server
      </div>
      {output && (
        <div style={{
          background: '#0a0a0a', padding: '8px 12px', borderRadius: 8,
          fontFamily: 'monospace', fontSize: 12, maxHeight: 400, overflow: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all'
        }}>
          {output}
          <div ref={endRef} />
        </div>
      )}
      {running && <div style={{ color: 'var(--warning)', fontSize: 12 }}>⏳ Pulling, installing, building — this may take a few minutes...</div>}
      {done && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--success)' }}>Build complete. Server is restarting...</span>
          <button className="btn btn-ghost btn-sm" onClick={restart}>Restart Manually</button>
        </div>
      )}
    </div>
  )
}

function NotesTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [notes, setNotes] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('personal')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tools/notes').then(r => {
      setNotes(r.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Failed to load notes', 'error')
    })
  }, [addToast])

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/tools/notes/${editing.id}`, { title, content, category })
        addToast('Note updated', 'success')
      } else {
        await api.post('/tools/notes', { title, content, category })
        addToast('Note created', 'success')
      }
      setEditing(null); setTitle(''); setContent('')
      const r = await api.get('/tools/notes'); setNotes(r.data)
    } catch {
      addToast('Failed to save note', 'error')
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/tools/notes/${id}`)
      setNotes(prev => prev.filter(n => n.id !== id))
      addToast('Note deleted', 'success')
    } catch {
      addToast('Failed to delete note', 'error')
    }
  }

  const togglePin = async (n: any) => {
    try {
      await api.put(`/tools/notes/${n.id}`, { pinned: !n.pinned })
      const r = await api.get('/tools/notes'); setNotes(r.data)
      addToast(n.pinned ? 'Note unpinned' : 'Note pinned', 'info')
    } catch {
      addToast('Failed to update note', 'error')
    }
  }

  if (loading) {
    return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading notes...</h3></div>
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
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!title.trim()}>{editing ? 'Update' : 'Add Note'}</button>
          {editing && <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setTitle(''); setContent('') }}>Cancel</button>}
        </div>
      </div>
      {notes.length === 0 ? (
        <div className="empty-state"><FileText size={48} /><h3>No notes yet</h3><p style={{ fontSize: 13 }}>Create your first note above</p></div>
      ) : (
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
      )}
    </div>
  )
}

function TodosTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [todos, setTodos] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tools/todos').then(r => {
      setTodos(r.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Failed to load todos', 'error')
    })
  }, [addToast])

  const add = async () => {
    if (!title.trim()) return
    try {
      await api.post('/tools/todos', { title, priority })
      setTitle('')
      const r = await api.get('/tools/todos'); setTodos(r.data)
      addToast('Task added', 'success')
    } catch {
      addToast('Failed to add task', 'error')
    }
  }

  const toggle = async (t: any) => {
    try {
      await api.put(`/tools/todos/${t.id}`, { completed: !t.completed })
      setTodos(prev => prev.map(t2 => t2.id === t.id ? { ...t2, completed: !t.completed } : t2))
    } catch {
      addToast('Failed to update task', 'error')
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/tools/todos/${id}`)
      setTodos(prev => prev.filter(t => t.id !== id))
      addToast('Task deleted', 'success')
    } catch {
      addToast('Failed to delete task', 'error')
    }
  }

  const filtered = todos.filter(t => filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed)
  const pending = todos.filter(t => !t.completed).length

  if (loading) {
    return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading todos...</h3></div>
  }

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
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>All ({todos.length})</button>
        <button className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('active')}>Active ({pending})</button>
        <button className={`btn btn-sm ${filter === 'done' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('done')}>Done ({todos.length - pending})</button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><CheckSquare size={48} /><h3>No tasks {filter !== 'all' ? filter : ''}</h3><p style={{ fontSize: 13 }}>Add a task above to get started</p></div>
      ) : (
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
      )}
    </div>
  )
}

function BookmarksTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [bms, setBms] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('General')
  const [folders, setFolders] = useState<string[]>(['General'])
  const [newFolder, setNewFolder] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/tools/bookmarks'),
      api.get('/tools/bookmarks/folders')
    ]).then(([bmsRes, foldersRes]) => {
      setBms(bmsRes.data)
      setFolders(['General', ...foldersRes.data.filter((f: string) => f !== 'General')])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Failed to load bookmarks', 'error')
    })
  }, [addToast])

  const add = async () => {
    if (!url.trim()) return
    try {
      const f = newFolder || folder
      await api.post('/tools/bookmarks', { url, title: title || url, folder: f })
      setUrl(''); setTitle(''); setNewFolder('')
      const r = await api.get('/tools/bookmarks'); setBms(r.data)
      addToast('Bookmark added', 'success')
    } catch {
      addToast('Failed to add bookmark', 'error')
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/tools/bookmarks/${id}`)
      setBms(prev => prev.filter(b => b.id !== id))
      addToast('Bookmark deleted', 'success')
    } catch {
      addToast('Failed to delete bookmark', 'error')
    }
  }

  const grouped = folders.reduce((acc: any, f) => {
    acc[f] = bms.filter(b => b.folder === f)
    return acc
  }, {} as Record<string, any[]>)

  const hasBookmarks = Object.values(grouped).some((items: any[]) => items.length > 0)

  if (loading) {
    return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading bookmarks...</h3></div>
  }

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
      {!hasBookmarks ? (
        <div className="empty-state"><Bookmark size={48} /><h3>No bookmarks yet</h3><p style={{ fontSize: 13 }}>Add a bookmark above to save your favorite links</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(grouped).map(([f, items]) => {
            const bms = items as any[]
            return bms.length > 0 && (
              <div key={f}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>{f}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {bms.map(b => (
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
          })}
        </div>
      )}
    </div>
  )
}

function PasswordTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [password, setPassword] = useState('')
  const [length, setLength] = useState(20)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await api.post('/tools/password', { length, upper, lower, digits, symbols })
      setPassword(r.data.password)
    } catch {
      addToast('Failed to generate password', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(password).then(() => {
      addToast('Password copied to clipboard', 'success')
    }).catch(() => {
      addToast('Failed to copy password', 'error')
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600 }}>Password Generator</h4>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
            {generating ? <><Loader size={14} className="spin" /> Generating...</> : <><Key size={14} /> Generate</>}
          </button>
        </div>
        {password && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              flex: 1, fontFamily: 'monospace', fontSize: 18, padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)', borderRadius: 8, letterSpacing: 1,
              wordBreak: 'break-all'
            }}>{password}</div>
            <button className="btn btn-ghost btn-icon" onClick={copy} title="Copy"><Copy size={16} /></button>
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

function QRCodeTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    if (!text.trim()) return
    setGenerating(true)
    try {
      const r = await api.post('/tools/qrcode', { text })
      setImage(r.data.image || '')
    } catch {
      addToast('Failed to generate QR code', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QR Code Generator</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Text or URL to encode" value={text} onChange={e => setText(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }}
            onKeyDown={e => e.key === 'Enter' && generate()} />
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating || !text.trim()}>
            {generating ? <><Loader size={14} className="spin" /> Generating...</> : <><QrCode size={14} /> Generate</>}
          </button>
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

function ShortenTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [shortening, setShortening] = useState(false)

  const shorten = async () => {
    if (!url.trim()) return
    setShortening(true)
    try {
      const r = await api.post('/tools/shorten', { url })
      setShortUrl(r.data.short_url)
      addToast('URL shortened', 'success')
    } catch {
      addToast('Failed to shorten URL', 'error')
    } finally {
      setShortening(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>URL Shortener</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Long URL" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1, height: 34, fontSize: 13 }}
            onKeyDown={e => e.key === 'Enter' && shorten()} />
          <button className="btn btn-primary btn-sm" onClick={shorten} disabled={shortening || !url.trim()}>
            {shortening ? <><Loader size={14} className="spin" /> Shortening...</> : <><Link size={14} /> Shorten</>}
          </button>
        </div>
        {shortUrl && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--accent)', fontFamily: 'monospace' }}>
              {window.location.origin}{shortUrl}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              navigator.clipboard.writeText(window.location.origin + shortUrl).then(() => {
                addToast('Link copied to clipboard', 'success')
              }).catch(() => {
                addToast('Failed to copy link', 'error')
              })
            }}><Copy size={14} /> Copy</button>
          </div>
        )}
      </div>
    </div>
  )
}
