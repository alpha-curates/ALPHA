import React, { useEffect, useState, useCallback } from 'react'
import {
  Bell, Check, CheckCheck, Trash2, Info, AlertTriangle,
  AlertCircle, Mail, Home, MessageSquare, X, Megaphone,
  Loader, Send
} from 'lucide-react'
import api from '../utils/api'
import { Notification } from '../types'
import { useAuth } from '../hooks/useAuth'

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

const toastStyle = (t: ToastData['type']) => ({
  padding: '10px 14px', borderRadius: 10,
  background: t === 'error' ? 'var(--danger-dim)' : t === 'success' ? 'var(--success-dim)' : t === 'warning' ? 'var(--warning-dim)' : 'var(--info-dim)',
  color: t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)',
  fontSize: 13, fontWeight: 500,
  animation: 'smoothSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
  boxShadow: 'var(--shadow-md)',
  border: `1px solid ${t === 'error' ? 'var(--danger)' : t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
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
  const [popupTarget, setPopupTarget] = useState('all')
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creatingPopup, setCreatingPopup] = useState(false)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Notifications - AlphaNAS` : 'Notifications - AlphaNAS'
  }, [unread])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.get('/notifications/')
      setNotifications(r.data.notifications)
      setUnread(r.data.unread)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.get('/users/').then(r => setAllUsers(r.data)).catch(() => {})
  }, [load])

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/read/${id}`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {
      addToast('Failed to mark as read', 'error')
    }
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
      addToast('All notifications marked as read', 'success')
    } catch {
      addToast('Failed to mark all as read', 'error')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      const removed = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (removed && !removed.read) setUnread(prev => Math.max(0, prev - 1))
      addToast('Notification deleted', 'success')
    } catch {
      addToast('Failed to delete notification', 'error')
    }
  }

  const sendNotification = async () => {
    if (!sendTitle.trim() || !sendMsg.trim()) return
    setSending(true)
    try {
      await api.post('/notifications/send', { title: sendTitle, message: sendMsg, type: sendType })
      setSendTitle(''); setSendMsg(''); setShowSend(false)
      addToast('Notification sent', 'success')
      load()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send notification', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> Notifications
          {unread > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--accent)', color: 'white' }}>{unread}</span>}
        </h3>
        <div style={{ flex: 1 }} />
        {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllRead}><CheckCheck size={14} /> Mark All Read</button>}
        <button className="btn btn-primary btn-sm" onClick={() => setShowSend(!showSend)}><Bell size={14} /> Send</button>
      </div>

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
            <button className="btn btn-primary btn-sm" onClick={sendNotification} disabled={sending}>
              {sending ? <><Loader size={14} className="spin" /> Sending...</> : <><Send size={14} /> Send</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSend(false)}>Cancel</button>
          </div>
        </div>
      )}

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
                <select value={popupTarget} onChange={e => setPopupTarget(e.target.value)} style={{ width: 'auto', height: 34, fontSize: 13 }}>
                  <option value="all">All Users</option>
                  {allUsers.filter(u => u.id !== user?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={async () => {
                  if (!popupTitle.trim() || !popupMsg.trim()) return
                  setCreatingPopup(true)
                  try {
                    await api.post('/popups/create', {
                      title: popupTitle, message: popupMsg, type: popupType,
                      target_user_id: popupTarget === 'all' ? null : popupTarget
                    })
                    setPopupTitle(''); setPopupMsg(''); setShowPopupCreator(false)
                    addToast('Popup published', 'success')
                  } catch (err: any) {
                    addToast(err.response?.data?.error || 'Failed to create popup', 'error')
                  } finally {
                    setCreatingPopup(false)
                  }
                }} disabled={creatingPopup}>
                  {creatingPopup ? <><Loader size={14} className="spin" /> Publishing...</> : 'Publish Popup'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPopupCreator(false)}>Cancel</button>
              </div>
              {popupTarget !== 'all' && (
                <div style={{ fontSize: 11, color: 'var(--info)' }}>This popup will only show for the selected user</div>
              )}
            </div>
          )}
        </>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading notifications...</h3></div>
      ) : error ? (
        <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3><p style={{ fontSize: 13 }}>Try refreshing the page</p></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state"><Bell size={48} /><h3>No notifications yet</h3><p style={{ fontSize: 13 }}>Notifications from the system and other users will appear here</p></div>
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
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteNotification(n.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
