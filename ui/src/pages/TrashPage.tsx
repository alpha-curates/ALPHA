import React, { useEffect, useState, useCallback } from 'react'
import { Trash2, RotateCcw, FileText, Loader, AlertCircle, Check, Info, X } from 'lucide-react'
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

const fmtSize = (b: number) => {
  if (!b) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let s = b
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
  return `${s.toFixed(1)} ${u[i]}`
}

export default function TrashPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [emptying, setEmptying] = useState(false)
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
    api.get('/trash/').then(r => {
      setItems(r.data)
      setLoading(false)
    }).catch(err => {
      setError(err.response?.data?.error || err.message || 'Failed to load trash')
      setLoading(false)
    })
  }, [])

  const restore = async (id: string) => {
    setRestoring(id)
    try {
      await api.post(`/trash/restore/${id}`)
      setItems(prev => prev.filter(i => i.id !== id))
      addToast('Item restored', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to restore item', 'error')
    } finally {
      setRestoring(null)
    }
  }

  const deletePerm = async (id: string) => {
    setDeleting(id)
    try {
      await api.delete(`/trash/${id}`)
      setItems(prev => prev.filter(i => i.id !== id))
      addToast('Item permanently deleted', 'success')
    } catch {
      addToast('Failed to delete item', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const emptyTrash = async () => {
    if (!window.confirm('Permanently delete all items in trash?')) return
    setEmptying(true)
    try {
      await api.post('/trash/empty')
      setItems([])
      addToast('Trash emptied', 'success')
    } catch {
      addToast('Failed to empty trash', 'error')
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trash2 size={18} /> Trash
        </h3>
        <div style={{ flex: 1 }} />
        {items.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={emptyTrash} disabled={emptying}>
            {emptying ? <><Loader size={14} className="spin" /> Emptying...</> : <><Trash2 size={14} /> Empty Trash</>}
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading trash...</h3></div>
      ) : error ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3><p style={{ fontSize: 13 }}>Try refreshing the page</p></div>
      ) : items.length === 0 ? (
        <div className="empty-state"><Trash2 size={48} /><h3>Trash is empty</h3><p style={{ fontSize: 13 }}>Deleted files and folders will appear here</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmtSize(item.file_size)} · Deleted {new Date(item.deleted_at).toLocaleString()}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => restore(item.id)} title="Restore" disabled={restoring === item.id}>
                {restoring === item.id ? <Loader size={14} className="spin" /> : <RotateCcw size={14} />}
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deletePerm(item.id)} title="Delete permanently" disabled={deleting === item.id} style={{ color: 'var(--danger)' }}>
                {deleting === item.id ? <Loader size={14} className="spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
