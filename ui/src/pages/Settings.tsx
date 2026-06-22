import React, { useEffect, useState } from 'react'
import {
  Settings, User, Bell, Shield, RefreshCw, Download,
  Server, Globe, Moon, Sun, LogOut, Save, Brain, Palette,
  Image
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme, wallpaper, setWallpaper, THEMES, WALLPAPERS } = useTheme()
  const [tab, setTab] = useState<'profile' | 'appearance' | 'system' | 'ai' | 'remote'>('profile')
  const [email, setEmail] = useState(user?.email || '')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [saved, setSaved] = useState(false)

  const loadUpdateInfo = async () => {
    try {
      const r = await api.get('/system/update/check')
      setUpdateInfo(r.data)
    } catch {}
  }

  useEffect(() => {
    if (tab === 'system') loadUpdateInfo()
  }, [tab])

  const saveProfile = async () => {
    await api.put('/users/settings', { email })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const applyUpdate = async () => {
    if (!confirm('Apply update and restart ALPHA?')) return
    await api.post('/system/update/apply')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      {/* Tabs */}
      <div className="glass-card" style={{ padding: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'system', label: 'System', icon: Server },
          { id: 'ai', label: 'AI', icon: Brain },
          { id: 'remote', label: 'Remote', icon: Globe },
        ].map(t => (
          <button key={t.id} className={`btn btn-ghost btn-sm ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id as any)}
            style={{ flex: 1, justifyContent: 'center', background: tab === t.id ? 'var(--accent-dim)' : 'transparent' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role} account</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} style={{ maxWidth: 400 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveProfile}><Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}</button>
            <button className="btn btn-ghost" onClick={logout}><LogOut size={14} /> Sign Out</button>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Theme picker */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} /> Accent Color
            </h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: theme === t.id ? '2px solid white' : '2px solid transparent',
                    background: t.color, cursor: 'pointer', transition: 'all 0.2s',
                    transform: theme === t.id ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: theme === t.id ? `0 0 20px ${t.color}44` : 'none'
                  }}
                  title={t.name}
                />
              ))}
            </div>
          </div>

          {/* Wallpaper picker */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image size={16} /> Wallpaper
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              {WALLPAPERS.map(w => {
                const active = wallpaper === w.id
                const gradients: Record<string,string> = {
                  'wallpaper-dots': 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                  'wallpaper-stripes': 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)',
                  'wallpaper-grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  'wallpaper-glow-top': 'radial-gradient(ellipse at 50% 0%, rgba(108,92,231,0.2) 0%, transparent 60%)',
                  'wallpaper-glow-right': 'radial-gradient(ellipse at 100% 50%, rgba(59,130,246,0.15) 0%, transparent 60%)',
                  'wallpaper-glow-bottom': 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.15) 0%, transparent 60%)',
                }
                const bgImg = gradients[w.id]
                const bgSize = w.id === 'wallpaper-dots' ? '16px 16px' : w.id === 'wallpaper-grid' ? '20px 20px' : undefined
                return (
                  <button key={w.id} onClick={() => setWallpaper(w.id)}
                    style={{
                      padding: '16px 8px', borderRadius: 12, fontSize: 24,
                      border: active ? '2px solid var(--accent)' : '1px solid var(--glass-border)',
                      background: bgImg ? `var(--bg-card), ${bgImg}` : 'var(--bg-card)',
                      backgroundSize: bgSize, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                    }}
                    title={w.name}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{w.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>ALPHA Updates</div>
            {updateInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13 }}>Current version: <strong>{updateInfo.current}</strong></div>
                <div style={{ fontSize: 13 }}>Latest version: <strong>{updateInfo.latest}</strong></div>
                {updateInfo.update_available ? (
                  <>
                    <div style={{ fontSize: 13, color: 'var(--success)' }}>An update is available!</div>
                    <button className="btn btn-primary btn-sm" onClick={applyUpdate} style={{ width: 'fit-content' }}>
                      <Download size={14} /> Install Update
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>ALPHA is up to date</div>
                )}
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={loadUpdateInfo}>
                <RefreshCw size={14} /> Check for Updates
              </button>
            )}
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Server Control</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => api.post('/system/restart')}>
                <RefreshCw size={14} /> Restart ALPHA
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Shutdown server?')) api.post('/system/shutdown') }}>
                <Server size={14} /> Shutdown
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>AI Configuration</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ollama Server URL</label>
              <input defaultValue="http://localhost:11434" style={{ maxWidth: 400 }} />
            </div>
          </div>
        </div>
      )}

      {tab === 'remote' && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Remote Access</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Access your ALPHA server from anywhere without port forwarding.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13 }}>Remote access is currently <strong>disabled</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm"><Globe size={14} /> Enable Remote Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
