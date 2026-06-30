import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Shield, Users, Activity, RefreshCw, Power, PowerOff,
  Loader, AlertCircle, Check, Info, X, Server, Clock,
  Globe, Zap, Trash2, UserPlus, Edit3, AlertTriangle,
  FileText, Search
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'

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

export default function AdminPage() {
  const { user } = useAuth()
  const [sysInfo, setSysInfo] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })
  const [logs, setLogs] = useState<any[]>([])
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sys, usr, upd, logRes] = await Promise.all([
        api.get('/system/status'),
        api.get('/users/'),
        api.get('/system/update/check'),
        api.get('/audit/logs')
      ])
      setSysInfo(sys.data)
      setUsers(usr.data)
      setUpdateInfo(upd.data)
      setMaintenanceMode(sys.data.maintenance || false)
      const logData = logRes.data
      setLogs(Array.isArray(logData) ? logData.slice(-10) : logData.logs?.slice(-10) || [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load admin data')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const restart = async () => {
    try {
      await api.post('/system/restart')
      addToast('Restarting server...', 'info')
    } catch { addToast('Failed to restart', 'error') }
  }

  const shutdown = async () => {
    try {
      await api.post('/system/shutdown')
      addToast('Shutting down...', 'warning')
    } catch { addToast('Failed to shutdown', 'error') }
  }

  const toggleMaintenance = async () => {
    try {
      await api.post('/system/maintenance', { enabled: !maintenanceMode })
      setMaintenanceMode(!maintenanceMode)
      addToast(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`, 'success')
    } catch { addToast('Failed to toggle maintenance mode', 'error') }
  }

  const addUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return
    try {
      await api.post('/auth/register', { username: newUsername, password: newPassword })
      addToast('User created', 'success')
      setNewUsername(''); setNewPassword(''); setNewRole('user'); setShowAddUser(false)
      load()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create user', 'error')
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      addToast('User deleted', 'success')
    } catch { addToast('Failed to delete user', 'error') }
  }

  const changeUserRole = async (userId: string, role: string) => {
    try {
      await api.put(`/users/${userId}/role`, { role })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      addToast('User role updated', 'success')
    } catch { addToast('Failed to update role', 'error') }
  }

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ open: true, title, message, onConfirm })
  }

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users
    const q = userSearch.toLowerCase()
    return users.filter(u => u.username.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)))
  }, [users, userSearch])

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading admin panel...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={18} /> Admin Panel
      </h3>

      {/* System Overview */}
      {sysInfo && (
        <div className="liquid-glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={16} style={{ color: 'var(--accent)' }} /> System Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hostname</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{sysInfo.hostname}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{sysInfo.version}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPU</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{sysInfo.cpu?.percent}%</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Memory</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{sysInfo.memory?.percent}%</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uptime</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{sysInfo.uptime}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{sysInfo.platform}</div>
            </div>
          </div>
        </div>
      )}

      {/* Update Check */}
      {updateInfo && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Globe size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, flex: 1 }}>
            Version <strong>{updateInfo.current}</strong>
            {updateInfo.update_available && (
              <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                — Update available: <strong>{updateInfo.latest}</strong>
              </span>
            )}
            {!updateInfo.update_available && (
              <span style={{ color: 'var(--success)', marginLeft: 8 }}>— Up to date</span>
            )}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Check</button>
        </div>
      )}

      {/* Server Controls */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={16} style={{ color: 'var(--accent)' }} /> Server Controls
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={restart}>
            <RefreshCw size={14} /> Restart
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => showConfirm('Shutdown Server', 'Are you sure you want to shut down the server?', shutdown)}>
            <PowerOff size={14} /> Shutdown
          </button>
          <button className={`btn btn-sm ${maintenanceMode ? 'btn-warning' : 'btn-ghost'}`} onClick={toggleMaintenance}>
            <Zap size={14} /> Maintenance: {maintenanceMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* User Management */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Users size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Users ({users.length})</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(!showAddUser)}>
            <UserPlus size={14} /> Add User
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }} />
        </div>

        {showAddUser && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: 'var(--glass-bg)', borderRadius: 8 }}>
            <input placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ flex: 1, height: 32, fontSize: 12 }} />
            <input placeholder="Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ flex: 1, height: 32, fontSize: 12 }} />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: 'auto', height: 32, fontSize: 12 }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={addUser} style={{ height: 32 }}>Create</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddUser(false)} style={{ height: 32 }}>Cancel</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredUsers.map(u => (
            <div key={u.id} className="glass-card" style={{
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--glass-bg)'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: u.role === 'admin' ? 'var(--accent-dim)' : 'var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700, flexShrink: 0
              }}>
                {u.username[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email || 'No email'}</div>
              </div>
              <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value)} style={{
                width: 'auto', height: 28, fontSize: 10, padding: '0 6px',
                background: u.role === 'admin' ? 'var(--accent-dim)' : 'var(--glass-border)',
                color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer'
              }}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              {u.id !== user?.id && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => showConfirm('Delete User', `Are you sure you want to delete user "${u.username}"?`, () => deleteUser(u.id))} title="Delete" style={{ color: 'var(--danger)' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && userSearch && (
            <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>No users match your search</div>
          )}
        </div>
      </div>

      {/* System Logs */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} style={{ color: 'var(--accent)' }} /> System Logs (Last 10)
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No logs available</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflow: 'auto' }}>
            {logs.map((log, idx) => (
              <div key={log.id || idx} style={{
                padding: '6px 10px', borderRadius: 6, background: 'var(--glass-bg)',
                fontSize: 11, fontFamily: 'monospace', display: 'flex', gap: 8
              }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : log.time || ''}
                </span>
                <span style={{
                  color: log.level === 'error' || log.level === 'critical' ? 'var(--danger)' :
                         log.level === 'warn' || log.level === 'warning' ? 'var(--warning)' :
                         'var(--text-secondary)',
                  flexShrink: 0
                }}>[{log.level || 'info'}]</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{log.message || log.action || ''}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>

      <ConfirmDialog open={confirmAction.open} title={confirmAction.title} message={confirmAction.message} onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(prev => ({ ...prev, open: false })) }} onCancel={() => setConfirmAction(prev => ({ ...prev, open: false }))} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
