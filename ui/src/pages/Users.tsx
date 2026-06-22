import React, { useEffect, useState } from 'react'
import {
  Users, UserPlus, Shield, Trash2, Crown, User,
  AlertTriangle, Smile
} from 'lucide-react'
import api from '../utils/api'
import { User as UserType } from '../types'

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Crown size={14} style={{ color: 'var(--warning)' }} />,
  user: <User size={14} />,
  limited: <Shield size={14} style={{ color: 'var(--info)' }} />,
  joke: <Smile size={14} style={{ color: 'var(--accent)' }} />,
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user' })

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const createUser = async () => {
    try {
      await api.post('/users/create', newUser)
      setShowCreate(false)
      setNewUser({ username: '', password: '', email: '', role: 'user' })
      const r = await api.get('/users/')
      setUsers(r.data)
    } catch {}
  }

  const deleteUser = async (id: string) => {
    await api.delete(`/users/${id}`)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const changeRole = async (id: string, role: string) => {
    await api.put(`/users/${id}/role`, { role })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} /> User Management
        </h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={14} /> Create User
        </button>
      </div>

      {showCreate && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="Username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} style={{ height: 34, fontSize: 13 }} />
            <input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} style={{ height: 34, fontSize: 13 }} />
            <input placeholder="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} style={{ height: 34, fontSize: 13 }} />
            <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} style={{ height: 34, fontSize: 13 }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="limited">Limited</option>
              <option value="joke">Joke</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={createUser}>Create</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {users.map(u => (
          <div key={u.id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
              {u.username[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {u.username}
                {roleIcons[u.role]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email || 'No email'}</div>
            </div>
            <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
              style={{ width: 'auto', height: 30, fontSize: 12 }}>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="limited">Limited</option>
              <option value="joke">Joke</option>
            </select>
            {u.role !== 'admin' && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteUser(u.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
