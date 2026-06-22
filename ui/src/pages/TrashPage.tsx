import React, { useEffect, useState } from 'react'
import { Trash2, RotateCcw, File, Folder } from 'lucide-react'
import api from '../utils/api'

export default function TrashPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    api.get('/trash/').then(r => setItems(r.data)).catch(() => {})
  }, [])

  const restore = async (id: string) => {
    await api.post(`/trash/restore/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const deletePerm = async (id: string) => {
    await api.delete(`/trash/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const emptyTrash = async () => {
    await api.post('/trash/empty')
    setItems([])
  }

  const fmtSize = (b: number) => {
    if (!b) return '0 B'
    const u = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let s = b
    while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
    return `${s.toFixed(1)} ${u[i]}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trash2 size={18} /> Trash
        </h3>
        <div style={{ flex: 1 }} />
        {items.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={emptyTrash}>
            <Trash2 size={14} /> Empty Trash
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><Trash2 size={48} /><h3>Trash is empty</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {item.file_size === 0 ? <Folder size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} /> : <FileText size={18} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmtSize(item.file_size)} · Deleted {new Date(item.deleted_at).toLocaleString()}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => restore(item.id)} title="Restore">
                <RotateCcw size={14} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deletePerm(item.id)} title="Delete permanently" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
