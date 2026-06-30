import React, { useEffect, useState, useCallback } from 'react'
import {
  Podcast, Plus, X, Play, Pause, Download, Search,
  Loader, AlertCircle, Check, Info, Trash2, RefreshCw, Clock,
  CheckCircle
} from 'lucide-react'
import api from '../utils/api'

interface PodcastFeed {
  id: string; title: string; author: string; description: string; image: string; episodes: number
}

interface Episode {
  id: string; title: string; description: string; duration: number; published: string; played: boolean; downloaded: boolean
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

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Unsubscribe</button>
        </div>
      </div>
    </div>
  )
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastFeed[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [unsubscribeTarget, setUnsubscribeTarget] = useState<PodcastFeed | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/podcasts/list')
      setPodcasts(r.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load podcasts')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const loadEpisodes = async (podcastId: string) => {
    setSelectedPodcast(podcastId)
    try {
      const r = await api.get(`/podcasts/episodes/${podcastId}`)
      setEpisodes(r.data)
    } catch { addToast('Failed to load episodes', 'error') }
  }

  const addPodcast = async () => {
    if (!feedUrl.trim()) return
    try {
      await api.post('/podcasts/subscribe', { url: feedUrl.trim() })
      addToast('Podcast subscribed', 'success')
      setFeedUrl(''); setShowAdd(false)
      load()
    } catch { addToast('Failed to subscribe', 'error') }
  }

  const removePodcast = async () => {
    if (!unsubscribeTarget) return
    try {
      await api.delete(`/podcasts/unsubscribe/${unsubscribeTarget.id}`)
      setPodcasts(prev => prev.filter(p => p.id !== unsubscribeTarget.id))
      if (selectedPodcast === unsubscribeTarget.id) { setSelectedPodcast(null); setEpisodes([]) }
      addToast('Podcast removed', 'success')
    } catch { addToast('Failed to remove', 'error') }
    finally { setUnsubscribeTarget(null) }
  }

  const playEpisode = async (episodeId: string) => {
    try {
      await api.post(`/podcasts/play/${episodeId}`)
      addToast('Playing episode', 'info')
    } catch { addToast('Failed to play', 'error') }
  }

  const downloadEpisode = async (episodeId: string) => {
    try {
      await api.post(`/podcasts/download/${episodeId}`)
      addToast('Download started', 'success')
      if (selectedPodcast) loadEpisodes(selectedPodcast)
    } catch { addToast('Failed to download', 'error') }
  }

  const refreshPodcast = async (podcastId: string) => {
    try {
      await api.post(`/podcasts/refresh/${podcastId}`)
      addToast('Podcast refreshed', 'success')
      if (selectedPodcast === podcastId) loadEpisodes(podcastId)
    } catch { addToast('Failed to refresh', 'error') }
  }

  const markPlayed = async (episodeId: string) => {
    try {
      await api.post(`/podcasts/mark-played/${episodeId}`)
      setEpisodes(prev => prev.map(e => e.id === episodeId ? { ...e, played: true } : e))
      addToast('Marked as played', 'success')
    } catch { addToast('Failed to mark as played', 'error') }
  }

  const filteredPodcasts = podcasts.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.author?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedPod = podcasts.find(p => p.id === selectedPodcast)

  if (loading) return <div className="empty-state"><Loader size={32} className="spin" /><h3>Loading podcasts...</h3></div>
  if (error) return <div className="empty-state"><AlertCircle size={48} style={{ color: 'var(--danger)' }} /><h3 style={{ color: 'var(--danger)' }}>{error}</h3></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfirmDialog
        open={!!unsubscribeTarget}
        title="Unsubscribe"
        message={`Are you sure you want to unsubscribe from "${unsubscribeTarget?.title}"?`}
        onConfirm={removePodcast}
        onCancel={() => setUnsubscribeTarget(null)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Podcast size={18} /> Podcasts
        </h3>
        <div style={{ flex: 1 }} />
        {!selectedPodcast && (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, height: 32, fontSize: 12, width: 180 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Subscribe</button>
          </>
        )}
        {selectedPodcast && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedPodcast(null); setEpisodes([]) }}><X size={14} /> Back</button>
        )}
      </div>

      {showAdd && !selectedPodcast && (
        <div className="glass-card" style={{ padding: 12, display: 'flex', gap: 8 }}>
          <input placeholder="RSS feed URL" value={feedUrl} onChange={e => setFeedUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPodcast()}
            style={{ flex: 1, height: 32, fontSize: 13 }} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={addPodcast}>Add</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {selectedPodcast && selectedPod ? (
        <>
          <div className="glass-card" style={{ padding: 16, display: 'flex', gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--glass-bg)' }}>
              {selectedPod.image ? <img src={selectedPod.image} alt={selectedPod.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Podcast size={28} /></div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedPod.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedPod.author}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{selectedPod.description}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => refreshPodcast(selectedPod.id)} style={{ alignSelf: 'flex-start' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {episodes.length === 0 ? (
            <div className="empty-state"><Podcast size={48} /><h3>No episodes</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {episodes.map(e => (
                <div key={e.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {formatDuration(e.duration)}</span>
                      <span>{new Date(e.published).toLocaleDateString()}</span>
                      {e.played && <span style={{ color: 'var(--success)' }}>Played</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {!e.played && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markPlayed(e.id)} title="Mark as played">
                        <CheckCircle size={12} />
                      </button>
                    )}
                    {!e.downloaded && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => downloadEpisode(e.id)} title="Download">
                        <Download size={12} />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => playEpisode(e.id)} title="Play">
                      <Play size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        filteredPodcasts.length === 0 ? (
          <div className="empty-state"><Podcast size={48} /><h3>{search ? 'No matching podcasts' : 'No podcasts'}</h3><p style={{ fontSize: 13 }}>Subscribe to a podcast feed to get started</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {filteredPodcasts.map(p => (
              <div key={p.id} className="glass-card" style={{ padding: 14, display: 'flex', gap: 12, cursor: 'pointer' }} onClick={() => loadEpisodes(p.id)}>
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--glass-bg)' }}>
                  {p.image ? <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Podcast size={24} /></div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.author}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p.episodes} episodes</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setUnsubscribeTarget(p) }} title="Unsubscribe" style={{ color: 'var(--danger)', alignSelf: 'center' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
