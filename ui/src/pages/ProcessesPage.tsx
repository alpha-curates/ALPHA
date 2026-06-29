import React, { useEffect, useState } from 'react'
import api from '../utils/api'

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('cpu')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const r = await api.get(`/system/processes?sort=${sort}`)
      setProcesses(r.data || [])
      setError('')
    } catch {
      setError('Failed to load processes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [sort])

  const killProcess = async (pid: number) => {
    try {
      await api.post('/system/processes/kill', { pid })
      load()
    } catch { setError('Failed to kill process') }
  }

  const filtered = processes.filter(p =>
    p.command?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.pid).includes(search)
  )

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Search processes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="cpu">CPU</option>
          <option value="mem">Memory</option>
          <option value="pid">PID</option>
        </select>
        <button className="btn btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading processes...</div>
      ) : (
        <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>PID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>CPU%</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>MEM%</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Command</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p, i) => (
                <tr key={p.pid} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 ? 'var(--bg-card)' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.pid}</td>
                  <td style={{ padding: '8px 12px' }}>{p.user}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ color: parseFloat(p.cpu) > 50 ? 'var(--danger)' : parseFloat(p.cpu) > 20 ? 'var(--warning)' : 'inherit' }}>
                      {p.cpu}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{p.mem}</td>
                  <td style={{ padding: '8px 12px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{p.command}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button className="btn btn-sm btn-danger" onClick={() => killProcess(p.pid)} title="Kill">Kill</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No processes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
