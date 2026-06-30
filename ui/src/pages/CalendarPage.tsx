import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Trash2,
  Loader, AlertCircle, Check, Info, Clock, Circle,
  AlertTriangle, Edit3, List
} from 'lucide-react'
import api from '../utils/api'

interface CalendarEvent {
  id: string; title: string; date: string; time?: string; description?: string; color?: string
}

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

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

function ConfirmDialog({ show, title, message, onConfirm, onCancel }: { show: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div className="glass-card" style={{ padding: 20, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>{title}</h4>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-sm" onClick={onConfirm} style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newColor, setNewColor] = useState('var(--accent)')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editColor, setEditColor] = useState('')
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/calendar/events')
      setEvents(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load events')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const addEvent = async () => {
    if (!newTitle.trim() || !selectedDate) return
    try {
      await api.post('/calendar/events/add', { title: newTitle.trim(), date: selectedDate, time: newTime, color: newColor })
      addToast('Event added', 'success')
      setNewTitle(''); setNewTime(''); setNewColor('var(--accent)'); setShowAdd(false)
      load()
    } catch { addToast('Failed to add event', 'error') }
  }

  const confirmDelete = (id: string) => {
    setDeleteTarget(id)
    setShowConfirm(true)
  }

  const deleteEvent = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/calendar/events/delete/${deleteTarget}`)
      setEvents(prev => prev.filter(e => e.id !== deleteTarget))
      addToast('Event deleted', 'success')
    } catch { addToast('Failed to delete event', 'error') }
    finally { setShowConfirm(false); setDeleteTarget(null) }
  }

  const startEdit = (e: CalendarEvent) => {
    setEditingEvent(e)
    setEditTitle(e.title)
    setEditTime(e.time || '')
    setEditColor(e.color || 'var(--accent)')
  }

  const updateEvent = async () => {
    if (!editingEvent || !editTitle.trim()) return
    try {
      await api.put(`/calendar/events/update/${editingEvent.id}`, { title: editTitle.trim(), time: editTime, color: editColor })
      addToast('Event updated', 'success')
      setEditingEvent(null)
      load()
    } catch { addToast('Failed to update event', 'error') }
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }

  const todayStr = new Date().toISOString().slice(0, 10)

  const goToday = () => {
    const now = new Date()
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
    setSelectedDate(todayStr)
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  const dateStr = (day: number) => `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const selectedEvents = events.filter(e => e.date === selectedDate)

  const weekDates = useMemo(() => {
    if (viewMode !== 'week') return []
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [viewMode])

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading calendar...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfirmDialog show={showConfirm} title="Delete Event" message="Are you sure you want to delete this event?" onConfirm={deleteEvent} onCancel={() => { setShowConfirm(false); setDeleteTarget(null) }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} /> Calendar
        </h3>
        <div style={{ flex: 1 }} />
        <button className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')} style={{ fontSize: 11 }}>
          <List size={12} /> {viewMode === 'month' ? 'Week' : 'Month'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={goToday} style={{ fontSize: 11 }}>Today</button>
        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedDate(todayStr); setShowAdd(true) }}><Plus size={14} /> Add Event</button>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth}><ChevronLeft size={18} /></button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 180, textAlign: 'center' }}>{MONTHS[currentMonth]} {currentYear}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>

        {viewMode === 'month' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', fontWeight: 600 }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const ds = dateStr(day)
              const dayEvents = eventsByDate[ds] || []
              const isToday = ds === todayStr
              return (
                <div key={day} style={{
                  textAlign: 'center', padding: '6px 0', cursor: 'pointer', borderRadius: 8,
                  background: isToday ? 'var(--accent-dim)' : selectedDate === ds ? 'var(--glass-bg)' : 'transparent',
                  color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isToday ? 700 : 400,
                  position: 'relative'
                }} onClick={() => setSelectedDate(ds)}>
                  <span style={{ fontSize: 14 }}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} style={{ width: 5, height: 5, borderRadius: '50%', background: e.color || 'var(--accent)' }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {weekDates.map((d, i) => {
              const ds = d.toISOString().slice(0, 10)
              const dayEvents = eventsByDate[ds] || []
              const isToday = ds === todayStr
              return (
                <div key={i} style={{
                  minHeight: 120, borderRadius: 8, padding: 6,
                  background: isToday ? 'var(--accent-dim)' : 'var(--glass-bg)',
                  border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>
                    {DAYS[d.getDay()]} {d.getDate()}
                  </div>
                  {dayEvents.map(e => (
                    <div key={e.id} style={{
                      fontSize: 10, padding: '2px 4px', marginBottom: 2, borderRadius: 4,
                      background: e.color || 'var(--accent)', color: '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer'
                    }} onClick={() => { setSelectedDate(ds); startEdit(e) }}>
                      {e.time && <span style={{ fontWeight: 600 }}>{e.time} </span>}{e.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedDate && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''})</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingEvent(null); setShowAdd(true) }}><Plus size={14} /> Add</button>
          </div>

          {showAdd && !editingEvent && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: 'var(--glass-bg)', borderRadius: 8 }}>
              <input placeholder="Event title" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEvent()}
                style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ width: 100, height: 32, fontSize: 12 }} />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: 'none' }} />
              <button className="btn btn-primary btn-sm" onClick={addEvent} style={{ height: 32 }}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)} style={{ height: 32 }}>Cancel</button>
            </div>
          )}

          {editingEvent && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: 'var(--glass-bg)', borderRadius: 8 }}>
              <input placeholder="Event title" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && updateEvent()}
                style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus />
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ width: 100, height: 32, fontSize: 12 }} />
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: 'none' }} />
              <button className="btn btn-primary btn-sm" onClick={updateEvent} style={{ height: 32 }}>Update</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingEvent(null)} style={{ height: 32 }}>Cancel</button>
            </div>
          )}

          {selectedEvents.length === 0 && !showAdd && !editingEvent ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No events on this day</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedEvents.map(e => (
                <div key={e.id} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--glass-bg)', borderLeft: `3px solid ${e.color || 'var(--accent)'}` }}>
                  <Circle size={8} style={{ color: e.color || 'var(--accent)', fill: e.color || 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                    {e.time && <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {e.time}</div>}
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(e)} title="Edit"><Edit3 size={12} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => confirmDelete(e.id)} title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
