import React, { useEffect, useState, useCallback } from 'react'
import {
  Music, Play, Search, Loader, AlertCircle, Check, Info,
  X, Clock, Disc3, RefreshCw, AlertTriangle, Plus,
  ArrowUpDown, ListMusic, ScanLine
} from 'lucide-react'
import api from '../utils/api'

interface Song { id: string; title: string; artist: string; album: string; duration: number; path: string }

interface Playlist { id: string; name: string }

interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }

interface ConfirmDialogProps {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void
}

function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card" style={{ padding: 20, maxWidth: 360, width: '90%' }}>
        <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{message}</p>
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

function formatDuration(s: number) { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return m + ':' + sec.toString().padStart(2, '0') }

export default function MusicLibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'duration'>('title')
  const [sortAsc, setSortAsc] = useState(true)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [addPlaylistId, setAddPlaylistId] = useState<string>('')
  const [addSongId, setAddSongId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((m: string, t: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message: m, type: t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, pRes] = await Promise.all([api.get('/music/library'), api.get('/music/playlists')])
      setSongs(sRes.data); setPlaylists(pRes.data); setError('')
    }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load library') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const playSong = async (id: string) => {
    try { await api.post('/music/play', { id }); addToast('Now playing', 'success') }
    catch { addToast('Failed to play song', 'error') }
  }

  const addToPlaylist = async (songId: string, playlistId: string) => {
    if (!playlistId) return
    try {
      await api.post('/music/playlists/' + playlistId + '/add', { song_id: songId })
      addToast('Added to playlist', 'success'); setAddSongId(null); setAddPlaylistId('')
    } catch { addToast('Failed to add to playlist', 'error') }
  }

  const scanLibrary = async () => {
    setScanning(true)
    try { await api.post('/music/scan'); addToast('Library scan started', 'success'); load() }
    catch { addToast('Failed to scan library', 'error') }
    finally { setScanning(false) }
  }

  const filtered = songs.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortBy === 'artist') cmp = (a.artist || '').localeCompare(b.artist || '')
    else if (sortBy === 'duration') cmp = a.duration - b.duration
    return sortAsc ? cmp : -cmp
  })

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0)
  const totalMinutes = Math.floor(totalDuration / 60)
  const totalSecs = totalDuration % 60

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading library...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Music size={18} /> Music Library</h3>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 200 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={scanLibrary} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {scanning ? <Loader size={14} className="spin" /> : <ScanLine size={14} />} Scan
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {songs.length > 0 && (
        <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text)' }}>{songs.length}</strong> songs</span>
          <span>Total duration: <strong style={{ color: 'var(--text)' }}>{totalMinutes}:{totalSecs.toString().padStart(2, '0')}</strong></span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11 }}>Sort by:</span>
          {(['title', 'artist', 'duration'] as const).map(f => (
            <button key={f} className={'btn btn-sm ' + (sortBy === f ? 'btn-primary' : 'btn-ghost')} onClick={() => { if (sortBy === f) setSortAsc(!sortAsc); else { setSortBy(f); setSortAsc(true) } }} style={{ fontSize: 10, textTransform: 'capitalize' }}>
              {f} {sortBy === f && (sortAsc ? 'A-Z' : 'Z-A')}
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state"><Music size={48} /><h3>{search ? 'No matching songs' : 'No songs in library'}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map(s => (
            <div key={s.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}><Disc3 size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span>{s.artist || 'Unknown'}</span>{s.album && <><span>.</span><span>{s.album}</span></>}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDuration(s.duration)}</span>
              {addSongId === s.id ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <select value={addPlaylistId} onChange={e => setAddPlaylistId(e.target.value)} style={{ height: 28, fontSize: 11, width: 110 }}>
                    <option value="">Select playlist...</option>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => addToPlaylist(s.id, addPlaylistId)} style={{ fontSize: 10, height: 28, padding: '0 8px' }}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddSongId(null)} style={{ fontSize: 10, height: 28, padding: '0 8px' }}>X</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setAddSongId(s.id); setAddPlaylistId('') }} title="Add to playlist"><Plus size={12} /></button>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => playSong(s.id)} title="Play"><Play size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
