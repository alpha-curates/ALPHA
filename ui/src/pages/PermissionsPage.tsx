import React, { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck, User, Check, X, Loader, AlertCircle,
  Info, Save, Eye, Edit3, Trash2, Lock, Settings,
  AlertTriangle, Search
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../hooks/useAuth'

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

function toastStyle(t: ToastData['type']) {
  return {
    padding: '10px 14px', borderRadius: 10,
    background: t === 'error' ? 'var(--danger-dim)' : t === 'success' ? 'var(--success-dim)' : t === 'warning' ? 'var(--warning-dim)' : 'var(--info-dim)',
    color: t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)',
    fontSize: 13, fontWeight: 500, animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
    boxShadow: 'var(--shadow-md)', border: `1px solid ${t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
    display: 'flex', alignItems: 'center', gap: 8,
  }
}

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

interface PagePerm {
  view: boolean; upload?: boolean; delete?: boolean; createPool?: boolean; format?: boolean
  chat?: boolean; imageGen?: boolean; manageProviders?: boolean; add?: boolean; remove?: boolean
  scan?: boolean; install?: boolean; configure?: boolean; launch?: boolean; processes?: boolean
  services?: boolean; docker?: boolean; firewall?: boolean; create?: boolean; cancel?: boolean
  notes?: boolean; todos?: boolean; terminal?: boolean; restore?: boolean; empty?: boolean
  send?: boolean; popup?: boolean; changeTheme?: boolean; changePassword?: boolean; edit?: boolean
  managePermissions?: boolean
}

export default function PermissionsPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [perms, setPerms] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const isAdmin = user?.role === 'admin'

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (isAdmin) {
          const [uRes, pRes] = await Promise.all([
            api.get('/users/'),
            api.get('/permissions/default')
          ])
          setUsers(uRes.data)
          setPerms(pRes.data)
        } else {
          const pRes = await api.get('/permissions/me')
          setPerms(pRes.data)
        }
        setError('')
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load permissions')
      } finally { setLoading(false) }
    }
    load()
  }, [isAdmin])

  const loadUserPerms = async (userId: string) => {
    try {
      const r = await api.get(`/permissions/${userId}`)
      setPerms(r.data)
    } catch { addToast('Failed to load user permissions', 'error') }
  }

  const savePerms = async () => {
    if (!selectedUser || !isAdmin) return
    setSaving(true)
    setShowSaveConfirm(false)
    try {
      await api.put(`/permissions/${selectedUser.id}`, perms)
      addToast('Permissions updated', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const togglePagePerm = (page: string, action: string) => {
    setPerms((prev: any) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [page]: { ...prev.pages[page], [action]: !prev.pages[page]?.[action] }
      }
    }))
  }

  const toggleFeature = (feature: string) => {
    setPerms((prev: any) => ({
      ...prev,
      features: { ...prev.features, [feature]: !prev.features[feature] }
    }))
  }

  const setAllPagePerms = (value: boolean) => {
    setPerms((prev: any) => {
      if (!prev?.pages) return prev
      const updated: any = {}
      for (const [page, actions] of Object.entries(prev.pages)) {
        const updatedActions: any = {}
        for (const action of Object.keys(actions as Record<string, boolean>)) {
          updatedActions[action] = value
        }
        updated[page] = updatedActions
      }
      return { ...prev, pages: updated }
    })
  }

  const countGranted = () => {
    if (!perms?.pages) return 0
    let count = 0
    for (const actions of Object.values(perms.pages) as any) {
      for (const val of Object.values(actions) as any) {
        if (val) count++
      }
    }
    if (perms.features) {
      for (const val of Object.values(perms.features) as any) {
        if (val) count++
      }
    }
    return count
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase())
  )

  if (loading) {
    return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading permissions...</h3></div>
  }

  if (error) {
    return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>
  }

  if (!isAdmin && perms) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldCheck size={18} /> My Permissions
        </h3>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pages</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(perms.pages || {}).map(([page, actions]: [string, any]) => (
              <div key={page} className="glass-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize', marginBottom: 6 }}>{page.replace(/([A-Z])/g, ' $1').trim()}</div>
                {Object.entries(actions).map(([action, val]: [string, any]) => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 3 }}>
                    {val ? <Check size={12} style={{ color: 'var(--success)' }} /> : <X size={12} style={{ color: 'var(--danger)' }} />}
                    <span style={{ color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{action}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 12 }}>Features</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(perms.features || {}).map(([feat, val]: [string, any]) => (
              <span key={feat} className={`badge ${val ? 'badge-success' : 'badge-ghost'}`} style={{ fontSize: 11 }}>
                {val ? <Check size={10} /> : <X size={10} />} {feat.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={18} /> Permissions Manager
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        <div className="glass-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, padding: '4px 8px' }}>Users</div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredUsers.map(u => (
              <div key={u.id}
                className={`nav-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                style={{ cursor: 'pointer', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
                onClick={() => { setSelectedUser(u); loadUserPerms(u.id) }}>
                <User size={14} />
                <span>{u.username}</span>
                <span className="badge" style={{ fontSize: 10, marginLeft: 'auto', background: u.role === 'admin' ? 'var(--accent-dim)' : 'var(--glass-border)', color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>{u.role}</span>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8, textAlign: 'center' }}>No users found</div>
            )}
          </div>
        </div>

        {selectedUser && perms && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={16} /> {selectedUser.username}
                <span className="badge" style={{ fontSize: 10, background: selectedUser.role === 'admin' ? 'var(--accent-dim)' : 'var(--glass-border)', color: selectedUser.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>{selectedUser.role}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{countGranted()} permissions granted</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSaveConfirm(true)} disabled={saving}>
                  {saving ? <><Loader size={14} className="spin" /> Saving...</> : <><Save size={14} /> Save</>}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              Page Permissions
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }} onClick={() => setAllPagePerms(true)}>Select All</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }} onClick={() => setAllPagePerms(false)}>Deselect All</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginBottom: 20 }}>
              {Object.entries(perms.pages || {}).map(([page, actions]: [string, any]) => (
                <div key={page} className="glass-card" style={{ padding: 12, background: 'var(--glass-bg)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize', marginBottom: 6 }}>{page.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(actions).map(([action, val]: [string, any]) => (
                      <button key={action}
                        className={`btn btn-sm ${val ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}
                        onClick={() => togglePagePerm(page, action)}>
                        {val ? <Check size={10} /> : <X size={10} />} {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Feature Toggles</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(perms.features || {}).map(([feat, val]: [string, any]) => (
                <button key={feat}
                  className={`btn btn-sm ${val ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                  onClick={() => toggleFeature(feat)}>
                  {val ? <Check size={12} /> : <X size={12} />} {feat.replace(/([A-Z])/g, ' $1').trim()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!selectedUser && (
        <div className="empty-state" style={{ padding: 40 }}>
          <Lock size={48} />
          <h3>Select a user</h3>
          <p style={{ fontSize: 13 }}>Choose a user from the list to manage their permissions</p>
        </div>
      )}

      <ConfirmDialog
        open={showSaveConfirm}
        title="Save Permissions"
        message={`Are you sure you want to save permissions for "${selectedUser?.username}"?`}
        onConfirm={savePerms}
        onCancel={() => setShowSaveConfirm(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
