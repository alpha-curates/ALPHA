import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Activity, X, Search, Loader, AlertCircle, Check, Info,
  Trash2, RefreshCw, Cpu, HardDrive, Zap, AlertTriangle,
  ArrowUp, ArrowDown, Play, Pause
} from 'lucide-react'
import api from '../utils/api'

interface ProcessInfo {
  pid: number; name: string; cpu: number; memory: number; status: string; user: string; command: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '90%' }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

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

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [sortField, setSortField] = useState<'pid' | 'name' | 'cpu' | 'memory' | ''>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [killPid, setKillPid] = useState<number | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [processDetail, setProcessDetail] = useState<ProcessInfo | null>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/processes/list')
      setProcesses(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load processes')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoRefresh) {
      autoRef.current = setInterval(load, 5000)
    } else {
      if (autoRef.current) clearInterval(autoRef.current)
      autoRef.current = null
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [autoRefresh, load])

  const killProcess = async (pid: number) => {
    try {
      await api.post(`/processes/kill/${pid}`)
      addToast(`Process ${pid} killed`, 'success')
      load()
    } catch { addToast('Failed to kill process', 'error') }
  }

  const filtered = useMemo(() => {
    return processes.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pid).includes(search) || (p.user && p.user.toLowerCase().includes(search.toLowerCase()))
    )
  }, [processes, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (!sortField) return list
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'pid') cmp = a.pid - b.pid
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'cpu') cmp = a.cpu - b.cpu
      else if (sortField === 'memory') cmp = a.memory - b.memory
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortField, sortDir])

  const toggleSort = (field: 'pid' | 'name' | 'cpu' | 'memory') => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
  }

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading processes...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} /> Processes
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>({processes.length})</span>
        </h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
        <button className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Stop auto-refresh' : 'Auto-refresh every 5s'}>
          {autoRefresh ? <Pause size={14} /> : <Play size={14} />} {autoRefresh ? 'Auto' : 'Auto'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state"><Activity size={48} /><h3>{search ? 'No matching processes' : 'No processes'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span style={{ width: 60, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }} onClick={() => toggleSort('pid')}>
              PID <SortIcon field="pid" />
            </span>
            <span style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }} onClick={() => toggleSort('name')}>
              Name <SortIcon field="name" />
            </span>
            <span style={{ width: 60, textAlign: 'right', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }} onClick={() => toggleSort('cpu')}>
              CPU <SortIcon field="cpu" />
            </span>
            <span style={{ width: 60, textAlign: 'right', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }} onClick={() => toggleSort('memory')}>
              Memory <SortIcon field="memory" />
            </span>
            <span style={{ width: 80 }}>Status</span>
            <span style={{ width: 80 }}>User</span>
            <span style={{ width: 40 }} />
          </div>
          {sorted.map(p => (
            <div key={p.pid} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, cursor: 'pointer' }} onClick={() => setProcessDetail(p)}>
              <span style={{ width: 60, flexShrink: 0, fontFamily: 'monospace' }}>{p.pid}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ width: 60, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                <Cpu size={10} style={{ color: p.cpu > 50 ? 'var(--danger)' : 'var(--text-muted)' }} />{p.cpu?.toFixed(1)}%
              </span>
              <span style={{ width: 60, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                <HardDrive size={10} style={{ color: 'var(--text-muted)' }} />{p.memory?.toFixed(1)}%
              </span>
              <span style={{ width: 80, fontSize: 11 }}><span className={`badge ${p.status === 'running' ? 'badge-success' : 'badge-ghost'}`} style={{ fontSize: 10 }}>{p.status}</span></span>
              <span style={{ width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{p.user}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setKillPid(p.pid) }} title="Kill" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {killPid !== null && (
        <ConfirmDialog open={true} title="Kill Process" message={`Are you sure you want to kill process ${killPid}?`} onConfirm={() => { killProcess(killPid); setKillPid(null) }} onCancel={() => setKillPid(null)} />
      )}

      {processDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setProcessDetail(null)}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={20} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: 15, fontWeight: 600 }}>{processDetail.name}</h4>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(PID {processDetail.pid})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Command:</span>
                <pre style={{ margin: '4px 0', fontSize: 11, background: 'var(--glass-bg)', padding: 8, borderRadius: 6, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{processDetail.command || 'N/A'}</pre>
              </div>
              <div><span style={{ color: 'var(--text-muted)' }}>User:</span> {processDetail.user || 'N/A'}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> {processDetail.status}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>CPU:</span> <span style={{ color: processDetail.cpu > 50 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>{processDetail.cpu?.toFixed(1)}%</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Memory:</span> <span style={{ fontWeight: 600 }}>{processDetail.memory?.toFixed(1)}%</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setProcessDetail(null)}>Close</button>
              <button className="btn btn-danger btn-sm" onClick={() => { setProcessDetail(null); setKillPid(processDetail.pid) }}>Kill Process</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
