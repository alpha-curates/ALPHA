import React, { useEffect, useState, useCallback } from 'react'
import {
  Music, Play, Pause, SkipForward, SkipBack, Volume2,
  Search, Loader, AlertCircle, Check, Info, X, List, Disc3
, AlertTriangle
} from 'lucide-react'
import api from '../utils/api'

interface Song {
  id: string; title: string; artist: string; album: string; duration: number; path: string
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

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [current, setCurrent] = useState<Song | null>(null)
  const [playing, setPlaying] = useState(false)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/music/library')
      setSongs(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load music library')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const playSong = async (song: Song) => {
    try {
      await api.post('/music/play', { id: song.id })
      setCurrent(song)
      setPlaying(true)
    } catch { addToast('Failed to play', 'error') }
  }

  const control = async (action: string) => {
    try {
      const r = await api.post('/music/control', { action })
      if (action === 'pause' || action === 'play') setPlaying(r.data.playing ?? action === 'play')
      if (action === 'next' || action === 'prev') {
        setCurrent(r.data.current || null)
        setPlaying(true)
      }
    } catch { addToast('Playback control failed', 'error') }
  }

  const filtered = songs.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading music library...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Music size={18} /> Music
        </h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search songs..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
      </div>

      {current && (
        <div className="liquid-glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <Disc3 size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{current.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{current.artist} — {current.album}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => control('prev')}><SkipBack size={16} /></button>
            <button className="btn btn-primary btn-sm" onClick={() => control(playing ? 'pause' : 'play')} style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => control('next')}><SkipForward size={16} /></button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><Music size={48} /><h3>{search ? 'No matching songs' : 'No songs found'}</h3><p style={{ fontSize: 13 }}>Add music files to your library</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(s => (
            <div key={s.id} className={`glass-card ${current?.id === s.id ? 'active' : ''}`} style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              border: current?.id === s.id ? '1px solid var(--accent)' : undefined
            }} onClick={() => playSong(s)}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                {current?.id === s.id && playing ? <Music size={16} className="spin" /> : <Music size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span>{s.artist || 'Unknown'}</span>
                  {s.album && <><span>·</span><span>{s.album}</span></>}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDuration(s.duration)}</span>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
