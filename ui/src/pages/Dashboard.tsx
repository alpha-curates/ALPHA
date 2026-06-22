import React, { useEffect, useState } from 'react'
import {
  Cpu, HardDrive, Thermometer, Activity,
  Monitor, Database, Wifi, Clock
} from 'lucide-react'
import api from '../utils/api'
import { SystemStatus, StorageInfo, Device } from '../types'

export default function Dashboard() {
  const [sys, setSys] = useState<SystemStatus | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [sysRes, stoRes, devRes] = await Promise.all([
          api.get('/system/status'),
          api.get('/storage/status'),
          api.get('/devices/')
        ])
        setSys(sysRes.data)
        setStorage(stoRes.data)
        setDevices(devRes.data)
      } catch {}
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (b: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${size.toFixed(1)} ${units[i]}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
  )
}
