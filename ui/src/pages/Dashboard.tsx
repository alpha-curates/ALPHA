import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cpu, HardDrive, Thermometer, Activity,
  Monitor, Database, Wifi, Clock, Brain,
  ExternalLink, Star, History, File,
  TrendingUp, ArrowUp, ArrowDown
} from 'lucide-react'
import api from '../utils/api'
import { SystemStatus, StorageInfo, Device, MetricPoint } from '../types'
import PopupModal from '../components/common/PopupModal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const [sys, setSys] = useState<SystemStatus | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [favFiles, setFavFiles] = useState<any[]>([])
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [metricRange, setMetricRange] = useState('1h')

  useEffect(() => {
    const load = async () => {
      try {
        const [sysRes, stoRes, devRes, aiRes, recentRes, favRes, metRes] = await Promise.all([
          api.get('/system/status'),
          api.get('/storage/status'),
          api.get('/devices/'),
          api.get('/ai/status'),
          api.get('/recent'),
          api.get('/favorites'),
          api.get(`/monitor/history?range=${metricRange}`)
        ])
        setSys(sysRes.data)
        setStorage(stoRes.data)
        setDevices(devRes.data)
        setAiStatus(aiRes.data)
        setRecentFiles(recentRes.data?.slice(0, 6) || [])
        setFavFiles(favRes.data || [])
        setMetrics(metRes.data || [])
      } catch {}
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [metricRange])

  const formatBytes = (b: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${size.toFixed(1)} ${units[i]}`
  }

  return (
    <>
      <PopupModal />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* AI Setup Banner */}
      {aiStatus && !aiStatus.ollama && (
        <div className="glass-card" style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          borderLeft: '3px solid var(--accent)',
          background: 'linear-gradient(135deg, rgba(108,92,231,0.08), rgba(108,92,231,0.02))'
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Resume AI Setup</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Ollama is not connected. Install Ollama to enable local AI chat, file analysis, and system assistant.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/ai')}>
            <ExternalLink size={14} /> Open AI Studio
          </button>
        </div>
      )}

      <div className="grid-4">
        <div className="glass-card stat-card">
          <div className="stat-label"><Cpu size={14} style={{ display: 'inline', marginRight: 4 }} />CPU</div>
          <div className="stat-value">{sys?.cpu.percent ?? '-'}%</div>
          <div className="stat-sub">{sys?.cpu.cores ?? '-'} cores</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label"><Database size={14} style={{ display: 'inline', marginRight: 4 }} />Memory</div>
          <div className="stat-value">{sys?.memory.percent ?? '-'}%</div>
          <div className="stat-sub">{sys?.memory.used ? formatBytes(sys.memory.used) : '-'} used</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label"><Thermometer size={14} style={{ display: 'inline', marginRight: 4 }} />Temperature</div>
          <div className="stat-value">{sys?.temperature ?? '-'}°C</div>
          <div className="stat-sub">{sys?.hostname ?? '-'}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label"><Activity size={14} style={{ display: 'inline', marginRight: 4 }} />Uptime</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{sys?.uptime ?? '-'}</div>
          <div className="stat-sub">{sys?.platform ?? ''}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={18} /> Storage
          </h3>
          {storage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                <span>{formatBytes(storage.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Used</span>
                <span>{formatBytes(storage.used)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Free</span>
                <span>{formatBytes(storage.free)}</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${storage.percent}%`, height: '100%', background: storage.percent > 85 ? 'var(--danger)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={18} /> Connected Devices
          </h3>
          {devices.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <Wifi size={32} />
              <h3>No devices found</h3>
              <p style={{ fontSize: 13 }}>Scan your network to discover devices</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {devices.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip}</div>
                  </div>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: d.status === 'online' || d.status === 'approved' ? 'var(--success)' : 'var(--text-muted)'
                  }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(recentFiles.length > 0 || favFiles.length > 0) && (
        <div className="grid-2" style={{ gap: 12 }}>
          {recentFiles.length > 0 && (
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <History size={16} /> Recent Files
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentFiles.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                    onClick={() => navigate('/storage')}>
                    <File size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(r.accessed_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {favFiles.length > 0 && (
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={16} /> Favorites
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {favFiles.slice(0, 6).map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                    onClick={() => navigate('/storage')}>
                    <Star size={12} fill="var(--warning)" style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monitoring Charts */}
      <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} /> Live Metrics
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['1h', '6h', '24h', '7d'].map(r => (
                <button key={r} className={`btn btn-ghost btn-sm ${metricRange === r ? 'active' : ''}`}
                  onClick={() => setMetricRange(r)}
                  style={{ padding: '2px 8px', fontSize: 11, background: metricRange === r ? 'var(--accent-dim)' : 'transparent' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {metrics.length > 1 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>CPU / Memory / Disk</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="cpu" stroke="#6C5CE7" strokeWidth={2} dot={false} name="CPU" />
                  <Line type="monotone" dataKey="memory" stroke="#00B894" strokeWidth={2} dot={false} name="Memory" />
                  <Line type="monotone" dataKey="disk" stroke="#FDCB6E" strokeWidth={2} dot={false} name="Disk" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Network I/O (bytes/s)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="net_recv" stroke="#00B894" strokeWidth={2} dot={false} name="Download" />
                  <Line type="monotone" dataKey="net_sent" stroke="#6C5CE7" strokeWidth={2} dot={false} name="Upload" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <TrendingUp size={32} />
            <h3>Collecting data...</h3>
            <p style={{ fontSize: 13 }}>Metrics will appear after the first collection cycle (up to 60s)</p>
          </div>
          )}
        </div>

      {/* System Info */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} /> System Info
        </h3>
        {sys && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              ['Hostname', sys.hostname],
              ['Platform', sys.platform],
              ['Python', sys.python],
              ['Time', new Date(sys.time).toLocaleString()]
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
