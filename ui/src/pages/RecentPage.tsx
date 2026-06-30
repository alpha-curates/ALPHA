import React, { useEffect, useState, useCallback } from 'react'
import {
  Clock, File, FileText, Image, Music, Video, Archive,
  Trash2, Loader, AlertCircle, Check, Info, X, RefreshCw
, AlertTriangle
} from 'lucide-react'
import api from '../utils/api'

interface RecentItem {
  id: string; file_path: string; file_name: string
  file_type: string; accessed_at: string
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

function getFileIcon(type: string) {
  return typeIcons[type.toLowerCase()] || File
}

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
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

export default function RecentPage() {
  const [items, setItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    try {
      const r = await api.get('/recent')
      setItems(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load recent files')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const clearRecent = async () => {
    try {
      await api.post('/recent/clear')
      setItems([])
      addToast('Recent files cleared', 'success')
    } catch { addToast('Failed to clear', 'error') }
  }

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading recent files...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} /> Recent Files
        </h3>
        <div style={{ flex: 1 }} />
        {items.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearRecent}><Trash2 size={14} /> Clear</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><Clock size={48} /><h3>No recent files</h3><p style={{ fontSize: 13 }}>Files you open will appear here</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => {
            const Icon = getFileIcon(item.file_type)
            return (
              <div key={item.id} className="glass-card" style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_path}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{formatTime(item.accessed_at)}</span>
              </div>
            )
          })}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
