import React, { useEffect, useState, useRef } from 'react'
import { Terminal, Activity, HardDrive, Wifi, Database, Play, Clock, Plus, Trash2, Server, Cpu } from 'lucide-react'
import api from '../utils/api'

export default function SystemToolsPage() {
  const [tab, setTab] = useState('processes')
  const tabs = [
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'disks', label: 'Disk Health', icon: Server },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'backups', label: 'Backup Jobs', icon: Database },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'processes' && <ProcessesTab />}
      {tab === 'logs' && <LogsTab />}
      {tab === 'disks' && <DisksTab />}
      {tab === 'network' && <NetworkTab />}
      {tab === 'backups' && <BackupsTab />}
    </div>
  )
}

function ProcessesTab() {
  const [procs, setProcs] = useState<any[]>([])
  const [sort, setSort] = useState('cpu')

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get(`/system/processes?sort=${sort}`)
        setProcs(r.data)
      } catch {}
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [sort])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <button className={`btn btn-ghost btn-sm ${sort === 'cpu' ? 'btn-primary' : ''}`} onClick={() => setSort('cpu')}>Sort by CPU</button>
        <button className={`btn btn-ghost btn-sm ${sort === 'mem' ? 'btn-primary' : ''}`} onClick={() => setSort('mem')}>Sort by Memory</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>PID</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>User</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>CPU%</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>MEM%</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Command</th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 11 }}>{p.pid}</td>
                <td style={{ padding: '5px 8px', fontSize: 12 }}>{p.user}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{p.cpu}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{p.mem}</td>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 11 }}>{p.command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LogsTab() {
  const [logs, setLogs] = useState<Record<string, string[]>>({})
  const [selected, setSelected] = useState('')

  useEffect(() => {
    api.get('/system/logs').then(r => {
      setLogs(r.data)
      const keys = Object.keys(r.data)
      if (keys.length > 0) setSelected(keys[0])
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {Object.keys(logs).map(k => (
          <button key={k} className={`btn btn-ghost btn-sm ${selected === k ? 'btn-primary' : ''}`} onClick={() => setSelected(k)}>{k}</button>
        ))}
      </div>
      <div className="glass-card" style={{ padding: 12, background: '#0a0a0a', fontFamily: 'monospace', fontSize: 11, maxHeight: 400, overflow: 'auto' }}>
        {selected && logs[selected]?.map((line, i) => (
          <div key={i} style={{ lineHeight: 1.5, color: line.toLowerCase().includes('error') ? 'var(--danger)' : line.toLowerCase().includes('warn') ? 'var(--warning)' : 'var(--text-secondary)' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function DisksTab() {
  const [drives, setDrives] = useState<any[]>([])
  const [smart, setSmart] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])

  useEffect(() => {
    api.get('/system/disk-health').then(r => {
      setDrives(r.data.drives || [])
      setSmart(r.data.smart || [])
    }).catch(() => {})
    api.get('/system/disk-usage').then(r => setUsage(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {usage.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Disk Usage</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usage.map((u, i) => (
              <div key={i} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <HardDrive size={16} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{u.mounted_on}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.filesystem} · {u.size}</div>
                </div>
                <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: u.use_percent, height: '100%', background: parseInt(u.use_percent) > 85 ? 'var(--danger)' : 'var(--accent)', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>{u.use_percent}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {smart.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>SMART Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {smart.map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Server size={16} />
                <div style={{ flex: 1 }}><span style={{ fontFamily: 'monospace' }}>{s.device}</span></div>
                <span style={{ fontSize: 12, color: s.status === 'PASSED' ? 'var(--success)' : 'var(--danger)' }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {drives.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Detected Drives</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {drives.map((d, i) => (
              <div key={i} className="glass-card" style={{ padding: 12, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.model || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.size}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NetworkTab() {
  const [host, setHost] = useState('')
  const [output, setOutput] = useState('')
  const [pinging, setPinging] = useState(false)
  const [mac, setMac] = useState('')
  const [wakeMsg, setWakeMsg] = useState('')

  const ping = async () => {
    if (!host.trim()) return
    setPinging(true)
    setOutput('')
    try {
      const r = await api.post('/system/ping', { host, count: 4 })
      setOutput(r.data.output || r.data.error || 'No response')
    } catch (e: any) {
      setOutput(e.message || 'Error')
    }
    setPinging(false)
  }

  const wake = async () => {
    if (!mac.trim()) return
    try {
      const r = await api.post('/system/wake', { mac })
      setWakeMsg(r.data.message || r.data.error || 'Sent')
    } catch (e: any) {
      setWakeMsg(e.message || 'Error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ping</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Hostname or IP" value={host} onChange={e => setHost(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }}
            onKeyDown={e => e.key === 'Enter' && ping()} />
          <button className="btn btn-primary btn-sm" onClick={ping} disabled={pinging}>
            <Activity size={14} /> {pinging ? 'Pinging...' : 'Ping'}
          </button>
        </div>
        {output && (
          <div style={{ marginTop: 8, padding: 10, background: '#0a0a0a', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {output}
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Wake-on-LAN</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="MAC address (e.g. AA:BB:CC:DD:EE:FF)" value={mac} onChange={e => setMac(e.target.value)}
            style={{ flex: 1, height: 34, fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={wake}><Wifi size={14} /> Wake</button>
        </div>
        {wakeMsg && <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-secondary)' }}>{wakeMsg}</div>}
      </div>
    </div>
  )
}

function BackupsTab() {
  const [jobs, setJobs] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [src, setSrc] = useState('')
  const [dst, setDst] = useState('')
  const [schedule, setSchedule] = useState('manual')

  useEffect(() => {
    api.get('/system/backups').then(r => setJobs(r.data)).catch(() => {})
  }, [])

  const create = async () => {
    if (!name || !src || !dst) return
    await api.post('/system/backups', { name, source_path: src, dest_path: dst, schedule })
    setShowCreate(false); setName(''); setSrc(''); setDst('')
    const r = await api.get('/system/backups'); setJobs(r.data)
  }

  const run = async (id: string) => {
    await api.post(`/system/backups/${id}/run`)
    const r = await api.get('/system/backups'); setJobs(r.data)
  }

  const remove = async (id: string) => {
    await api.delete(`/system/backups/${id}`)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New Backup Job</button>
      </div>

      {showCreate && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="Job name" value={name} onChange={e => setName(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          <input placeholder="Source path" value={src} onChange={e => setSrc(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          <input placeholder="Destination path" value={dst} onChange={e => setDst(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={schedule} onChange={e => setSchedule(e.target.value)} style={{ width: 'auto', height: 32, fontSize: 12 }}>
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={create}>Create</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state"><Database size={48} /><h3>No backup jobs</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {jobs.map(j => (
            <div key={j.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{j.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {j.source_path} → {j.dest_path}
                  {j.schedule !== 'manual' && ` · ${j.schedule}`}
                  {j.last_run && ` · Last: ${new Date(j.last_run).toLocaleString()}`}
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 8,
                background: j.last_status === 'success' ? 'var(--success-dim)' : j.last_status === 'failed' ? 'var(--danger-dim)' : 'var(--warning-dim)',
                color: j.last_status === 'success' ? 'var(--success)' : j.last_status === 'failed' ? 'var(--danger)' : 'var(--warning)'
              }}>{j.last_status}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => run(j.id)} title="Run now"><Play size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(j.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
