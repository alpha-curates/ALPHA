import React, { useEffect, useState } from 'react'
import {
  Monitor, Wifi, WifiOff, RefreshCw, Check, X, Search,
  Trash2, Edit3, Smartphone, Radio, Cpu
} from 'lucide-react'
import api from '../utils/api'
import { Device } from '../types'

const typeIcons: Record<string, React.ReactNode> = {
  'raspberry-pi': <Cpu size={16} />,
  'esp32': <Radio size={16} />,
  'phone': <Smartphone size={16} />,
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [pending, setPending] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        api.get('/devices/'),
        api.get('/devices/pending')
      ])
      setDevices(d.data)
      setPending(p.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const scan = async () => {
    setLoading(true)
    await api.post('/devices/scan')
    await load()
  }

  const approve = async (id: string) => {
    await api.post(`/devices/${id}/approve`)
    await load()
  }

  const deny = async (id: string) => {
    await api.post(`/devices/${id}/deny`)
    await load()
  }

  const remove = async (id: string) => {
    await api.delete(`/devices/${id}`)
    await load()
  }

  const rename = async (id: string) => {
    if (!editName.trim()) return
    await api.put(`/devices/${id}/rename`, { name: editName.trim() })
    setEditingId(null)
    await load()
  }

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.ip?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pending Approval */}
      {pending.length > 0 && (
        <div className="glass-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={16} style={{ color: 'var(--warning)' }} />
            Pending Approval ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                {typeIcons[d.type] || <Monitor size={16} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip} · {d.type}</div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => approve(d.id)}><Check size={14} /> Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => deny(d.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ paddingLeft: 32, height: 34, fontSize: 13 }} placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={scan}><RefreshCw size={14} /> Scan Network</button>
      </div>

      {/* Device List */}
      {loading ? (
        <div className="empty-state"><RefreshCw size={32} /><h3>Scanning...</h3></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Wifi size={48} /><h3>No devices found</h3><p style={{ fontSize: 13 }}>Scan your network to discover connected devices</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
          {filtered.map(d => (
            <div key={d.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: d.status === 'approved' ? 'rgba(0,214,143,0.1)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeIcons[d.type] || <Monitor size={20} style={{ color: d.status === 'approved' ? 'var(--success)' : 'var(--text-muted)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === d.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && rename(d.id)} style={{ height: 28, fontSize: 13 }} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={() => rename(d.id)}>Save</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.ip} · {d.type}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.status === 'approved' || d.status === 'online' ? 'var(--success)' : d.status === 'pending' ? 'var(--warning)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingId(d.id); setEditName(d.name) }}><Edit3 size={12} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(d.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
