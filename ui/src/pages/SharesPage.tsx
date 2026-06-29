import React, { useEffect, useState, useCallback } from 'react'
import { Link, Copy, Trash2, ExternalLink, Clock, Download, Loader, AlertCircle, Check, Info, X } from 'lucide-react'
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

export default function SharesPage() {
  const [shares, setShares] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [expiresIn, setExpiresIn] = useState(24)
  const [maxDownloads, setMaxDownloads] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get('/shares/').then(r => {
      setShares(r.data)
      setLoading(false)
    }).catch(err => {
      setError(err.response?.data?.error || err.message || 'Failed to load shares')
      setLoading(false)
    })
  }, [])

  const createShare = async () => {
    if (!filePath) return
    setCreating(true)
    try {
      const r = await api.post('/shares/create', { file_path: filePath, expires_in: expiresIn, max_downloads: maxDownloads })
      setShares(prev => [r.data, ...prev])
      setShowCreate(false)
      setFilePath('')
      addToast('Share link created', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || 'Failed to create share', 'error')
    } finally {
      setCreating(false)
    }
  }

  const deleteShare = async (id: string) => {
    try {
      await api.delete(`/shares/${id}/delete`)
      setShares(prev => prev.filter(s => s.id !== id))
      addToast('Share link deleted', 'success')
    } catch {
      addToast('Failed to delete share', 'error')
    }
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/api/shares/access/${token}`
    navigator.clipboard.writeText(url).then(() => {
      addToast('Link copied to clipboard', 'success')
    }).catch(() => {
      addToast('Failed to copy link', 'error')
    })
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
            <button className="btn btn-primary btn-sm" onClick={createShare} disabled={creating || !filePath}>
              {creating ? <><Loader size={14} className="spin" /> Creating...</> : 'Create Link'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading share links...</h3></div>
      ) : error ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3><p style={{ fontSize: 13 }}>Try refreshing the page</p></div>
      ) : shares.length === 0 ? (
        <div className="empty-state"><Link size={48} /><h3>No share links created</h3><p style={{ fontSize: 13 }}>Create a share link to let others download files from your NAS</p></div>
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
              <a href={`/api/shares/access/${s.token}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Open link">
                <ExternalLink size={14} />
              </a>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteShare(s.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
