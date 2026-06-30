import React, { useEffect, useState, useCallback } from 'react'
import {
  Globe, Wifi, WifiOff, Save, Loader, AlertCircle, Check,
  Info, X, RefreshCw, Shield, Activity, List
} from 'lucide-react'
import api from '../utils/api'

interface ProxySettings {
  enabled: boolean; host: string; port: number; username: string; password: string; protocol: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

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

export default function ProxyPage() {
  const [settings, setSettings] = useState<ProxySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [bypassDomains, setBypassDomains] = useState<string>('')
  const [bypassLoading, setBypassLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [latency, setLatency] = useState<number | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/proxy/settings')
      setSettings(r.data)
      if (r.data.latency !== undefined) setLatency(r.data.latency)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load proxy settings')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const loadBypass = useCallback(async () => {
    setBypassLoading(true)
    try {
      const r = await api.get('/proxy/bypass')
      const domains: string[] = r.data.domains || r.data
      setBypassDomains(Array.isArray(domains) ? domains.join('\n') : '')
    } catch { addToast('Failed to load bypass list', 'error') }
    finally { setBypassLoading(false) }
  }, [addToast])

  useEffect(() => { loadBypass() }, [loadBypass])

  const saveBypass = async () => {
    const domains = bypassDomains.split('\n').map(d => d.trim()).filter(Boolean)
    try {
      await api.put('/proxy/bypass', { domains })
      addToast('Bypass list saved', 'success')
    } catch { addToast('Failed to save bypass list', 'error') }
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await api.put('/proxy/settings', settings)
      addToast('Proxy settings saved', 'success')
    } catch { addToast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const toggle = async () => {
    if (!settings) return
    try {
      const r = await api.post('/proxy/toggle', { enabled: !settings.enabled })
      setSettings(s => s ? { ...s, enabled: r.data.enabled ?? !s.enabled } : s)
      addToast(`Proxy ${!settings.enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch { addToast('Failed to toggle proxy', 'error') }
  }

  const testProxy = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api.post('/proxy/test')
      setTestResult(r.data.result || r.data.message || 'Connection successful')
      if (r.data.latency !== undefined) setLatency(r.data.latency)
      addToast('Proxy test completed', 'success')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Proxy test failed'
      setTestResult(msg)
      addToast(msg, 'error')
    }
    finally { setTesting(false) }
  }

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading proxy settings...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} /> Proxy Settings
        </h3>
        <div style={{ flex: 1 }} />
        {settings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {latency !== null && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Activity size={11} /> {latency}ms
              </span>
            )}
            <button className={`btn btn-sm ${settings.enabled ? 'btn-success' : 'btn-secondary'}`} onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {settings.enabled ? <Wifi size={14} /> : <WifiOff size={14} />} {settings.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        )}
      </div>

      {settings && (
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Protocol</label>
            <select value={settings.protocol} onChange={e => setSettings(s => s ? { ...s, protocol: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }}>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Host</label>
              <input value={settings.host} onChange={e => setSettings(s => s ? { ...s, host: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} placeholder="proxy.example.com" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Port</label>
              <input type="number" value={settings.port} onChange={e => setSettings(s => s ? { ...s, port: parseInt(e.target.value) || 0 } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} placeholder="3128" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Username (optional)</label>
              <input value={settings.username} onChange={e => setSettings(s => s ? { ...s, username: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password (optional)</label>
              <input type="password" value={settings.password} onChange={e => setSettings(s => s ? { ...s, password: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? <><Loader size={14} className="spin" /> Saving...</> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={testProxy} disabled={testing}>
              {testing ? <><Loader size={14} className="spin" /> Testing...</> : <><Activity size={14} /> Test</>}
            </button>
          </div>
          {testResult && (
            <div style={{ fontSize: 12, padding: 8, borderRadius: 6, background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
              {testResult}
            </div>
          )}
        </div>
      )}

      <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <List size={14} /> Bypass List
        </h4>
        <textarea
          value={bypassDomains}
          onChange={e => setBypassDomains(e.target.value)}
          placeholder="one domain per line&#10;e.g.&#10;localhost&#10;192.168.0.0/16&#10;*.internal.com"
          rows={6}
          style={{ width: '100%', fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }}
        />
        <div>
          <button className="btn btn-primary btn-sm" onClick={saveBypass}>
            <Save size={14} /> Save Bypass List
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
