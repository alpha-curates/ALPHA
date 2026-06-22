import React, { useEffect, useState } from 'react'
import {
  Bell, Check, CheckCheck, Trash2, Info, AlertTriangle,
  AlertCircle, Mail, Home, MessageSquare, X, PartyPopper, Gift, Megaphone
} from 'lucide-react'
import api from '../utils/api'
import { Notification } from '../types'
import { useAuth } from '../hooks/useAuth'

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info size={16} style={{ color: 'var(--info)' }} />,
  system: <AlertCircle size={16} style={{ color: 'var(--warning)' }} />,
  alert: <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />,
  broadcast: <MessageSquare size={16} style={{ color: 'var(--accent)' }} />,
  home: <Home size={16} style={{ color: 'var(--success)' }} />,
  message: <Mail size={16} style={{ color: 'var(--info)' }} />,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [showSend, setShowSend] = useState(false)
  const [sendTitle, setSendTitle] = useState('')
  const [sendMsg, setSendMsg] = useState('')
  const [sendType, setSendType] = useState('info')
  const [showPopupCreator, setShowPopupCreator] = useState(false)
  const [popupTitle, setPopupTitle] = useState('')
  const [popupMsg, setPopupMsg] = useState('')
  const [popupType, setPopupType] = useState('celebration')

  useEffect(() => {
    api.get('/notifications/').then(r => {
      setNotifications(r.data.notifications)
      setUnread(r.data.unread)
    }).catch(() => {})
  }, [])

  const markRead = async (id: string) => {
    await api.post(`/notifications/read/${id}`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await api.post('/notifications/read-all')
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const sendNotification = async () => {
    if (!sendTitle.trim() || !sendMsg.trim()) return
    await api.post('/notifications/send', { title: sendTitle, message: sendMsg, type: sendType })
    setSendTitle(''); setSendMsg(''); setShowSend(false)
    const r = await api.get('/notifications/')
    setNotifications(r.data.notifications)
    setUnread(r.data.unread)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> Notifications
          {unread > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--accent)', color: 'white' }}>{unread}</span>}
        </h3>
        <div style={{ flex: 1 }} />
        {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllRead}><CheckCheck size={14} /> Mark All Read</button>}
        <button className="btn btn-primary btn-sm" onClick={() => setShowSend(!showSend)}><Bell size={14} /> Send</button>
      </div>

      {/* Send notification */}
      {showSend && (
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder="Title" value={sendTitle} onChange={e => setSendTitle(e.target.value)} style={{ height: 34, fontSize: 13 }} />
          <textarea placeholder="Message" value={sendMsg} onChange={e => setSendMsg(e.target.value)} style={{ height: 60, fontSize: 13, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={sendType} onChange={e => setSendType(e.target.value)} style={{ width: 'auto', height: 34, fontSize: 13 }}>
              <option value="info">Info</option>
              <option value="alert">Alert</option>
              <option value="message">Message</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={sendNotification}>Send</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSend(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Admin Popup Creator */}
      {user?.role === 'admin' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPopupCreator(!showPopupCreator)}>
              <Megaphone size={14} /> {showPopupCreator ? 'Close' : 'Create Popup'}
            </button>
          </div>
          {showPopupCreator && (
            <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>New Popup Announcement</div>
              <input placeholder="Popup title (e.g. Happy Father's Day!)" value={popupTitle} onChange={e => setPopupTitle(e.target.value)} style={{ height: 34, fontSize: 13 }} />
              <textarea placeholder="Message body..." value={popupMsg} onChange={e => setPopupMsg(e.target.value)} style={{ height: 80, fontSize: 13, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={popupType} onChange={e => setPopupType(e.target.value)} style={{ width: 'auto', height: 34, fontSize: 13 }}>
                  <option value="celebration">🎉 Celebration</option>
                  <option value="holiday">🎁 Holiday</option>
                  <option value="info">ℹ️ Info</option>
                  <option value="alert">⚠️ Alert</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={async () => {
                  if (!popupTitle.trim() || !popupMsg.trim()) return
                  await api.post('/popups/create', { title: popupTitle, message: popupMsg, type: popupType })
                  setPopupTitle(''); setPopupMsg(''); setShowPopupCreator(false)
                }}>Publish Popup</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPopupCreator(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* List */}
      {notifications.length === 0 ? (
        <div className="empty-state"><Bell size={48} /><h3>No notifications</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {notifications.map(n => (
            <div key={n.id} className="glass-card" style={{
              padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
              opacity: n.read ? 0.6 : 1,
              borderLeft: n.read ? 'none' : '3px solid var(--accent)'
            }}>
              <div style={{ marginTop: 2 }}>{typeIcons[n.type] || <Info size={16} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markRead(n.id)} title="Mark as read">
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
