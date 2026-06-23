import React, { useEffect, useState } from 'react'
import {
  Settings, User, Bell, Shield, RefreshCw, Download,
  Server, Globe, Moon, Sun, LogOut, Save, Brain, Palette,
  Image, Wifi, WifiOff, Signal, SignalHigh, SignalMedium,
  SignalLow, Check, X, Loader, Zap, Archive, Upload,
  Trash2, FileText, Clock
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme, wallpaper, setWallpaper, THEMES, WALLPAPERS } = useTheme()
  const [tab, setTab] = useState<'profile' | 'appearance' | 'system' | 'ai' | 'remote' | 'network' | 'backup'>('profile')
  const [email, setEmail] = useState(user?.email || '')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  // WiFi state
  const [wifiStatus, setWifiStatus] = useState<any>(null)
  const [networks, setNetworks] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectSsid, setConnectSsid] = useState('')
  const [connectPass, setConnectPass] = useState('')
  const [wifiMsg, setWifiMsg] = useState('')
  const [hotspotSsid, setHotspotSsid] = useState('ALPHA-Setup')
  const [hotspotPass, setHotspotPass] = useState('alphasetup')
  const [hotspotBusy, setHotspotBusy] = useState(false)

  // Backup state
  const [backups, setBackups] = useState<any[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [includeStorage, setIncludeStorage] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')

  const loadBackups = async () => {
    try { setBackups((await api.get('/backup/list')).data) } catch {}
  }

  const createBackup = async () => {
    setCreatingBackup(true); setBackupMsg('')
    try {
      await api.post('/backup/create', { include_storage: includeStorage })
      setBackupMsg('Backup created!')
      loadBackups()
    } catch { setBackupMsg('Backup failed') }
    setCreatingBackup(false)
  }

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setRestoring(true); setBackupMsg('')
    const form = new FormData()
    form.append('file', e.target.files[0])
    try {
      await api.post('/backup/restore', form, { headers: { 'Content-Type': 'multipart/form-data' }})
      setBackupMsg('Restore complete! Rebooting...')
    } catch { setBackupMsg('Restore failed') }
    setRestoring(false)
  }

  const downloadBackup = async (id: string) => {
    window.open(`${api.defaults.baseURL}/backup/download/${id}`, '_blank')
  }

  const deleteBackup = async (id: string) => {
    if (!confirm('Delete this backup?')) return
    await api.delete(`/backup/delete/${id}`)
    loadBackups()
  }

  const formatBytes = (b: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0; let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${size.toFixed(1)} ${units[i]}`
  }

  const loadWifiStatus = async () => {
    try { setWifiStatus((await api.get('/wifi/status')).data) } catch {}
  }

  const scanNetworks = async () => {
    setScanning(true); setWifiMsg('')
    try { setNetworks((await api.get('/wifi/scan')).data.networks || []) }
    catch { setWifiMsg('Scan failed') }
    setScanning(false)
  }

  const connectToNetwork = async () => {
    if (!connectSsid) return
    setConnecting(true); setWifiMsg('')
    try {
      await api.post('/wifi/connect', { ssid: connectSsid, password: connectPass })
      setWifiMsg(`Connected to ${connectSsid}`); setConnectSsid(''); setConnectPass('')
      setTimeout(loadWifiStatus, 3000)
    } catch { setWifiMsg('Connection failed') }
    setConnecting(false)
  }

  const enableHotspot = async () => {
    setHotspotBusy(true); setWifiMsg('')
    try {
      const r = await api.post('/wifi/hotspot/on', { ssid: hotspotSsid, password: hotspotPass })
      setWifiMsg(`Hotspot "${r.data.ssid}" active — connect to join`)
      setTimeout(loadWifiStatus, 3000)
    } catch { setWifiMsg('Hotspot failed') }
    setHotspotBusy(false)
  }

  const disableHotspot = async () => {
    setHotspotBusy(true)
    try { await api.post('/wifi/hotspot/off'); setWifiMsg('Hotspot stopped'); setTimeout(loadWifiStatus, 3000) }
    catch { setWifiMsg('Failed to stop hotspot') }
    setHotspotBusy(false)
  }

  const loadUpdateInfo = async () => {
    try {
      const r = await api.get('/system/update/check')
      setUpdateInfo(r.data)
    } catch {}
  }

  useEffect(() => {
    if (tab === 'system') loadUpdateInfo()
    if (tab === 'network') loadWifiStatus()
    if (tab === 'backup') loadBackups()
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
          { id: 'network', label: 'Network', icon: Wifi },
          { id: 'system', label: 'System', icon: Server },
          { id: 'backup', label: 'Backup', icon: Archive },
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

      {tab === 'network' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {wifiStatus?.hotspot_active ? <WifiOff size={16} /> : wifiStatus?.connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                WiFi {wifiStatus?.hotspot_active ? 'Hotspot' : wifiStatus?.connected ? 'Connected' : 'Disconnected'}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={loadWifiStatus} title="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>
            {wifiStatus && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <span>SSID: <strong>{wifiStatus.ssid || '—'}</strong></span>
                <span>IP: <strong>{wifiStatus.ip || '—'}</strong></span>
                <span>Mode: <strong>{wifiStatus.mode}</strong></span>
                <span>Signal: <strong>{wifiStatus.signal || 0}%</strong></span>
              </div>
            )}
          </div>

          {/* Connect to network */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wifi size={16} /> Join a Network
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input placeholder="SSID" value={connectSsid} onChange={e => setConnectSsid(e.target.value)}
                style={{ flex: 1, height: 32, fontSize: 13 }} />
              <input placeholder="Password" type="password" value={connectPass} onChange={e => setConnectPass(e.target.value)}
                style={{ flex: 1, height: 32, fontSize: 13 }} />
              <button className="btn btn-primary btn-sm" onClick={connectToNetwork} disabled={!connectSsid || connecting}
                style={{ height: 32 }}>
                {connecting ? <Loader size={14} className="spin" /> : <Check size={14} />}
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={scanNetworks} disabled={scanning}
              style={{ fontSize: 12 }}>
              <RefreshCw size={12} /> {scanning ? 'Scanning...' : 'Scan for networks'}
            </button>
            {networks.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {networks.map((n, i) => (
                  <div key={i} className="glass-card" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => { setConnectSsid(n.ssid); setConnectPass('') }}>
                    <Signal size={14} style={{ color: n.signal > 60 ? 'var(--success)' : n.signal > 30 ? 'var(--warning)' : 'var(--text-muted)' }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{n.ssid}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.signal}%</span>
                    <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, background: 'var(--glass-border)', color: 'var(--text-muted)' }}>{n.security}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hotspot */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <WifiOff size={16} /> Hotspot Access Point
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input placeholder="SSID" value={hotspotSsid} onChange={e => setHotspotSsid(e.target.value)}
                style={{ flex: 1, height: 32, fontSize: 13 }} disabled={wifiStatus?.hotspot_active} />
              <input placeholder="Password" value={hotspotPass} onChange={e => setHotspotPass(e.target.value)}
                style={{ flex: 1, height: 32, fontSize: 13 }} disabled={wifiStatus?.hotspot_active} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {wifiStatus?.hotspot_active ? (
                <button className="btn btn-danger btn-sm" onClick={disableHotspot} disabled={hotspotBusy}>
                  <X size={14} /> Stop Hotspot
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={enableHotspot} disabled={hotspotBusy}>
                  <WifiOff size={14} /> Start Hotspot
                </button>
              )}
            </div>
          </div>

          {wifiMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: wifiMsg.includes('failed') || wifiMsg.includes('Failed') ? 'var(--danger-dim)' : 'var(--success-dim)', color: wifiMsg.includes('failed') || wifiMsg.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>
              {wifiMsg}
            </div>
          )}
        </div>
      )}

      {tab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Archive size={16} /> Create Backup
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={creatingBackup}>
                {creatingBackup ? <Loader size={14} className="spin" /> : <Download size={14} />}
                {creatingBackup ? ' Creating...' : ' Create Backup'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={includeStorage} onChange={e => setIncludeStorage(e.target.checked)} />
                Include storage files
              </label>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginLeft: 'auto' }}>
                <Upload size={14} /> Restore from file
                <input type="file" accept=".tar.gz" style={{ display: 'none' }} onChange={restoreBackup} disabled={restoring} />
              </label>
            </div>
          </div>

          {backups.length > 0 && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Available Backups</div>
                <button className="btn btn-ghost btn-sm" onClick={loadBackups}><RefreshCw size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {backups.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 13 }}>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                        <span>{formatBytes(b.size)}</span>
                        <span>{new Date(b.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => window.open(`/api/backup/download/${b.id}`, '_blank')}>
                      <Download size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteBackup(b.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backupMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: backupMsg.includes('failed') ? 'var(--danger-dim)' : 'var(--success-dim)', color: backupMsg.includes('failed') ? 'var(--danger)' : 'var(--success)' }}>
              {backupMsg}
            </div>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>AI Configuration</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ollama Server URL</label>
                <input defaultValue="http://localhost:11434" style={{ maxWidth: 400 }} />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Finish AI Setup</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Install Ollama, pull a model, and configure your AI provider
                </div>
              </div>
              <button className="btn btn-primary" onClick={async () => {
                if (!confirm('Install Ollama and pull llama3.2:1b model? This may take several minutes.')) return
                try {
                  const r = await api.post('/ai/install-ollama')
                  alert(r.data.message || 'Done!')
                } catch (e: any) {
                  alert(e.response?.data?.error || 'Installation failed')
                }
              }}>
                <Zap size={16} /> Install & Setup
              </button>
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
