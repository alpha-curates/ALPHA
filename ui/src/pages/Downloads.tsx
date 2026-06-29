import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Download as DownloadIcon, X, Trash2, File, RefreshCw, Loader,
  AlertCircle, Info, Check, Clock, ArrowUpDown
} from 'lucide-react'
import api from '../utils/api'
import { Download } from '../types'

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

function formatBytes(b: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let size = b
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const interval = useRef<number>()
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const load = useCallback(async () => {
    try {
      const r = await api.get('/downloads')
      setDownloads(r.data)
      setLoadError('')
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || 'Failed to load downloads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    interval.current = window.setInterval(load, 3000)
    return () => clearInterval(interval.current)
  }, [load])

  const startDownload = async () => {
    if (!url.trim()) return
    setStarting(true)
    try {
      await api.post('/downloads', { url: url.trim() })
      setUrl('')
      addToast('Download started', 'success')
      load()
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || 'Failed to start download', 'error')
    } finally {
      setStarting(false)
    }
  }

  const cancelDownload = async (id: string) => {
    try {
      await api.delete(`/downloads/${id}`)
      setDownloads(prev => prev.filter(d => d.id !== id))
      addToast('Download cancelled', 'info')
    } catch {
      addToast('Failed to cancel download', 'error')
    }
  }

  const activeDownloads = downloads.filter(d => d.status === 'downloading')
  const completedDownloads = downloads.filter(d => d.status !== 'downloading')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Paste a URL to download..." value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && startDownload()}
            style={{ flex: 1, height: 36, fontSize: 14 }} />
          <button className="btn btn-primary" onClick={startDownload} disabled={!url.trim() || starting}
            style={{ height: 36 }}>
            {starting ? <><Loader size={16} className="spin" /> Starting...</> : <><DownloadIcon size={16} /> Download</>}
          </button>
        </div>
      </div>

      {downloads.length > 0 && (
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <button className={`btn btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('active')}>
            <ArrowUpDown size={14} /> Active ({activeDownloads.length})
          </button>
          <button className={`btn btn-sm ${tab === 'completed' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('completed')}>
            <Clock size={14} /> Completed ({completedDownloads.length})
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading downloads...</h3></div>
      ) : loadError ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{loadError}</h3><p style={{ fontSize: 13 }}>Try refreshing the page</p></div>
      ) : downloads.length === 0 ? (
        <div className="empty-state"><DownloadIcon size={48} /><h3>No downloads yet</h3><p style={{ fontSize: 13 }}>Paste a URL above to start downloading files</p></div>
      ) : tab === 'active' && activeDownloads.length === 0 ? (
        <div className="empty-state"><DownloadIcon size={48} /><h3>No active downloads</h3><p style={{ fontSize: 13 }}>Switch to Completed tab to see finished downloads</p></div>
      ) : tab === 'completed' && completedDownloads.length === 0 ? (
        <div className="empty-state"><Clock size={48} /><h3>No completed downloads</h3><p style={{ fontSize: 13 }}>Active downloads will appear here once finished</p></div>
      ) : (
        <>
          {tab === 'active' && activeDownloads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeDownloads.map(d => (
                <div key={d.id} className="glass-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.url}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => cancelDownload(d.id)} title="Cancel">
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      width: d.total_bytes > 0 ? `${Math.min(100, (d.downloaded_bytes / d.total_bytes) * 100)}%` : '0%',
                      height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 1s'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>{d.total_bytes > 0 ? `${formatBytes(d.downloaded_bytes)} / ${formatBytes(d.total_bytes)}` : formatBytes(d.downloaded_bytes)}</span>
                    <span>{d.speed > 0 ? `${formatBytes(Math.round(d.speed))}/s` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'completed' && completedDownloads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {completedDownloads.map(d => (
                <div key={d.id} className="glass-card" style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
                }}>
                  <File size={16} style={{ color: d.status === 'completed' ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{d.filename}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span style={{ color: d.status === 'completed' ? 'var(--success)' : 'var(--danger)', textTransform: 'capitalize' }}>{d.status}</span>
                      {d.total_bytes > 0 && <span>{formatBytes(d.total_bytes)}</span>}
                      {d.completed_at && <span>{new Date(d.completed_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => cancelDownload(d.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
