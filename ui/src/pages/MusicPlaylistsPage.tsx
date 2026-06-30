import React, { useEffect, useState, useCallback } from 'react'
import {
  ListMusic, Plus, X, Trash2, Loader, AlertCircle, Check,
  Info, Play, Music, Edit3, Save, AlertTriangle, Eye, Disc3, Clock
} from 'lucide-react'
import api from '../utils/api'

interface Playlist {
  id: string; name: string; song_count: number; duration: string; created_at: string
}

interface Song { id: string; title: string; artist: string; duration: number }

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

export default function MusicPlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [viewPlaylistId, setViewPlaylistId] = useState<string | null>(null)
  const [viewPlaylistName, setViewPlaylistName] = useState('')
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([])
  const [songsLoading, setSongsLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<{ playlistId: string; songId: string } | null>(null)
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((m: string, t: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message: m, type: t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/music/playlists'); setPlaylists(r.data); setError('') }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to load playlists') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const createPlaylist = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/music/playlists/create', { name: newName.trim() })
      addToast('Playlist created', 'success'); setShowCreate(false); setNewName(''); load()
    } catch { addToast('Failed to create playlist', 'error') }
  }

  const deletePlaylist = async (id: string) => {
    try { await api.delete('/music/playlists/delete/' + id); setPlaylists(prev => prev.filter(p => p.id !== id)); addToast('Playlist deleted', 'success') }
    catch { addToast('Failed to delete playlist', 'error') }
    finally { setConfirmDelete(null); if (viewPlaylistId === id) setViewPlaylistId(null) }
  }

  const renamePlaylist = async (id: string) => {
    if (!editName.trim()) return
    try {
      await api.put('/music/playlists/rename/' + id, { name: editName.trim() })
      addToast('Playlist renamed', 'success'); setEditing(null); load()
    } catch { addToast('Failed to rename', 'error') }
  }

  const playPlaylist = async (id: string) => {
    try { await api.post('/music/playlist/play/' + id); addToast('Now playing playlist', 'success') }
    catch { addToast('Failed to play playlist', 'error') }
  }

  const viewSongs = async (id: string, name: string) => {
    setViewPlaylistId(id); setViewPlaylistName(name); setSongsLoading(true); setPlaylistSongs([])
    try { const r = await api.get('/music/playlists/' + id + '/songs'); setPlaylistSongs(r.data) }
    catch { addToast('Failed to load playlist songs', 'error') }
    finally { setSongsLoading(false) }
  }

  const removeSong = async (playlistId: string, songId: string) => {
    try {
      await api.delete('/music/playlists/' + playlistId + '/remove/' + songId)
      addToast('Song removed from playlist', 'success')
      setPlaylistSongs(prev => prev.filter(s => s.id !== songId))
      load()
    } catch { addToast('Failed to remove song', 'error') }
    finally { setConfirmRemove(null) }
  }

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading playlists...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><ListMusic size={18} /> Playlists</h3>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus size={14} /> New</button>
      </div>
      {showCreate && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 8 }}>
          <input placeholder="Playlist name" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={createPlaylist} style={{ height: 32 }}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)} style={{ height: 32 }}>Cancel</button>
        </div>
      )}
      {playlists.length === 0 ? (
        <div className="empty-state"><ListMusic size={48} /><h3>No playlists</h3></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {playlists.map(p => (
            <div key={p.id} className="card-liquid" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}><ListMusic size={20} /></div>
                {editing === p.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renamePlaylist(p.id)} style={{ flex: 1, height: 28, fontSize: 12 }} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={() => renamePlaylist(p.id)} style={{ fontSize: 10, height: 28, padding: '0 8px' }}>Save</button>
                  </div>
                ) : (
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => viewSongs(p.id, p.name)}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.song_count} songs {p.duration ? '- ' + p.duration : ''}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-primary btn-sm" onClick={() => playPlaylist(p.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Play size={12} /> Play</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => viewSongs(p.id, p.name)} title="View songs"><Eye size={12} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(p.id); setEditName(p.name) }} title="Rename"><Edit3 size={12} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmDelete(p.id)} style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewPlaylistId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setViewPlaylistId(null)}>
          <div className="glass-card" style={{ padding: 20, maxWidth: 480, width: '90%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ListMusic size={18} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{viewPlaylistName}</h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewPlaylistId(null)}><X size={14} /></button>
            </div>
            {songsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 20 }}>
                <Loader size={16} className="spin" /> <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading songs...</span>
              </div>
            ) : playlistSongs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No songs in this playlist</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flex: 1 }}>
                {playlistSongs.map(s => (
                  <div key={s.id} className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Disc3 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.artist || 'Unknown'}</div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDuration(s.duration)}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirmRemove({ playlistId: viewPlaylistId, songId: s.id })} style={{ color: 'var(--danger)' }}><Trash2 size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} message="Are you sure you want to delete this playlist?" onConfirm={() => confirmDelete && deletePlaylist(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog open={confirmRemove !== null} message="Remove this song from the playlist?" onConfirm={() => confirmRemove && removeSong(confirmRemove.playlistId, confirmRemove.songId)} onCancel={() => setConfirmRemove(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
