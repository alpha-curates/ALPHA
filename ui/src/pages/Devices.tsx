import React, { useEffect, useState } from 'react'
import {
  Monitor, Wifi, RefreshCw, Check, X, Search,
  Trash2, Edit3, Smartphone, Radio, Cpu, Plus,
  Lightbulb, Thermometer, Lock, Camera, Speaker,
  Fan, Tv, Disc, Plug, Wind, Droplets, Sun, Sword
} from 'lucide-react'
import api from '../utils/api'
import { Device } from '../types'

const DEVICE_TYPES = [
  { id: 'server', label: 'Server', icon: Cpu },
  { id: 'raspberry-pi', label: 'Raspberry Pi', icon: Cpu },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'laptop', label: 'Laptop', icon: Monitor },
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'tablet', label: 'Tablet', icon: Smartphone },
  { id: 'esp32', label: 'ESP32/ESP8266', icon: Radio },
  { id: 'arduino', label: 'Arduino', icon: Radio },
  { id: 'light', label: 'Light', icon: Lightbulb },
  { id: 'switch', label: 'Switch', icon: Plug },
  { id: 'sensor', label: 'Sensor', icon: Thermometer },
  { id: 'motion-sensor', label: 'Motion Sensor', icon: Wind },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'thermostat', label: 'Thermostat', icon: Thermometer },
  { id: 'media-player', label: 'Media Player', icon: Speaker },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'speaker', label: 'Speaker', icon: Speaker },
  { id: 'fan', label: 'Fan', icon: Fan },
  { id: 'vacuum', label: 'Vacuum', icon: Disc },
  { id: 'climate', label: 'Climate', icon: Sun },
  { id: 'humidifier', label: 'Humidifier', icon: Droplets },
  { id: 'cover', label: 'Cover/Blind', icon: Sword },
  { id: 'printer', label: 'Printer', icon: Monitor },
  { id: 'nas', label: 'NAS', icon: Monitor },
  { id: 'router', label: 'Router', icon: Wifi },
  { id: 'network', label: 'Network Device', icon: Radio },
  { id: 'unknown', label: 'Unknown', icon: Monitor },
]

const typeIconMap: Record<string, React.ReactNode> = {}
DEVICE_TYPES.forEach(t => {
  typeIconMap[t.id] = <t.icon size={16} />
})

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [pending, setPending] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newDevice, setNewDevice] = useState({ name: '', ip: '', mac: '', type: 'unknown' })
  const [typeFilter, setTypeFilter] = useState('all')

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        api.get('/devices/'),
        api.get('/devices/pending')
      ])
      setDevices(d.data)
      setPending(p.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const scan = async () => {
    setLoading(true)
    await api.post('/devices/scan')
    await load()
  }

  const addDevice = async () => {
    if (!newDevice.name.trim()) return
    try {
      await api.post('/devices/add', newDevice)
      setShowAdd(false)
      setNewDevice({ name: '', ip: '', mac: '', type: 'unknown' })
      await load()
    } catch {}
  }

  const approve = async (id: string) => {
    await api.post(`/devices/${id}/approve`)
    await load()
  }

  const deny = async (id: string) => {
    await api.post(`/devices/${id}/deny`)
    await load()
  }

  const remove = async (id: string) => {
    await api.delete(`/devices/${id}`)
    await load()
  }

  const rename = async (id: string) => {
    if (!editName.trim()) return
    await api.put(`/devices/${id}/rename`, { name: editName.trim() })
    setEditingId(null)
    await load()
  }

  const filtered = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || d.type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeLabel = (typeId: string) => DEVICE_TYPES.find(t => t.id === typeId)?.label || typeId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pending Approval */}
      {pending.length > 0 && (
        <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--warning)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={16} style={{ color: 'var(--warning)' }} />
            Pending Approval ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--warning-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                  {typeIconMap[d.type] || <Monitor size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip} · {getTypeLabel(d.type)}</div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => approve(d.id)}><Check size={14} /> Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => deny(d.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ paddingLeft: 32, height: 34, fontSize: 13 }} placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ width: 'auto', height: 34, fontSize: 12, padding: '0 10px' }}>
          <option value="all">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={scan} style={{ height: 34 }}>
          <RefreshCw size={14} /> Scan
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)} style={{ height: 34 }}>
          <Plus size={14} /> Add Device
        </button>
      </div>

      {/* Add Device Form */}
      {showAdd && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Add New Device</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
            <input placeholder="Device name" value={newDevice.name}
              onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))}
              style={{ height: 34, fontSize: 13 }} />
            <input placeholder="IP address (optional)" value={newDevice.ip}
              onChange={e => setNewDevice(p => ({ ...p, ip: e.target.value }))}
              style={{ height: 34, fontSize: 13 }} />
            <select value={newDevice.type} onChange={e => setNewDevice(p => ({ ...p, type: e.target.value }))}
              style={{ height: 34, fontSize: 12 }}>
              {DEVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={addDevice} style={{ height: 34 }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ alignSelf: 'flex-end' }}>Cancel</button>
        </div>
      )}

      {/* Stats bar */}
      {!loading && devices.length > 0 && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{devices.length} total</span>
          <span>·</span>
          <span style={{ color: 'var(--success)' }}>{devices.filter(d => d.status === 'approved' || d.status === 'online').length} online</span>
          <span>·</span>
          <span style={{ color: 'var(--warning)' }}>{devices.filter(d => d.status === 'pending').length} pending</span>
        </div>
      )}

      {/* Device List */}
      {loading ? (
        <div className="empty-state"><RefreshCw size={32} /><h3>Scanning...</h3></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Wifi size={48} />
          <h3>{search || typeFilter !== 'all' ? 'No matching devices' : 'No devices found'}</h3>
          <p style={{ fontSize: 13 }}>
            {search || typeFilter !== 'all'
              ? 'Try a different search or filter'
              : 'Scan your network or manually add a device'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
          {filtered.map(d => {
            const typeInfo = DEVICE_TYPES.find(t => t.id === d.type)
            const TypeIcon = typeInfo?.icon || Monitor
            return (
              <div key={d.id} className="glass-card" style={{
                padding: 16, display: 'flex', alignItems: 'center', gap: 12,
                borderLeft: d.status === 'approved' ? '3px solid var(--success)' :
                           d.status === 'pending' ? '3px solid var(--warning)' :
                           '3px solid transparent'
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: d.status === 'approved' ? 'rgba(0,214,143,0.1)' :
                              d.status === 'pending' ? 'rgba(255,170,0,0.1)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: d.status === 'approved' ? 'var(--success)' :
                         d.status === 'pending' ? 'var(--warning)' : 'var(--text-muted)'
                }}>
                  <TypeIcon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === d.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && rename(d.id)}
                        style={{ height: 28, fontSize: 13 }} autoFocus />
                      <button className="btn btn-primary btn-sm" onClick={() => rename(d.id)} style={{ height: 28, padding: '0 8px', fontSize: 11 }}>Save</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>{d.ip || 'No IP'}</span>
                    <span>·</span>
                    <span>{getTypeLabel(d.type)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%',
                    background: d.status === 'approved' || d.status === 'online' ? 'var(--success)' :
                                d.status === 'pending' ? 'var(--warning)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingId(d.id); setEditName(d.name) }} title="Rename">
                    <Edit3 size={12} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(d.id)} title="Remove" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
