import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import api from '../../utils/api'
import {
  LayoutDashboard, HardDrive, Brain, Monitor, Puzzle,
  Grid3X3, Settings, LogOut, Bell, Users, BellDot, Trash2,
  Link, Wrench, Server, FileText
} from 'lucide-react'

const navItems = [
  { section: 'Core' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Storage', icon: HardDrive, path: '/storage' },
  { label: 'AI Studio', icon: Brain, path: '/ai' },
  { section: 'System' },
  { label: 'Devices', icon: Monitor, path: '/devices' },
  { label: 'Extensions', icon: Puzzle, path: '/extensions' },
  { label: 'Apps', icon: Grid3X3, path: '/apps' },
  { label: 'System Tools', icon: Server, path: '/system-tools' },
  { section: 'Utilities' },
  { label: 'Tools', icon: Wrench, path: '/tools' },
  { label: 'Share Links', icon: Link, path: '/shares' },
  { label: 'Trash', icon: Trash2, path: '/trash' },
  { section: 'Account' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { } = useTheme()
  const [unread, setUnread] = useState(0)
  const [notifs, setNotifs] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const r = await api.get('/notifications/')
        setNotifs(r.data.notifications?.slice(0, 5) || [])
        setUnread(r.data.unread || 0)
      } catch {}
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  const markRead = async (id: string) => {
    await api.post(`/notifications/read/${id}`)
    setUnread(prev => Math.max(0, prev - 1))
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">A</div>
          <span>ALPHA</span>
        </div>

        {navItems.map((item, i) =>
          'section' in item ? (
            <div key={i} className="nav-section">{item.section}</div>
          ) : (
            <button
              key={i}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              {item.icon && <item.icon />}
              {item.label}
              {item.label === 'Notifications' && unread > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--accent)', color: 'white' }}>{unread}</span>
              )}
            </button>
          )
        )}

        {user?.role === 'admin' && (
          <>
            <div className="nav-section">Admin</div>
            <button
              className={`nav-item ${location.pathname === '/users' ? 'active' : ''}`}
              onClick={() => navigate('/users')}
            >
              <Users /> Users
            </button>
          </>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--glass-border)', margin: '0 -16px', paddingLeft: 28, paddingRight: 28 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{user?.username}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={logout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="main-area">
        <div className="header">
          <div className="header-left">
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              {navItems.find(i => 'path' in i && i.path === location.pathname)?.label || 
               (location.pathname === '/users' ? 'Users' : 'Dashboard')}
            </h2>
          </div>
          <div className="header-right">
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNotifs(!showNotifs)} title="Notifications">
                {unread > 0 ? <BellDot size={18} style={{ color: 'var(--accent)' }} /> : <Bell size={18} />}
              </button>
              {unread > 0 && !showNotifs && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
              )}
              {showNotifs && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 320, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 100, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { navigate('/notifications'); setShowNotifs(false) }}>View All</button>
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No notifications</div>
                  ) : notifs.map(n => (
                    <div key={n.id} style={{ padding: '8px 8px', display: 'flex', gap: 8, alignItems: 'flex-start', opacity: n.read ? 0.5 : 1, cursor: 'pointer', borderRadius: 8 }}
                      onClick={() => { if (!n.read) markRead(n.id) }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                      </div>
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="content" onClick={() => setShowNotifs(false)}>
          {children}
        </div>
      </div>
    </div>
  )
}
