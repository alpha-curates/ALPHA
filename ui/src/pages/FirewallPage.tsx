import React, { useEffect, useState, useCallback } from 'react'
import {
  Shield, ShieldOff, Plus, X, Trash2, Loader, AlertCircle,
  Check, Info, RefreshCw, Globe, Server, Wifi
, AlertTriangle
} from 'lucide-react'
import api from '../utils/api'

interface FirewallRule {
  id: string; chain: string; protocol: string; source: string; destination: string
  port: string; action: string; enabled: boolean
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

export default function FirewallPage() {
  const [enabled, setEnabled] = useState(true)
  const [rules, setRules] = useState<FirewallRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newRule, setNewRule] = useState({ chain: 'INPUT', protocol: 'tcp', source: '', destination: '', port: '', action: 'ACCEPT' })
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, rRes] = await Promise.all([
        api.get('/firewall/status'),
        api.get('/firewall/rules')
      ])
      setEnabled(sRes.data.enabled)
      setRules(rRes.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load firewall')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleFirewall = async () => {
    try {
      await api.post('/firewall/toggle', { enabled: !enabled })
      setEnabled(!enabled)
      addToast(`Firewall ${!enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch { addToast('Failed to toggle firewall', 'error') }
  }

  const addRule = async () => {
    try {
      await api.post('/firewall/rules/add', newRule)
      addToast('Rule added', 'success')
      setShowAdd(false)
      setNewRule({ chain: 'INPUT', protocol: 'tcp', source: '', destination: '', port: '', action: 'ACCEPT' })
      load()
    } catch { addToast('Failed to add rule', 'error') }
  }

  const deleteRule = async (id: string) => {
    try {
      await api.delete(`/firewall/rules/delete/${id}`)
      setRules(prev => prev.filter(r => r.id !== id))
      addToast('Rule deleted', 'success')
    } catch { addToast('Failed to delete rule', 'error') }
  }

  const ActionIcon = enabled ? Shield : ShieldOff

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading firewall...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} /> Firewall
        </h3>
        <div style={{ flex: 1 }} />
        <button className={`btn btn-sm ${enabled ? 'btn-success' : 'btn-secondary'}`} onClick={toggleFirewall} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ActionIcon size={14} /> {enabled ? 'Enabled' : 'Disabled'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Add Rule</button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={newRule.chain} onChange={e => setNewRule(r => ({ ...r, chain: e.target.value }))} style={{ height: 32, fontSize: 12, width: 100 }}>
              <option value="INPUT">INPUT</option>
              <option value="OUTPUT">OUTPUT</option>
              <option value="FORWARD">FORWARD</option>
            </select>
            <select value={newRule.protocol} onChange={e => setNewRule(r => ({ ...r, protocol: e.target.value }))} style={{ height: 32, fontSize: 12, width: 80 }}>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="icmp">ICMP</option>
              <option value="any">Any</option>
            </select>
            <input placeholder="Source IP/CIDR" value={newRule.source} onChange={e => setNewRule(r => ({ ...r, source: e.target.value }))} style={{ height: 32, fontSize: 12, width: 130 }} />
            <input placeholder="Dest IP/CIDR" value={newRule.destination} onChange={e => setNewRule(r => ({ ...r, destination: e.target.value }))} style={{ height: 32, fontSize: 12, width: 130 }} />
            <input placeholder="Port" value={newRule.port} onChange={e => setNewRule(r => ({ ...r, port: e.target.value }))} style={{ height: 32, fontSize: 12, width: 70 }} />
            <select value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))} style={{ height: 32, fontSize: 12, width: 90 }}>
              <option value="ACCEPT">ACCEPT</option>
              <option value="DROP">DROP</option>
              <option value="REJECT">REJECT</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={addRule} style={{ height: 32 }}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ height: 32 }}>Cancel</button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="empty-state"><Shield size={48} /><h3>No firewall rules</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span style={{ width: 70 }}>Chain</span>
            <span style={{ width: 60 }}>Protocol</span>
            <span style={{ flex: 1 }}>Source</span>
            <span style={{ flex: 1 }}>Destination</span>
            <span style={{ width: 60 }}>Port</span>
            <span style={{ width: 70 }}>Action</span>
            <span style={{ width: 40 }} />
          </div>
          {rules.map(r => (
            <div key={r.id} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ width: 70, fontFamily: 'monospace', fontSize: 11 }}>{r.chain}</span>
              <span style={{ width: 60, fontSize: 11 }}>{r.protocol}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{r.source || '*'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{r.destination || '*'}</span>
              <span style={{ width: 60, fontSize: 11 }}>{r.port || '*'}</span>
              <span style={{ width: 70, fontSize: 11 }}>
                <span className={`badge ${r.action === 'ACCEPT' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>{r.action}</span>
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteRule(r.id)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
