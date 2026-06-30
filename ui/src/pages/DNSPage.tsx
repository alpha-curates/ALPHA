import React, { useEffect, useState, useCallback } from 'react'
import {
  Globe, Plus, X, Trash2, Loader, AlertCircle, Check,
  Info, RefreshCw, Server, Save, Wifi, Search, Activity
} from 'lucide-react'
import api from '../utils/api'

interface DNSSettings {
  primary: string; secondary: string; fallback: string; cache_size: number; ttl: number
}

interface DNSRecord {
  type: string; value: string; ttl: number
}

interface QueryLog {
  query: string; type: string; result: string; timestamp: string
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

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

export default function DNSPage() {
  const [settings, setSettings] = useState<DNSSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [lookupHost, setLookupHost] = useState('')
  const [lookupResult, setLookupResult] = useState<DNSRecord[] | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([])
  const [queryLogsLoading, setQueryLogsLoading] = useState(false)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/dns/settings')
      setSettings(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load DNS settings')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const loadQueryLogs = useCallback(async () => {
    setQueryLogsLoading(true)
    try {
      const r = await api.get('/dns/queries')
      setQueryLogs(r.data)
    } catch { /* ignore */ }
    finally { setQueryLogsLoading(false) }
  }, [])

  const save = async () => {
    if (!settings) return
    if (!IP_REGEX.test(settings.primary)) { addToast('Invalid primary DNS IP address', 'error'); return }
    if (!IP_REGEX.test(settings.secondary)) { addToast('Invalid secondary DNS IP address', 'error'); return }
    if (settings.fallback && !IP_REGEX.test(settings.fallback)) { addToast('Invalid fallback DNS IP address', 'error'); return }
    setSaving(true)
    try {
      await api.put('/dns/settings', settings)
      addToast('DNS settings saved', 'success')
    } catch { addToast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const clearCache = async () => {
    try {
      await api.post('/dns/clear-cache')
      addToast('DNS cache cleared', 'success')
    } catch { addToast('Failed to clear cache', 'error') }
  }

  const doLookup = async () => {
    if (!lookupHost.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const r = await api.post('/dns/lookup', { host: lookupHost.trim() })
      setLookupResult(r.data.records || r.data)
    } catch { addToast('DNS lookup failed', 'error') }
    finally { setLookupLoading(false) }
  }

  const testConnection = async () => {
    if (!settings) return
    setTesting(true)
    try {
      const r = await api.post('/system_tools/ping', { host: settings.primary, count: 1 })
      addToast(`Ping to ${settings.primary} successful`, 'success')
    } catch { addToast('Connection test failed', 'error') }
    finally { setTesting(false) }
  }

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading DNS settings...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} /> DNS Settings
        </h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={loadQueryLogs}><Activity size={14} /> Query Logs</button>
        <button className="btn btn-ghost btn-sm" onClick={clearCache}><RefreshCw size={14} /> Clear Cache</button>
      </div>

      {settings && (
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Primary DNS Server</label>
            <input value={settings.primary} onChange={e => setSettings(s => s ? { ...s, primary: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} placeholder="8.8.8.8" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Secondary DNS Server</label>
            <input value={settings.secondary} onChange={e => setSettings(s => s ? { ...s, secondary: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} placeholder="8.8.4.4" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fallback DNS Server</label>
            <input value={settings.fallback} onChange={e => setSettings(s => s ? { ...s, fallback: e.target.value } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} placeholder="1.1.1.1" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cache Size (entries)</label>
              <input type="number" value={settings.cache_size} onChange={e => setSettings(s => s ? { ...s, cache_size: parseInt(e.target.value) || 0 } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TTL (seconds)</label>
              <input type="number" value={settings.ttl} onChange={e => setSettings(s => s ? { ...s, ttl: parseInt(e.target.value) || 0 } : s)} style={{ width: '100%', height: 36, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? <><Loader size={14} className="spin" /> Saving...</> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={testConnection} disabled={testing}>
              {testing ? <><Loader size={14} className="spin" /> Testing...</> : <><Wifi size={14} /> Test Connection</>}
            </button>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={14} /> DNS Lookup
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Enter hostname (e.g. google.com)" value={lookupHost} onChange={e => setLookupHost(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLookup()}
            style={{ flex: 1, height: 36, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={doLookup} disabled={lookupLoading}>
            {lookupLoading ? <><Loader size={14} className="spin" /> Looking up...</> : 'Lookup'}
          </button>
        </div>
        {lookupResult && (
          <pre style={{ background: 'var(--glass-bg)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 200, margin: 0 }}>
            {JSON.stringify(lookupResult, null, 2)}
          </pre>
        )}
      </div>

      <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <Activity size={14} /> Recent Queries
          </h4>
          <button className="btn btn-ghost btn-sm" onClick={loadQueryLogs} disabled={queryLogsLoading}>
            <RefreshCw size={12} className={queryLogsLoading ? 'spin' : ''} />
          </button>
        </div>
        {queryLogs.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No recent queries</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {queryLogs.slice(0, 20).map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>{new Date(q.timestamp).toLocaleTimeString()}</span>
                <span style={{ fontWeight: 500, flex: 1 }}>{q.query}</span>
                <span style={{ color: 'var(--text-muted)', width: 40 }}>{q.type}</span>
                <span style={{ color: q.result === 'OK' ? 'var(--success)' : 'var(--danger)', width: 40 }}>{q.result}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
