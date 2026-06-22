import React, { useEffect, useState } from 'react'
import {
  Puzzle, Download, Trash2, ToggleLeft, ToggleRight,
  Search, ExternalLink, Shield, Settings
} from 'lucide-react'
import api from '../utils/api'
import { Extension } from '../types'

export default function ExtensionsPage() {
  const [installed, setInstalled] = useState<Extension[]>([])
  const [available, setAvailable] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'installed' | 'available'>('installed')

  useEffect(() => {
    Promise.all([
      api.get('/extensions/').then(r => setInstalled(r.data)),
      api.get('/extensions/available').then(r => setAvailable(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const install = async (ext: any) => {
    await api.post('/extensions/install', ext)
    const r = await api.get('/extensions/')
    setInstalled(r.data)
  }

  const uninstall = async (id: string) => {
    await api.post('/extensions/uninstall', { id })
    setInstalled(prev => prev.filter(e => e.id !== id))
  }

  const toggle = async (id: string) => {
    const r = await api.post(`/extensions/${id}/toggle`)
    setInstalled(prev => prev.map(e => e.id === id ? { ...e, enabled: r.data.enabled } : e))
  }

  const filteredInstalled = installed.filter(e =>
    e.display_name.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredAvailable = available.filter(e =>
    (e.display_name || e.name).toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabs */}
      <div className="glass-card" style={{ padding: 4, display: 'flex', gap: 4 }}>
        <button className={`btn btn-ghost btn-sm ${tab === 'installed' ? 'active' : ''}`}
          onClick={() => setTab('installed')} style={{ flex: 1, justifyContent: 'center', background: tab === 'installed' ? 'var(--accent-dim)' : 'transparent' }}>
          <ToggleRight size={14} /> Installed ({installed.length})
        </button>
        <button className={`btn btn-ghost btn-sm ${tab === 'available' ? 'active' : ''}`}
          onClick={() => setTab('available')} style={{ flex: 1, justifyContent: 'center', background: tab === 'available' ? 'var(--accent-dim)' : 'transparent' }}>
          <Download size={14} /> Available ({available.length})
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 300 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input style={{ paddingLeft: 32, height: 34, fontSize: 13 }} placeholder="Search extensions..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === 'installed' && (
        filteredInstalled.length === 0 ? (
          <div className="empty-state"><Puzzle size={48} /><h3>No extensions installed</h3><p style={{ fontSize: 13 }}>Browse available extensions and install them</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
            {filteredInstalled.map(e => (
              <div key={e.id} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Puzzle size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{e.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{e.version} · {e.author}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{e.description}</div>
                    {e.permissions?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {e.permissions.map(p => (
                          <span key={p} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Shield size={10} /> {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <button className={`btn btn-sm ${e.enabled ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(e.id)} style={{ minWidth: 70 }}>
                      {e.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      {e.enabled ? 'On' : 'Off'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => uninstall(e.id)}><Trash2 size={12} /> Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'available' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
          {filteredAvailable.map((ext, i) => {
            const isInstalled = installed.some(e => e.name === ext.name)
            return (
              <div key={ext.name || i} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Puzzle size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{ext.display_name || ext.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{ext.version} · {ext.author}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{ext.description}</div>
                    {ext.permissions?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {ext.permissions.map((p: string) => (
                          <span key={p} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className={`btn btn-sm ${isInstalled ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => !isInstalled && install(ext)}
                    disabled={isInstalled}>
                    {isInstalled ? 'Installed' : 'Install'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
