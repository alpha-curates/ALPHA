import React, { useEffect, useState } from 'react'
import { Link, Copy, Trash2, ExternalLink, Clock, Download } from 'lucide-react'
import api from '../utils/api'

export default function SharesPage() {
  const [shares, setShares] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [expiresIn, setExpiresIn] = useState(24)
  const [maxDownloads, setMaxDownloads] = useState(0)

  useEffect(() => {
    api.get('/shares/').then(r => setShares(r.data)).catch(() => {})
  }, [])

  const createShare = async () => {
    if (!filePath) return
    const r = await api.post('/shares/create', { file_path: filePath, expires_in: expiresIn, max_downloads: maxDownloads })
    setShares(prev => [r.data, ...prev])
    setShowCreate(false)
    setFilePath('')
  }

  const deleteShare = async (id: string) => {
    await api.delete(`/shares/${id}/delete`)
    setShares(prev => prev.filter(s => s.id !== id))
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/api/shares/access/${token}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link size={18} /> Share Links
        </h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Link size={14} /> New Share
        </button>
      </div>

      {showCreate && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder="File path (e.g. /documents/report.pdf)" value={filePath} onChange={e => setFilePath(e.target.value)} style={{ height: 34, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Expires in (hours, 0 = never)</div>
              <input type="number" value={expiresIn} onChange={e => setExpiresIn(+e.target.value)} min="0" style={{ height: 34, fontSize: 13, width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Max downloads (0 = unlimited)</div>
              <input type="number" value={maxDownloads} onChange={e => setMaxDownloads(+e.target.value)} min="0" style={{ height: 34, fontSize: 13, width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={createShare}>Create Link</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {shares.length === 0 ? (
        <div className="empty-state"><Link size={48} /><h3>No share links</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shares.map(s => (
            <div key={s.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                  <span><Download size={11} /> {s.download_count}{s.max_downloads > 0 ? `/${s.max_downloads}` : ''}</span>
                  {s.expires_at && <span><Clock size={11} /> Expires {new Date(s.expires_at).toLocaleDateString()}</span>}
                  {s.has_password && <span>🔒 Password</span>}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyLink(s.token)} title="Copy link">
                <Copy size={14} />
              </button>
              <a href={`/api/shares/access/${s.token}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm">
                <ExternalLink size={14} />
              </a>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteShare(s.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
