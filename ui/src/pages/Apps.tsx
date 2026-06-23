import React, { useEffect, useState } from 'react'
import {
  Grid3X3, Music, FileText, Calendar, Terminal, Settings,
  Monitor, Download, Trash2, Search
} from 'lucide-react'
import api from '../utils/api'

const iconMap: Record<string, React.ReactNode> = {
  'music': <Music size={24} />,
  'file-text': <FileText size={24} />,
  'calendar': <Calendar size={24} />,
  'terminal': <Terminal size={24} />,
  'settings': <Settings size={24} />,
  'app': <Grid3X3 size={24} />,
  'cloud': <Monitor size={24} />,
  'calculator': <Grid3X3 size={24} />,
  'camera': <Monitor size={24} />,
  'radio': <Music size={24} />,
  'book': <FileText size={24} />,
  'edit': <FileText size={24} />,
  'clock': <Calendar size={24} />,
}

export default function AppsPage() {
  const [installed, setInstalled] = useState<any[]>([])
  const [available, setAvailable] = useState<any[]>([])

  useEffect(() => {
    api.get('/apps/').then(r => {
      setInstalled(r.data.installed)
      setAvailable(r.data.available)
    }).catch(() => {})
  }, [])

  const installApp = async (app: any) => {
    try {
      const r = await api.post('/apps/install', app)
      setInstalled(prev => [...prev, { ...app, id: r.data.id, installed: true, built_in: false }])
      setAvailable(prev => prev.filter(a => a.name !== app.name))
    } catch {}
  }

  const uninstallApp = async (app: any) => {
    try {
      await api.post('/apps/uninstall', { id: app.id })
      setInstalled(prev => prev.filter(a => a.id !== app.id))
      setAvailable(prev => [...prev, app])
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Grid3X3 size={18} /> Installed Apps
      </h3>
      {installed.length === 0 ? (
        <div className="empty-state"><Grid3X3 size={48} /><h3>No apps installed</h3></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {installed.map(a => (
            <div key={a.id || a.name} className="glass-card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  {iconMap[a.icon] || <Grid3X3 size={24} />}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{a.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.description}</div>
              {!a.built_in && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => uninstallApp(a)}>
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <Download size={18} /> Available Apps
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {available.map(a => (
          <div key={a.name} className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {iconMap[a.icon] || <Grid3X3 size={24} />}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{a.display_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.description}</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => installApp(a)}>
              <Download size={12} /> Install
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
