import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  ClipboardList, Search, X, Loader, AlertCircle, Check,
  Info, RefreshCw, Clock, User, Globe, Activity, Shield,
  AlertTriangle, Download, ChevronDown, ChevronUp, Trash2
} from 'lucide-react'
import api from '../utils/api'

interface AuditEntry {
  id: string; action: string; user: string; resource: string; details: string; ip: string; timestamp: string
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

function ConfirmDialog({ show, title, message, onConfirm, onCancel }: { show: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div className="glass-card" style={{ padding: 20, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>{title}</h4>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-sm" onClick={onConfirm} style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

const actionIcons: Record<string, any> = {
  login: User, logout: User, create: Activity, delete: Activity,
  update: Activity, read: Activity, execute: Activity,
  firewall: Shield, dns: Globe, backup: Activity,
}

function getActionIcon(action: string) {
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key)) return icon
  }
  return Activity
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/audit/logs')
      setLogs(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load audit logs')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(async () => {
        try {
          const r = await api.get('/audit/logs')
          setLogs(r.data)
        } catch { /* silent auto-refresh */ }
      }, 10000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh])

  const clearLogs = async () => {
    try {
      await api.delete('/audit/logs/clear')
      setLogs([])
      addToast('Audit logs cleared', 'success')
    } catch { addToast('Failed to clear logs', 'error') }
    finally { setShowConfirm(false) }
  }

  const exportCSV = () => {
    const headers = ['Action', 'User', 'Resource', 'Details', 'IP', 'Timestamp']
    const rows = filtered.map(l => [
      l.action,
      l.user || '',
      l.resource || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ip || '',
      l.timestamp
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'audit-logs.csv'; a.click()
    URL.revokeObjectURL(url)
    addToast('CSV exported', 'success')
  }

  const actions = [...new Set(logs.map(l => l.action))]

  const filtered = logs.filter(l => {
    if (actionFilter && l.action !== actionFilter) return false
    if (dateStart && l.timestamp < dateStart) return false
    if (dateEnd) {
      const endDate = new Date(dateEnd)
      endDate.setDate(endDate.getDate() + 1)
      if (l.timestamp >= endDate.toISOString().slice(0, 10)) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return l.action.toLowerCase().includes(q) || l.user?.toLowerCase().includes(q) ||
        l.resource?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q) || l.ip?.includes(q)
    }
    return true
  })

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading audit logs...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfirmDialog show={showConfirm} title="Clear Audit Logs" message="Are you sure you want to clear all audit logs? This cannot be undone." onConfirm={clearLogs} onCancel={() => setShowConfirm(false)} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={18} /> Audit Log
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({filtered.length} log{filtered.length !== 1 ? 's' : ''})</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
        </div>
        <button className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAutoRefresh(!autoRefresh)} style={{ fontSize: 11 }}>
          <RefreshCw size={12} className={autoRefresh ? 'spin' : ''} /> Auto
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={14} /> CSV</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(true)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /> Clear</button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={{ height: 32, fontSize: 12, width: 150 }} placeholder="Start date" />
        <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={{ height: 32, fontSize: 12, width: 150 }} placeholder="End date" />
        {(dateStart || dateEnd) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setDateStart(''); setDateEnd('') }} style={{ fontSize: 11 }}>Clear dates</button>
        )}
      </div>

      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!actionFilter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActionFilter('')} style={{ fontSize: 11 }}>All</button>
          {actions.slice(0, 15).map(a => (
            <button key={a} className={`btn btn-sm ${actionFilter === a ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActionFilter(a)} style={{ fontSize: 11, textTransform: 'capitalize' }}>{a}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><ClipboardList size={48} /><h3>{search || actionFilter || dateStart || dateEnd ? 'No matching logs' : 'No audit logs'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(l => {
            const Icon = getActionIcon(l.action)
            const isExpanded = expandedId === l.id
            return (
              <div key={l.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{l.action}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {l.user || 'system'}</span>
                      {l.resource && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>on {l.resource}</span>}
                    </div>
                    {l.details && !isExpanded && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{l.details}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {l.ip && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                      <Clock size={10} /> {new Date(l.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {l.details && l.details.length > 80 && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpandedId(isExpanded ? null : l.id)} title={isExpanded ? 'Collapse' : 'Expand'}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <pre style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: 10, borderRadius: 6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {l.details}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
