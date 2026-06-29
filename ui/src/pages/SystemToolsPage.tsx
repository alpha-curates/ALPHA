import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Terminal, Activity, HardDrive, Wifi, Database, Play, Clock, Plus, Trash2,
  Server, Cpu, RefreshCw, Heart, Shield, Box, Container, Layers, Navigation,
  Thermometer, Cable, Package, Power, Calendar, List, Globe, Monitor,
  AlertTriangle, Check, X, Info, Search, Filter, StopCircle,
  Users, Download, Upload, ArrowUp
} from 'lucide-react'
import api from '../utils/api'

interface Toast { type: 'success' | 'error' | 'info'; message: string }

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t) }, [onDismiss])
  const bg = toast.type === 'success' ? 'rgba(34,197,94,0.15)' : toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'
  const color = toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#3b82f6'
  const Icon = toast.type === 'success' ? Check : toast.type === 'error' ? X : Info
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: bg, border: '1px solid ' + color, color, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
      <Icon size={16} />
      <span>{toast.message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, marginLeft: 8 }}><X size={14} /></button>
    </div>
  )
}

function Skeleton({ lines = 3, widths }: { lines?: number; widths?: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ height: 20, borderRadius: 6, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', width: widths?.[i] || (i === 0 ? '60%' : i === 1 ? '80%' : '50%') }} />
      ))}
    </div>
  )
}

function ToolCard({ icon: Icon, title, description, action, loading, children }: {
  icon: any; title: string; description: string; action?: React.ReactNode; loading?: boolean; children: React.ReactNode
}) {
  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} style={{ flexShrink: 0, color: 'var(--accent)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{description}</div>
        </div>
        {action}
      </div>
      {loading ? <Skeleton lines={3} /> : children}
    </div>
  )
}

export default function SystemToolsPage() {
  const [tab, setTab] = useState('processes')
  const categories = [
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'disks', label: 'Disk Health', icon: Server },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'backups', label: 'Backup Jobs', icon: Database },
    { id: 'services', label: 'Services', icon: Activity },
    { id: 'sysinfo', label: 'System Info', icon: Monitor },
    { id: 'docker', label: 'Docker', icon: Container },
    { id: 'cron', label: 'Cron Jobs', icon: Clock },
    { id: 'firewall', label: 'Firewall', icon: Shield },
    { id: 'sensors', label: 'Sensors', icon: Thermometer },
    { id: 'usb', label: 'USB Devices', icon: Cable },
    { id: 'modules', label: 'Kernel Modules', icon: Layers },
    { id: 'mounts', label: 'Mount Points', icon: HardDrive },
    { id: 'packages', label: 'Package Manager', icon: Package },
    { id: 'timers', label: 'Scheduled Tasks', icon: Calendar },
    { id: 'env', label: 'Environment', icon: List },
    { id: 'sessions', label: 'User Sessions', icon: Users },
    { id: 'connections', label: 'Net Connections', icon: Globe },
    { id: 'power', label: 'Power Management', icon: Power },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map(t => (
          <button key={t.id} className={'btn btn-sm ' + (tab === t.id ? 'btn-primary' : 'btn-ghost')} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'processes' && <ProcessesTab />}
      {tab === 'logs' && <LogsTab />}
      {tab === 'disks' && <DisksTab />}
      {tab === 'network' && <NetworkTab />}
      {tab === 'backups' && <BackupsTab />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'sysinfo' && <SysInfoTab />}
      {tab === 'docker' && <DockerTab />}
      {tab === 'cron' && <CronTab />}
      {tab === 'firewall' && <FirewallTab />}
      {tab === 'sensors' && <SensorsTab />}
      {tab === 'usb' && <UsbTab />}
      {tab === 'modules' && <ModulesTab />}
      {tab === 'mounts' && <MountsTab />}
      {tab === 'packages' && <PackagesTab />}
      {tab === 'timers' && <TimersTab />}
      {tab === 'env' && <EnvTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'connections' && <ConnectionsTab />}
      {tab === 'power' && <PowerTab />}
    </div>
  )
}

// ====== 1. Processes ======
function ProcessesTab() {
  const [procs, setProcs] = useState<any[]>([])
  const [sort, setSort] = useState('cpu')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const r = await api.get('/system/processes?sort=' + sort); setProcs(r.data) }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed to load processes') }
    setLoading(false)
  }, [sort])

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i) }, [load])

  const kill = async (pid: number) => {
    try { await api.post('/system/processes/' + pid + '/kill'); setToast({ type: 'success', message: 'Killed PID ' + pid }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to kill PID ' + pid }) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return procs
    const q = search.toLowerCase()
    return procs.filter(p => String(p.pid).includes(q) || (p.user || '').toLowerCase().includes(q) || (p.command || '').toLowerCase().includes(q))
  }, [procs, search])

  return (
    <ToolCard icon={Cpu} title="Process Monitor" description="Monitor and manage running processes. Sorted by CPU or memory usage." action={
      <div style={{ display: 'flex', gap: 4 }}>
        <button className={'btn btn-ghost btn-sm ' + (sort === 'cpu' ? 'btn-primary' : '')} onClick={() => setSort('cpu')}><ArrowUp size={12} /> CPU</button>
        <button className={'btn btn-ghost btn-sm ' + (sort === 'mem' ? 'btn-primary' : '')} onClick={() => setSort('mem')}><ArrowUp size={12} /> MEM</button>
      </div>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search by PID, user, or command..." value={search} onChange={e => setSearch(e.target.value)} style={{ height: 28, fontSize: 11, paddingLeft: 24, width: '100%' }} />
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={load} title="Refresh"><RefreshCw size={12} /></button>
      </div>
      <div style={{ fontSize: 11, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>PID</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>User</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>CPU%</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>MEM%</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Command</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 11 }}>{p.pid}</td>
                <td style={{ padding: '5px 8px', fontSize: 12 }}>{p.user}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{p.cpu}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{p.mem}</td>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.command}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => kill(p.pid)} title="Kill process" style={{ color: '#ef4444' }}><StopCircle size={11} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No processes found</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Showing {Math.min(filtered.length, 100)} of {filtered.length} processes (auto-refreshes every 5s)</div>
    </ToolCard>
  )
}

// ====== 2. Logs ======
function LogsTab() {
  const [logs, setLogs] = useState<Record<string, string[]>>({})
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [follow, setFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/system/logs').then(r => {
      setLogs(r.data)
      const keys = Object.keys(r.data)
      if (keys.length > 0 && !selected) setSelected(keys[0])
      setLoading(false)
    }).catch(e => { setError(e?.response?.data?.error || e.message || 'Failed to load logs'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!follow) return
    const interval = setInterval(async () => {
      try { const r = await api.get('/system/logs'); setLogs(r.data) } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [follow])

  useEffect(() => { if (follow) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs, follow])

  const filteredLogs = useMemo(() => {
    if (!selected || !logs[selected]) return []
    let lines = logs[selected]
    if (search.trim()) { const q = search.toLowerCase(); lines = lines.filter(l => l.toLowerCase().includes(q)) }
    if (levelFilter !== 'all') lines = lines.filter(l => l.toLowerCase().includes(levelFilter))
    return lines
  }, [logs, selected, search, levelFilter])

  return (
    <ToolCard icon={Terminal} title="Log Viewer" description="Browse system logs with search, level filtering, and real-time follow mode.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {loading ? <Skeleton lines={1} widths={['40%']} /> : Object.keys(logs).map(k => (
          <button key={k} className={'btn btn-ghost btn-sm ' + (selected === k ? 'btn-primary' : '')} onClick={() => setSelected(k)}>{k}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} style={{ height: 28, fontSize: 11, paddingLeft: 24, width: '100%' }} />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ height: 28, fontSize: 11, width: 'auto' }}>
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <button className={'btn btn-ghost btn-sm ' + (follow ? 'btn-primary' : '')} onClick={() => setFollow(!follow)}>
          {follow ? 'Following' : 'Follow'}
        </button>
      </div>
      <div className="glass-card" style={{ padding: 12, background: '#0a0a0a', fontFamily: 'monospace', fontSize: 11, maxHeight: 400, overflow: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No log entries found</div>
        ) : (
          filteredLogs.map((line, i) => (
            <div key={i} style={{ lineHeight: 1.5, color: line.toLowerCase().includes('error') ? '#ef4444' : line.toLowerCase().includes('warn') ? '#f59e0b' : 'var(--text-secondary)' }}>{line}</div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </ToolCard>
  )
}

// ====== 3. Disk Health ======
function DisksTab() {
  const [drives, setDrives] = useState<any[]>([])
  const [smart, setSmart] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/system/disk-health').catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); return { data: { drives: [], smart: [] } } }),
      api.get('/system/disk-usage').catch(() => ({ data: [] }))
    ]).then(([health, usageData]) => {
      setDrives(health.data.drives || [])
      setSmart(health.data.smart || [])
      setUsage(usageData.data)
      setLoading(false)
    })
  }, [])

  return (
    <ToolCard icon={Server} title="Disk Health Monitor" description="Monitor disk usage, health status, SMART attributes, and detected drives.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={6} /> : <>{(() => {
        const sections: React.ReactNode[] = []
        if (usage.length > 0) {
          sections.push(
            <div key="usage">
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Disk Usage</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {usage.map((u, i) => (
                  <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <HardDrive size={16} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{u.mounted_on}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.filesystem} - {u.size}</div>
                    </div>
                    <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: u.use_percent, height: '100%', background: parseInt(u.use_percent) > 85 ? '#ef4444' : 'var(--accent)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 40, textAlign: 'right' }}>{u.use_percent}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        if (smart.length > 0) {
          sections.push(
            <div key="smart">
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 8 }}>SMART Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {smart.map((s, i) => (
                  <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <Heart size={16} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><span style={{ fontFamily: 'monospace' }}>{s.device}</span></div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }}>
                      {s.temperature ? s.temperature + '°C' : ''}
                      {s.reallocated_sectors ? ' - ' + s.reallocated_sectors + ' realloc' : ''}
                    </span>
                    <span style={{ fontSize: 12, color: s.status === 'PASSED' ? '#22c55e' : '#ef4444' }}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        if (drives.length > 0) {
          sections.push(
            <div key="drives">
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 8 }}>Detected Drives</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {drives.map((d, i) => (
                  <div key={i} style={{ padding: 12, minWidth: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.model || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.size}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return sections
      })()}</>}
    </ToolCard>
  )
}

// ====== 4. Network ======
function NetworkTab() {
  const [host, setHost] = useState('')
  const [output, setOutput] = useState('')
  const [pinging, setPinging] = useState(false)
  const [mac, setMac] = useState('')
  const [wakeMsg, setWakeMsg] = useState('')
  const [interfaces, setInterfaces] = useState<any[]>([])
  const [bandwidth, setBandwidth] = useState<any>({})
  const [loadNet, setLoadNet] = useState(true)
  const [pingError, setPingError] = useState('')
  const [wakeError, setWakeError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/system/network/interfaces').catch(() => ({ data: [] })),
      api.get('/system/network/bandwidth').catch(() => ({ data: {} }))
    ]).then(([ifs, bw]) => { setInterfaces(ifs.data); setBandwidth(bw.data); setLoadNet(false) })
  }, [])

  const ping = async () => {
    if (!host.trim()) { setPingError('Enter a hostname or IP'); return }
    setPinging(true); setOutput(''); setPingError('')
    try { const r = await api.post('/system/ping', { host, count: 4 }); setOutput(r.data.output || r.data.error || 'No response') }
    catch (e: any) { setPingError(e?.response?.data?.error || e.message || 'Ping failed') }
    setPinging(false)
  }

  const wake = async () => {
    if (!mac.trim()) { setWakeError('Enter a MAC address'); return }
    setWakeError('')
    try { const r = await api.post('/system/wake', { mac }); setWakeMsg(r.data.message || r.data.error || 'Sent') }
    catch (e: any) { setWakeError(e?.response?.data?.error || e.message || 'Wake failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ToolCard icon={Activity} title="Ping" description="Ping a remote host to check connectivity." action={
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input placeholder="Hostname or IP" value={host} onChange={e => setHost(e.target.value)} style={{ height: 28, fontSize: 11, width: 160 }} onKeyDown={e => e.key === 'Enter' && ping()} />
          <button className="btn btn-primary btn-sm" onClick={ping} disabled={pinging}>{pinging ? '...' : 'Ping'}</button>
        </div>
      }>
        {pingError && <div style={{ fontSize: 12, color: '#ef4444' }}>{pingError}</div>}
        {output && <div style={{ padding: 10, background: '#0a0a0a', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{output}</div>}
      </ToolCard>
      <ToolCard icon={Wifi} title="Wake-on-LAN" description="Send a magic packet to wake a device on the LAN." action={
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input placeholder="MAC (AA:BB:CC:DD:EE:FF)" value={mac} onChange={e => setMac(e.target.value)} style={{ height: 28, fontSize: 11, width: 180 }} />
          <button className="btn btn-primary btn-sm" onClick={wake}>Wake</button>
        </div>
      }>
        {wakeError && <div style={{ fontSize: 12, color: '#ef4444' }}>{wakeError}</div>}
        {wakeMsg && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{wakeMsg}</div>}
      </ToolCard>
      <ToolCard icon={Globe} title="Network Interfaces" description="List all network interfaces with IP addresses and status.">
        {loadNet ? <Skeleton lines={3} /> : interfaces.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No interfaces found</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {interfaces.map((iface, i) => (
              <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: iface.operstate === 'up' ? '#22c55e' : '#ef4444' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{iface.ifname || iface.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{iface.ipv4 || iface.address || 'No IP'}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{iface.speed ? iface.speed + ' Mbps' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </ToolCard>
      <ToolCard icon={Activity} title="Bandwidth Usage" description="Current bandwidth usage across interfaces.">
        {loadNet ? <Skeleton lines={2} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <Download size={16} style={{ color: '#3b82f6' }} />
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginTop: 4 }}>{bandwidth.download || '0'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Download</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <Upload size={16} style={{ color: '#f59e0b' }} />
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginTop: 4 }}>{bandwidth.upload || '0'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Upload</div>
            </div>
          </div>
        )}
      </ToolCard>
    </div>
  )
}

// ====== 5. Backup Jobs ======
function BackupsTab() {
  const [jobs, setJobs] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [src, setSrc] = useState('')
  const [dst, setDst] = useState('')
  const [schedule, setSchedule] = useState('manual')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const r = await api.get('/system/backups'); setJobs(r.data) }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed to load backup jobs') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!name || !src || !dst) { setToast({ type: 'error', message: 'Fill in all fields' }); return }
    try {
      await api.post('/system/backups', { name, source_path: src, dest_path: dst, schedule })
      setToast({ type: 'success', message: 'Created backup job "' + name + '"' })
      setShowCreate(false); setName(''); setSrc(''); setDst('')
      load()
    } catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to create' }) }
  }

  const run = async (id: string) => {
    try { await api.post('/system/backups/' + id + '/run'); setToast({ type: 'success', message: 'Backup triggered' }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to run' }) }
  }

  const remove = async (id: string) => {
    try { await api.delete('/system/backups/' + id); setJobs(prev => prev.filter(j => j.id !== id)); setToast({ type: 'success', message: 'Backup job removed' }) }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to delete' }) }
  }

  return (
    <ToolCard icon={Database} title="Backup Jobs" description="Create, run, and manage scheduled backup jobs." action={
      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New Backup</button>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {showCreate && (
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
      {loading ? <Skeleton lines={4} /> : jobs.length === 0 ? (
        <div className="empty-state"><Database size={48} /><h3>No backup jobs</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {jobs.map(j => (
            <div key={j.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{j.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {j.source_path} {String.fromCharCode(8594)} {j.dest_path}
                  {j.schedule !== 'manual' ? ' - ' + j.schedule : ''}
                  {j.last_run ? ' - Last: ' + new Date(j.last_run).toLocaleString() : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: j.last_status === 'success' ? 'rgba(34,197,94,0.15)' : j.last_status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: j.last_status === 'success' ? '#22c55e' : j.last_status === 'failed' ? '#ef4444' : '#f59e0b' }}>{j.last_status || 'pending'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => run(j.id)} title="Run now"><Play size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(j.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 6. Services ======
function ServicesTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const r = await api.get('/system/services'); setData(r.data) }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (name: string, act: string) => {
    try { await api.post('/system/services/' + encodeURIComponent(name) + '/' + act); setToast({ type: 'success', message: act + ' ' + name }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to ' + act }) }
  }

  return (
    <ToolCard icon={Activity} title="Service Manager" description="List and manage systemd services - start, stop, restart, enable, disable." action={<button className="btn btn-ghost btn-icon btn-sm" onClick={load} title="Refresh"><RefreshCw size={14} /></button>}>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={6} /> : data.length === 0 ? (
        <div className="empty-state"><Activity size={48} /><h3>No services</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 500, overflow: 'auto' }}>
          {data.map((s, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.active_state === 'active' ? '#22c55e' : s.active_state === 'activating' ? '#f59e0b' : '#6b7280' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.description || s.load_state || ''}</div>
              </div>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: s.active_state === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: s.active_state === 'active' ? '#22c55e' : '#9ca3af' }}>{s.active_state}</span>
              {s.active_state === 'active' ? (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(s.name, 'stop')} title="Stop"><StopCircle size={12} style={{ color: '#ef4444' }} /></button>
              ) : (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(s.name, 'start')} title="Start"><Play size={12} style={{ color: '#22c55e' }} /></button>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(s.name, 'restart')} title="Restart"><RefreshCw size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 7. System Info ======
function SysInfoTab() {
  const [info, setInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/info').then(r => { setInfo(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  const fields = [
    { label: 'Hostname', value: info.hostname, icon: Monitor },
    { label: 'Kernel', value: info.kernel, icon: Cpu },
    { label: 'OS', value: info.os, icon: Monitor },
    { label: 'Uptime', value: info.uptime, icon: Clock },
    { label: 'CPU Model', value: info.cpu_model, icon: Cpu },
    { label: 'CPU Cores', value: info.cpu_cores, icon: Cpu },
    { label: 'Total Memory', value: info.memory_total, icon: Server },
    { label: 'Used Memory', value: info.memory_used, icon: Server },
    { label: 'Memory %', value: info.memory_percent, icon: Activity },
  ]

  return (
    <ToolCard icon={Monitor} title="System Information" description="Kernel version, hostname, uptime, CPU model, memory, and OS details." action={<button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setLoading(true); api.get('/system/info').then(r => { setInfo(r.data); setLoading(false) }).catch(() => setLoading(false)) }} title="Refresh"><RefreshCw size={14} /></button>}>
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={9} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}>
          {fields.map(f => (
            <div key={f.label} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <f.icon size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{f.value || 'Unknown'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 8. Docker ======
function DockerTab() {
  const [containers, setContainers] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [view, setView] = useState('containers')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [c, i] = await Promise.all([
        api.get('/system/docker/containers').catch(() => ({ data: [] })),
        api.get('/system/docker/images').catch(() => ({ data: [] }))
      ])
      setContainers(c.data); setImages(i.data)
    } catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (id: string, act: string) => {
    try { await api.post('/system/docker/containers/' + id + '/' + act); setToast({ type: 'success', message: act + ' ' + id.slice(0, 12) }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to ' + act }) }
  }

  return (
    <ToolCard icon={Container} title="Docker Manager" description="List containers and images, start/stop/restart containers." action={
      <div style={{ display: 'flex', gap: 4 }}>
        <button className={'btn btn-ghost btn-sm ' + (view === 'containers' ? 'btn-primary' : '')} onClick={() => setView('containers')}><Container size={12} /> Containers</button>
        <button className={'btn btn-ghost btn-sm ' + (view === 'images' ? 'btn-primary' : '')} onClick={() => setView('images')}><Box size={12} /> Images</button>
      </div>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={6} /> : view === 'containers' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 500, overflow: 'auto' }}>
          {containers.map((c, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.status?.includes('Up') ? '#22c55e' : '#ef4444' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.names?.[0] || c.name || c.id?.slice(0, 12)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.image} {c.ports?.length ? '- ' + c.ports.join(', ') : ''}</div>
              </div>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: c.status?.includes('Up') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: c.status?.includes('Up') ? '#22c55e' : '#ef4444' }}>{c.status || 'unknown'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(c.id || c.Id, 'start')} title="Start"><Play size={12} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(c.id || c.Id, 'stop')} title="Stop"><StopCircle size={12} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => action(c.id || c.Id, 'restart')} title="Restart"><RefreshCw size={12} /></button>
            </div>
          ))}
          {containers.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 12 }}>No containers</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 500, overflow: 'auto' }}>
          {images.map((img, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <Box size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{img.repo_tags?.[0] || img.id?.slice(0, 19) || 'Unknown'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{img.size || ''} {img.created ? '- ' + new Date(img.created).toLocaleDateString() : ''}</div>
              </div>
            </div>
          ))}
          {images.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 12 }}>No images</div>}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 9. Cron Jobs ======
function CronTab() {
  const [jobs, setJobs] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [expr, setExpr] = useState('')
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const r = await api.get('/system/cron'); setJobs(r.data) }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!expr.trim() || !command.trim()) { setToast({ type: 'error', message: 'Fill in both fields' }); return }
    try {
      await api.post('/system/cron', { expression: expr, command })
      setToast({ type: 'success', message: 'Cron job added' })
      setShowAdd(false); setExpr(''); setCommand(''); load()
    } catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to add' }) }
  }

  const remove = async (id: string) => {
    try { await api.delete('/system/cron/' + id); setToast({ type: 'success', message: 'Cron job removed' }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to delete' }) }
  }

  return (
    <ToolCard icon={Clock} title="Cron Jobs" description="Manage scheduled cron jobs - add, edit, and remove tasks." action={
      <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Cron</button>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {showAdd && (
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="Cron expression (e.g. 0 2 * * *)" value={expr} onChange={e => setExpr(e.target.value)} style={{ height: 32, fontSize: 12 }} />
          <input placeholder="Command to run" value={command} onChange={e => setCommand(e.target.value)} style={{ height: 32, fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={add}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <Skeleton lines={4} /> : jobs.length === 0 ? (
        <div className="empty-state"><Clock size={48} /><h3>No cron jobs</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {jobs.map((j, i) => (
            <div key={j.id || i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <Clock size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{j.expression}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.command}</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(j.id)} style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 10. Firewall ======
function FirewallTab() {
  const [status, setStatus] = useState<any>({})
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [enabled, setEnabled] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [s, r] = await Promise.all([
        api.get('/system/firewall/status').catch(() => ({ data: {} })),
        api.get('/system/firewall/rules').catch(() => ({ data: [] }))
      ])
      setStatus(s.data); setRules(r.data); setEnabled(s.data.active || false)
    } catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async () => {
    try {
      const act = enabled ? 'disable' : 'enable'
      await api.post('/system/firewall/' + act)
      setToast({ type: 'success', message: 'Firewall ' + act + 'd' }); setEnabled(!enabled)
    } catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed' }) }
  }

  return (
    <ToolCard icon={Shield} title="Firewall" description="UFW/iptables status, rules list, and enable/disable control." action={
      <button className={'btn btn-sm ' + (enabled ? 'btn-ghost' : 'btn-primary')} onClick={toggle}>{enabled ? 'Disable' : 'Enable'}</button>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={4} /> : <React.Fragment>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={16} style={{ color: enabled ? '#22c55e' : '#ef4444' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Firewall is {enabled ? 'Active' : 'Inactive'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{status.backend || 'ufw'} - {rules.length} rules</div>
          </div>
        </div>
        {rules.length > 0 && (
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Rules</h4>
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {rules.map((rule, i) => (
                <div key={i} style={{ padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', borderRadius: 4, marginBottom: 2 }}>
                  {rule.action} {rule.protocol} {rule.port ? 'port ' + rule.port : ''} {rule.from ? 'from ' + rule.from : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </React.Fragment>}
    </ToolCard>
  )
}

// ====== 11. Sensors ======
function SensorsTab() {
  const [sensors, setSensors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/sensors').then(r => { setSensors(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  const tempSensors = sensors.filter(s => s.type === 'temperature' || (s.label || s.name || '').toLowerCase().includes('temp'))
  const fanSensors = sensors.filter(s => s.type === 'fan' || (s.label || s.name || '').toLowerCase().includes('fan'))
  const voltSensors = sensors.filter(s => s.type === 'voltage' || (s.label || s.name || '').toLowerCase().includes('volt'))

  return (
    <ToolCard icon={Thermometer} title="Hardware Sensors" description="Monitor temperature, fan speed, and voltage sensors.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={6} /> : sensors.length === 0 ? (
        <div className="empty-state"><Thermometer size={48} /><h3>No sensors detected</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tempSensors.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Thermometer size={14} /> Temperatures
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {tempSensors.map((s, i) => (
                  <div key={i} style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}°C</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label || s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {fanSensors.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} /> Fan Speeds
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {fanSensors.map((s, i) => (
                  <div key={i} style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{s.value} RPM</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label || s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {voltSensors.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Power size={14} /> Voltages
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {voltSensors.map((s, i) => (
                  <div key={i} style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}V</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label || s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 12. USB Devices ======
function UsbTab() {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/usb').then(r => { setDevices(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={Cable} title="USB Devices" description="List all connected USB devices.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={4} /> : devices.length === 0 ? (
        <div className="empty-state"><Cable size={48} /><h3>No USB devices</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {devices.map((d, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <Cable size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{d.product || d.name || 'Unknown'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.manufacturer || ''} {d.bus ? 'Bus ' + d.bus : ''} {d.vendor_id ? d.vendor_id + ':' + d.product_id : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 13. Kernel Modules ======
function ModulesTab() {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/kernel-modules').then(r => { setModules(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={Layers} title="Kernel Modules" description="List all currently loaded kernel modules.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={6} /> : modules.length === 0 ? (
        <div className="empty-state"><Layers size={48} /><h3>No modules</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflow: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
          {modules.map((m, i) => (
            <div key={i} style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 10, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: 4 }}>
              <span style={{ flex: 1 }}>{m.name || m.module}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{m.size || m.used_by ? (m.size || '') + (m.used_by ? ' - ' + m.used_by : '') : ''}</span>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 14. Mount Points ======
function MountsTab() {
  const [mounts, setMounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/mounts').then(r => { setMounts(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={HardDrive} title="Mount Points" description="All mounted filesystems with usage and mount options.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={5} /> : mounts.length === 0 ? (
        <div className="empty-state"><HardDrive size={48} /><h3>No mount points</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mounts.map((m, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <HardDrive size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{m.mountpoint || m.mounted_on}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.filesystem || m.device} - {m.fstype || ''} {m.options ? '(' + m.options + ')' : ''}</div>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{m.size || m.total ? (m.used || m.used_size) + '/' + (m.size || m.total) : ''}</span>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 15. Package Manager ======
function PackagesTab() {
  const [updates, setUpdates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const r = await api.get('/system/packages/updates'); setUpdates(r.data) }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const runUpdate = async () => {
    setUpdating(true)
    try { await api.post('/system/packages/update'); setToast({ type: 'success', message: 'Update started' }); load() }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed' }) }
    setUpdating(false)
  }

  return (
    <ToolCard icon={Package} title="Package Manager" description="Check for available system updates and trigger upgrades." action={
      <button className="btn btn-primary btn-sm" onClick={runUpdate} disabled={updating}>{updating ? 'Updating...' : 'Update All'}</button>
    }>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={4} /> : <React.Fragment>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{updates.length} updates available</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last checked: just now</div>
          </div>
        </div>
        {updates.length > 0 && (
          <div style={{ maxHeight: 300, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {updates.map((pkg, i) => (
              <div key={i} style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                <span style={{ flex: 1, fontFamily: 'monospace' }}>{pkg.name || pkg.package}</span>
                <span style={{ color: 'var(--text-muted)' }}>{(pkg.current_version || pkg.installed) + ' -> ' + (pkg.new_version || pkg.available)}</span>
              </div>
            ))}
          </div>
        )}
      </React.Fragment>}
    </ToolCard>
  )
}

// ====== 16. Scheduled Tasks (Timers) ======
function TimersTab() {
  const [timers, setTimers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/timers').then(r => { setTimers(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={Calendar} title="Systemd Timers" description="List scheduled systemd timers with next run and last trigger.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={5} /> : timers.length === 0 ? (
        <div className="empty-state"><Calendar size={48} /><h3>No timers</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {timers.map((t, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <Calendar size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{t.name || t.unit}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {t.next ? 'Next: ' + new Date(t.next).toLocaleString() : ''}
                  {t.last ? ' - Last: ' + new Date(t.last).toLocaleString() : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: t.active === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: t.active === 'active' ? '#22c55e' : '#9ca3af' }}>{t.active || t.state || 'inactive'}</span>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 17. Environment ======
function EnvTab() {
  const [env, setEnv] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/system/env').then(r => { setEnv(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  const entries = useMemo(() => {
    let arr = Object.entries(env)
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q))
    }
    if (!showAll) arr = arr.slice(0, 30)
    return arr
  }, [env, search, showAll])

  return (
    <ToolCard icon={List} title="Environment Variables" description="View all system environment variables.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={8} /> : <React.Fragment>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Search variables..." value={search} onChange={e => setSearch(e.target.value)} style={{ height: 28, fontSize: 11, paddingLeft: 24, width: '100%' }} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show Less' : 'Show All (' + Object.keys(env).length + ')'}</button>
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 200, color: 'var(--accent)' }}>{k}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>
      </React.Fragment>}
    </ToolCard>
  )
}

// ====== 18. User Sessions ======
function SessionsTab() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/users/sessions').then(r => { setSessions(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={Users} title="User Sessions" description="Who is logged in and recent login history.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={4} /> : sessions.length === 0 ? (
        <div className="empty-state"><Users size={48} /><h3>No sessions</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessions.map((s, i) => (
            <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <Users size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.user || s.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {s.host || s.from || ''} {s.type ? '- ' + s.type : ''}
                  {s.login_time ? '- ' + new Date(s.login_time).toLocaleString() : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: s.active ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: s.active ? '#22c55e' : '#9ca3af' }}>{s.active ? 'active' : 'ended'}</span>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  )
}

// ====== 19. Network Connections ======
function ConnectionsTab() {
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/system/network/connections').then(r => { setConnections(r.data); setLoading(false) })
      .catch(e => { setError(e?.response?.data?.error || e.message || 'Failed'); setLoading(false) })
  }, [])

  return (
    <ToolCard icon={Globe} title="Active Connections" description="All active network connections (TCP/UDP) using ss or netstat.">
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={8} /> : connections.length === 0 ? (
        <div className="empty-state"><Globe size={48} /><h3>No connections</h3></div>
      ) : (
        <div style={{ fontSize: 11, overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Proto</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Local</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Remote</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>State</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace' }}>{c.proto || c.protocol}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace' }}>{c.local_address || c.local}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace' }}>{c.remote_address || c.remote}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: c.state === 'ESTAB' || c.state === 'established' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: c.state === 'ESTAB' || c.state === 'established' ? '#22c55e' : '#9ca3af' }}>{c.state || 'unknown'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ToolCard>
  )
}

// ====== 20. Power Management ======
function PowerTab() {
  const [battery, setBattery] = useState<any>(null)
  const [profile, setProfile] = useState('balanced')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [b, p] = await Promise.all([
        api.get('/system/power/battery').catch(() => ({ data: null })),
        api.get('/system/power/profile').catch(() => ({ data: { profile: 'balanced' } }))
      ])
      setBattery(b.data); setProfile(p.data.profile || 'balanced')
    } catch (e: any) { setError(e?.response?.data?.error || e.message || 'Failed') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setPowerProfile = async (p: string) => {
    try { await api.post('/system/power/profile', { profile: p }); setProfile(p); setToast({ type: 'success', message: 'Profile set to ' + p }) }
    catch (e: any) { setToast({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed' }) }
  }

  const profiles = ['balanced', 'performance', 'powersave']

  return (
    <ToolCard icon={Power} title="Power Management" description="Battery status and power profile selection." action={<button className="btn btn-ghost btn-icon btn-sm" onClick={load} title="Refresh"><RefreshCw size={14} /></button>}>
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
      {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 0' }}>{error}</div>}
      {loading ? <Skeleton lines={5} /> : <React.Fragment>
        {battery && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Power size={20} style={{ color: battery.percentage > 20 ? '#22c55e' : '#ef4444' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{battery.percentage}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{battery.status || 'Unknown'} {battery.time_remaining ? '- ' + battery.time_remaining + ' remaining' : ''}</div>
            </div>
            <div style={{ width: 80, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: battery.percentage + '%', height: '100%', background: battery.percentage > 20 ? '#22c55e' : '#ef4444', borderRadius: 4 }} />
            </div>
          </div>
        )}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Power Profile</h4>
          <div style={{ display: 'flex', gap: 6 }}>
            {profiles.map(p => (
              <button key={p} className={'btn btn-sm ' + (profile === p ? 'btn-primary' : 'btn-ghost')} onClick={() => setPowerProfile(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {!battery && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No battery detected (desktop system)</div>}
      </React.Fragment>}
    </ToolCard>
  )
}
