import React, { useEffect, useState } from 'react'
import api from '../utils/api'

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState('All')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('General')

  const load = async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get('/tools/bookmarks'),
        api.get('/tools/bookmarks/folders')
      ])
      setBookmarks(r1.data || [])
      setFolders(['All', ...(r2.data || [])])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const add = async () => {
    if (!url) return
    await api.post('/tools/bookmarks', { url, title: title || url, folder })
    setUrl(''); setTitle(''); setFolder('General'); setShowAdd(false)
    load()
  }

  const remove = async (id: string) => {
    await api.delete(`/tools/bookmarks/${id}`)
    load()
  }

  const filtered = bookmarks.filter(b => {
    if (activeFolder !== 'All' && b.folder !== activeFolder) return false
    if (search && !b.title?.toLowerCase().includes(search.toLowerCase()) && !b.url?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="page" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', padding: '8px 12px' }}>Folders</div>
        {folders.map(f => (
          <div key={f} onClick={() => setActiveFolder(f)}
            style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              background: activeFolder === f ? 'var(--accent-dim)' : 'transparent',
              color: activeFolder === f ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeFolder === f ? 600 : 400, transition: 'all 0.15s'
            }}
            onMouseEnter={e => { if (activeFolder !== f) e.currentTarget.style.background = 'var(--accent-dim)' }}
            onMouseLeave={e => { if (activeFolder !== f) e.currentTarget.style.background = 'transparent' }}
          >
            {f} {f !== 'All' && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({bookmarks.filter(b => b.folder === f).length})</span>}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input placeholder="Search bookmarks..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>+ Add</button>
        </div>

        {showAdd && (
          <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
            <input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)}
              style={{ flex: 2, height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 }} />
            <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)}
              style={{ flex: 1, height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 }} />
            <select value={folder} onChange={e => setFolder(e.target.value)}
              style={{ height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 }}>
              {folders.filter(f => f !== 'All').map(f => <option key={f} value={f}>{f}</option>)}
              <option value="New...">+ New Folder</option>
            </select>
            {folder === 'New...' && (
              <input placeholder="Folder name" value={title} onChange={e => setFolder(e.target.value)}
                style={{ height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12, width: 120 }} />
            )}
            <button className="btn btn-primary btn-sm" onClick={add}>Save</button>
          </div>
        )}

        {loading ? <div className="loading">Loading bookmarks...</div> : (
          <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, alignContent: 'start' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No bookmarks found</div>
            ) : filtered.map(b => (
              <div key={b.id}
                style={{
                  padding: '12px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14
                }}>
                  {b.favicon ? <img src={b.favicon} alt="" style={{ width: 16, height: 16 }} /> : '🔗'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                    {b.title || b.url}
                  </a>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.url}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b.id)} title="Delete"
                  style={{ flexShrink: 0, opacity: 0.5 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
