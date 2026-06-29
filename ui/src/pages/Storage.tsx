import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Activity, AlertCircle, AlertTriangle, Archive, ArrowLeft,
  BarChart3, Check, CheckCircle, ChevronRight, Clock, Cpu,
  Database, Edit3, File, FileText, Film, Folder, FolderPlus,
  Gauge, Grid, HardDrive, Image, Info, Layers, List,
  Lock, Music, RefreshCw, Search, Server, Share2, ShieldAlert,
  Star, Thermometer, Trash2, Unlock, Upload, X, Zap
} from 'lucide-react'
import api from '../utils/api'
import { FileItem, StorageDrive } from '../types'

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(ts)
}

function Skeleton({ width, height, borderRadius = 8 }: { width?: string | number; height?: string | number; borderRadius?: number }) {
  return <div className="skeleton" style={{ width, height, borderRadius }} />
}

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 400, pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderLeft: `3px solid ${
            t.type === 'error' ? 'var(--danger)' :
            t.type === 'warning' ? 'var(--warning)' :
            t.type === 'success' ? 'var(--success)' : 'var(--accent)'
          }`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 500,
          animation: 'slideUp 0.25s ease',
          pointerEvents: 'auto',
          backdropFilter: 'blur(16px)'
        }}>
          {t.type === 'error' ? <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} /> :
           t.type === 'warning' ? <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} /> :
           t.type === 'success' ? <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} /> :
           <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

interface DriveWithHealth extends StorageDrive {
  filesystem?: string
  temp?: number
  reallocated_sectors?: number
  power_on_hours?: number
  pending_sectors?: number
  smart_status?: string
  rotational?: boolean
  model?: string
  serial?: string
}

interface ZfsPool {
  exists?: boolean
  name?: string
  health?: string
  size?: number
  used?: number
  free?: number
  scrub?: { status?: string; errors?: number; bytes_scrubbed?: number; duration?: string }
  compression_ratio?: number
  dedup_ratio?: number
  vdevs?: { name: string; type: string; devices: string[]; health: string; size: number }[]
  errors?: { read?: number; write?: number; checksum?: number }
  status?: string
  scan?: string
}

interface StorageOverview {
  total: number
  used: number
  free: number
  percent: number
  drives: number
}

function FileIcon({ ext, type }: { ext?: string; type: string }) {
  if (type === 'directory') return <Folder size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
  const iconMap: Record<string, React.ReactNode> = {
    '.jpg': <Image size={20} />, '.jpeg': <Image size={20} />, '.png': <Image size={20} />, '.gif': <Image size={20} />, '.svg': <Image size={20} />, '.webp': <Image size={20} />,
    '.txt': <FileText size={20} />, '.md': <FileText size={20} />, '.json': <FileText size={20} />, '.csv': <FileText size={20} />, '.xml': <FileText size={20} />, '.yml': <FileText size={20} />, '.yaml': <FileText size={20} />, '.log': <FileText size={20} />,
    '.mp3': <Music size={20} />, '.wav': <Music size={20} />, '.flac': <Music size={20} />, '.aac': <Music size={20} />, '.ogg': <Music size={20} />,
    '.mp4': <Film size={20} />, '.mkv': <Film size={20} />, '.mov': <Film size={20} />, '.avi': <Film size={20} />, '.webm': <Film size={20} />,
    '.zip': <Archive size={20} />, '.tar': <Archive size={20} />, '.gz': <Archive size={20} />, '.rar': <Archive size={20} />, '.7z': <Archive size={20} />, '.bz2': <Archive size={20} />,
    '.pdf': <FileText size={20} />, '.doc': <FileText size={20} />, '.docx': <FileText size={20} />, '.xls': <FileText size={20} />, '.xlsx': <FileText size={20} />,
    '.py': <FileText size={20} />, '.js': <FileText size={20} />, '.ts': <FileText size={20} />, '.tsx': <FileText size={20} />, '.jsx': <FileText size={20} />, '.html': <FileText size={20} />, '.css': <FileText size={20} />, '.sh': <FileText size={20} />,
    '.alpha-encrypted': <Lock size={20} style={{ color: 'var(--warning)' }} />
  }
  return iconMap[ext || ''] || <File size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
}

export default function StoragePage() {
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<FileItem[]>([])
  const [drives, setDrives] = useState<DriveWithHealth[]>([])
  const [pool, setPool] = useState<ZfsPool | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [storageInfo, setStorageInfo] = useState<StorageOverview | null>(null)
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [scanning, setScanning] = useState(false)
  const [showSmartDetail, setShowSmartDetail] = useState<string | null>(null)

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const [filesRes, drivesRes, poolRes, infoRes] = await Promise.all([
        api.get(`/storage/files?path=${encodeURIComponent(currentPath)}&search=${encodeURIComponent(search)}`),
        api.get('/storage/drives'),
        api.get('/storage/pool'),
        api.get('/storage/status')
      ])
      setFiles(filesRes.data)
      setDrives(drivesRes.data)
      setPool(poolRes.data)
      setStorageInfo(infoRes.data)
      const sorted = [...(filesRes.data || [])].filter((f: FileItem) => f.type === 'file').sort((a, b) => b.modified - a.modified).slice(0, 15)
      setRecentFiles(sorted)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to load storage data', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentPath, search, addToast])

  useEffect(() => { loadFiles() }, [loadFiles])

  useEffect(() => {
    api.get('/favorites')
      .then(r => setFavorites(r.data.map((f: any) => f.file_path)))
      .catch(() => {})
  }, [])

  const navigate = (path: string) => setCurrentPath(path)
  const goUp = () => {
    const parent = currentPath.split('/').filter(Boolean).slice(0, -1).join('/')
    setCurrentPath('/' + parent)
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const form = new FormData()
    for (const f of e.target.files) form.append('file', f)
    try {
      await api.post(`/storage/files/upload?path=${encodeURIComponent(currentPath)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Files uploaded successfully', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Upload failed', 'error')
    }
  }

  const toggleFav = async (path: string) => {
    try {
      const r = await api.post('/favorites/toggle', { file_path: path })
      if (r.data.favorited) {
        setFavorites(prev => [...prev, path])
        addToast('Added to favorites', 'success')
      } else {
        setFavorites(prev => prev.filter(p => p !== path))
        addToast('Removed from favorites', 'info')
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to toggle favorite', 'error')
    }
  }

  const handleDelete = async (file: FileItem) => {
    try {
      await api.delete('/storage/files/delete', { data: { path: file.path } })
      addToast(`Deleted ${file.name}`, 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Delete failed', 'error')
    }
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await api.post('/storage/files/mkdir', { path: currentPath, name: newFolderName.trim() })
      addToast('Folder created', 'success')
      setNewFolderName(''); setShowNewFolder(false); loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create folder', 'error')
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return
    try {
      await api.put('/storage/files/rename', { path: renameTarget.path, new_name: renameValue.trim() })
      addToast('Renamed successfully', 'success')
      setRenameTarget(null); setRenameValue(''); loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Rename failed', 'error')
    }
  }

  const handlePreview = async (file: FileItem) => {
    if (file.type === 'directory') { navigate(file.path); return }
    setPreviewFile(file)
    try {
      const res = await api.get(`/storage/files/preview?path=${encodeURIComponent(file.path)}`)
      if (res.data.content) setPreviewContent(res.data.content)
      else setPreviewContent('(binary or empty file)')
    } catch {
      setPreviewContent('Preview not available for this file type')
    }
  }

  const scanDrives = async () => {
    setScanning(true)
    try {
      await api.post('/storage/drives/scan')
      addToast('Drive scan completed', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Scan failed', 'error')
    } finally {
      setScanning(false)
    }
  }

  const createPool = async () => {
    try {
      await api.post('/storage/pool/create')
      addToast('Storage pool created', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Pool creation failed', 'error')
    }
  }

  const handleEncrypt = async (file: FileItem) => {
    const pw = prompt('Enter encryption password:')
    if (!pw) return
    try {
      await api.post('/crypto/encrypt', { path: file.path, password: pw })
      addToast('File encrypted', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Encryption failed', 'error')
    }
  }

  const handleDecrypt = async (file: FileItem) => {
    const pw = prompt('Enter decryption password:')
    if (!pw) return
    try {
      await api.post('/crypto/decrypt', { path: file.path, password: pw })
      addToast('File decrypted', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Decryption failed', 'error')
    }
  }

  const unmountDrive = async (driveId: string) => {
    try {
      await api.post(`/storage/drives/unmount/${driveId}`)
      addToast('Drive safely removed', 'success')
      loadFiles()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to unmount drive', 'error')
    }
  }

  const smartHealthColor = (status?: string) => {
    if (status === 'healthy' || status === 'passed') return 'var(--success)'
    if (status === 'warning') return 'var(--warning)'
    if (status === 'failed' || status === 'critical') return 'var(--danger)'
    return 'var(--text-muted)'
  }

  const healthIcon = (health?: string) => {
    switch (health) {
      case 'healthy': case 'passed': return <Check size={14} style={{ color: 'var(--success)' }} />
      case 'warning': return <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
      case 'failed': case 'critical': return <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
      default: return <Activity size={14} style={{ color: 'var(--text-muted)' }} />
    }
  }

  const overviewData = useMemo(() => {
    if (!storageInfo) return null
    return {
      total: storageInfo.total,
      used: storageInfo.used,
      free: storageInfo.free,
      percent: storageInfo.percent,
      drives: storageInfo.drives || drives.length
    }
  }, [storageInfo, drives])

  const internalDrives = useMemo(() => drives.filter(d => !d.is_external), [drives])
  const externalDrives = useMemo(() => drives.filter(d => d.is_external), [drives])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Storage Overview */}
      {loading && !overviewData ? (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: 24, alignItems: 'center' }}>
          <Skeleton width={160} height={14} />
          <Skeleton width={200} height={6} borderRadius={3} />
          <Skeleton width={80} height={14} />
        </div>
      ) : overviewData && (
        <div className="glass-card" style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
          borderBottom: '2px solid rgba(99,102,241,0.2)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Storage Overview</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{formatSize(overviewData.used)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {formatSize(overviewData.total)}</span>
              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                {overviewData.drives} drive{overviewData.drives !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 240, minWidth: 100 }}>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${overviewData.percent}%`, height: '100%',
                background: overviewData.percent > 85
                  ? 'linear-gradient(90deg, var(--danger), #ff6b6b)'
                  : overviewData.percent > 60
                    ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                    : 'linear-gradient(90deg, var(--accent), #818cf8)',
                borderRadius: 4, transition: 'width 0.5s ease',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)', animation: 'skeleton 2s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>{overviewData.percent}% used</span>
              <span>{formatSize(overviewData.free)} free</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} title="Healthy drives" />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: drives.some(d => d.health === 'warning') ? 'var(--warning)' : 'rgba(255,255,255,0.08)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: drives.some(d => d.health === 'failed' || d.health === 'critical') ? 'var(--danger)' : 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card" style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        borderBottom: '1px solid rgba(99,102,241,0.1)'
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 8 }}>Quick Actions</span>
        <button className="btn btn-ghost btn-sm" onClick={scanDrives} disabled={scanning} style={{ fontSize: 12 }}>
          <Zap size={14} /> {scanning ? 'Scanning...' : 'Scan Drives'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={createPool} style={{ fontSize: 12 }}>
          <Server size={14} /> Create Pool
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          <Share2 size={14} /> SMB Share
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          <Activity size={14} /> SMART Check
        </button>
        <div style={{ flex: 1 }} />
        {pool?.exists && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={12} style={{ color: 'var(--accent)' }} />
            ZFS: {pool.name} ({pool.health})
            {pool.compression_ratio && <span style={{ color: 'var(--text-muted)' }}>· {pool.compression_ratio.toFixed(2)}x</span>}
          </span>
        )}
      </div>

      {/* Main Content: Drives + File Browser */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left Panel: Drives */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          {/* Internal Drives */}
          <div className="glass-card" style={{ padding: '12px 14px', overflow: 'auto', maxHeight: 300 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HardDrive size={12} /> Internal Drives ({internalDrives.length})
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map(i => <Skeleton key={i} height={40} borderRadius={8} />)}
              </div>
            ) : internalDrives.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No internal drives detected</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {internalDrives.map(d => (
                  <div key={d.id}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8,
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: expandedDrive === d.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                      onClick={() => setExpandedDrive(expandedDrive === d.id ? null : d.id)}
                    >
                      <HardDrive size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.device}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          {d.filesystem && <span>{d.filesystem}</span>}
                          {d.size ? <span>{formatSize(d.size)}</span> : null}
                          {d.mount_point && <span style={{ color: 'var(--text-secondary)' }}>{d.mount_point}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {d.health && healthIcon(d.health)}
                        {d.temp != null && (
                          <span style={{ fontSize: 10, color: d.temp > 55 ? 'var(--danger)' : d.temp > 45 ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Thermometer size={10} />
                            {d.temp}°C
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Expanded SMART data */}
                    {expandedDrive === d.id && (
                      <div style={{ padding: '6px 8px 6px 32px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3, background: 'rgba(255,255,255,0.02)', borderRadius: 6, marginTop: 2 }}>
                        {d.model && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Model</span><span>{d.model}</span></div>}
                        {d.serial && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Serial</span><span style={{ fontSize: 10 }}>{d.serial}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>SMART</span>
                          <span style={{ color: smartHealthColor(d.smart_status) }}>{d.smart_status || d.health || 'unknown'}</span>
                        </div>
                        {d.reallocated_sectors != null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Reallocated Sectors</span>
                            <span style={{ color: d.reallocated_sectors > 50 ? 'var(--danger)' : d.reallocated_sectors > 10 ? 'var(--warning)' : 'var(--text-secondary)' }}>{d.reallocated_sectors}</span>
                          </div>
                        )}
                        {d.pending_sectors != null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Pending Sectors</span>
                            <span style={{ color: d.pending_sectors > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{d.pending_sectors}</span>
                          </div>
                        )}
                        {d.power_on_hours != null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Power-on Hours</span>
                            <span>{d.power_on_hours.toLocaleString()}h</span>
                          </div>
                        )}
                        {d.rotational !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Type</span>
                            <span>{d.rotational ? 'HDD' : 'SSD'}</span>
                          </div>
                        )}
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                            onClick={(e) => { e.stopPropagation(); unmountDrive(d.id) }}>
                            Unmount
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Drives */}
          {externalDrives.length > 0 && (
            <div className="glass-card" style={{ padding: '12px 14px', overflow: 'auto', maxHeight: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={12} /> External Drives ({externalDrives.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {externalDrives.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <HardDrive size={14} style={{ color: 'var(--warning)' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.device}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{d.size ? formatSize(d.size) : '?'}</span>
                    {d.health && healthIcon(d.health)}
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => unmountDrive(d.id)} style={{ fontSize: 10, color: 'var(--text-muted)' }} title="Safely remove"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZFS Pool Info */}
          {pool?.exists && (
            <div className="glass-card" style={{ padding: '12px 14px', borderLeft: `3px solid ${pool.health === 'healthy' ? 'var(--success)' : 'var(--danger)'}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={12} /> ZFS Pool: {pool.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Health</span>
                  <span style={{ color: smartHealthColor(pool.health), display: 'flex', alignItems: 'center', gap: 4 }}>
                    {healthIcon(pool.health)} {pool.health}
                  </span>
                </div>
                {pool.size && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Capacity</span>
                    <span>{formatSize(pool.used || 0)} / {formatSize(pool.size)}</span>
                  </div>
                )}
                {pool.compression_ratio != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Compression</span>
                    <span>{pool.compression_ratio.toFixed(2)}x</span>
                  </div>
                )}
                {pool.scrub && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Scrub</span>
                    <span style={{ color: pool.scrub.status === 'scanning' ? 'var(--warning)' : 'var(--text-secondary)' }}>
                      {pool.scrub.status || 'idle'}
                      {pool.scrub.errors ? ` · ${pool.scrub.errors} err` : ''}
                    </span>
                  </div>
                )}
                {pool.errors && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10, color: 'var(--text-muted)' }}>
                    {pool.errors.read != null && <span>R: {pool.errors.read}</span>}
                    {pool.errors.write != null && <span>W: {pool.errors.write}</span>}
                    {pool.errors.checksum != null && <span>C: {pool.errors.checksum}</span>}
                  </div>
                )}
                {pool.vdevs && pool.vdevs.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>VDEVs</span>
                    {pool.vdevs.map((v, i) => (
                      <div key={i} style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', paddingLeft: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{v.type}: {v.devices?.length} devices</span>
                        <span style={{ color: smartHealthColor(v.health) }}>{v.health}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Recent Files */}
          <div className="glass-card" style={{ padding: '12px 14px', overflow: 'auto', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> Recent Files
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height={24} borderRadius={6} />)}
              </div>
            ) : recentFiles.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No recent files</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentFiles.map(f => (
                  <div key={f.path} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6,
                    cursor: 'pointer', fontSize: 11, transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onDoubleClick={() => handlePreview(f)}
                  >
                    <File size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>{timeAgo(f.modified)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: File Browser */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* Toolbar */}
          <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 2 }}>
              <button className={`btn btn-ghost btn-sm btn-icon ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><Grid size={16} /></button>
              <button className={`btn btn-ghost btn-sm btn-icon ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={16} /></button>
            </div>

            <div style={{ flex: 1, maxWidth: 320, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                style={{ paddingLeft: 32, height: 34, fontSize: 13, width: '100%' }}
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ flex: 1 }} />

            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(!showNewFolder)} style={{ fontSize: 12 }}>
              <FolderPlus size={14} /> New Folder
            </button>
            <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', fontSize: 12 }}>
              <Upload size={14} /> Upload
              <input type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
            </label>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={loadFiles} title="Refresh"><RefreshCw size={16} /></button>
          </div>

          {showNewFolder && (
            <div className="glass-card" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px' }}>
              <input style={{ height: 34, fontSize: 13, flex: 1, maxWidth: 300 }} placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNewFolder()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={handleNewFolder}>Create</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Cancel</button>
            </div>
          )}

          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ padding: '4px 8px' }}>Root</button>
            {currentPath !== '/' && (
              <button className="btn btn-ghost btn-sm btn-icon" onClick={goUp}><ArrowLeft size={14} /></button>
            )}
            {breadcrumbs.map((part, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/' + breadcrumbs.slice(0, i + 1).join('/'))} style={{ padding: '4px 8px' }}>{part}</button>
              </React.Fragment>
            ))}
          </div>

          {/* File Grid/List */}
          {loading && files.length === 0 ? (
            view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass-card" style={{ padding: 12, textAlign: 'center' }}>
                    <Skeleton width={32} height={32} borderRadius={8} style={{ margin: '0 auto 8px' }} />
                    <Skeleton width="80%" height={12} style={{ margin: '0 auto 4px' }} />
                    <Skeleton width="50%" height={10} style={{ margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px auto 1fr 100px 160px 80px', gap: 8, padding: '8px 12px', alignItems: 'center' }}>
                    <Skeleton width={12} height={12} borderRadius={4} />
                    <Skeleton width={20} height={20} borderRadius={4} />
                    <Skeleton width="60%" height={14} />
                    <Skeleton width={60} height={14} />
                    <Skeleton width={100} height={14} />
                    <Skeleton width={50} height={14} />
                  </div>
                ))}
              </div>
            )
          ) : files.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <Folder size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Empty folder</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload files or create a folder</p>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {files.map(f => (
                <div key={f.path} className="glass-card" style={{
                  padding: 12, cursor: 'pointer', textAlign: 'center', position: 'relative',
                  transition: 'all 0.15s ease', border: '1px solid transparent'
                }}
                  onDoubleClick={() => handlePreview(f)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'transparent'}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{
                    position: 'absolute', top: 4, right: 4, color: favorites.includes(f.path) ? 'var(--warning)' : 'var(--text-muted)',
                    opacity: favorites.includes(f.path) ? 1 : 0.4, transition: 'opacity 0.15s'
                  }}
                    onClick={e => { e.stopPropagation(); toggleFav(f.path) }}>
                    <Star size={12} fill={favorites.includes(f.path) ? 'var(--warning)' : 'none'} />
                  </button>
                  <div style={{ fontSize: 36, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <FileIcon ext={f.ext} type={f.type} />
                  </div>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.type === 'directory' ? 'Folder' : formatSize(f.size)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '24px auto 1fr 100px 160px 80px', gap: 8, padding: '8px 12px',
                fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px 8px 0 0'
              }}>
                <span /><span /><span>Name</span><span>Size</span><span>Modified</span><span />
              </div>
              {files.map((f, idx) => (
                <div key={f.path} style={{
                  display: 'grid', gridTemplateColumns: '24px auto 1fr 100px 160px 80px', gap: 8, padding: '8px 12px',
                  alignItems: 'center', cursor: 'pointer', borderRadius: 4, transition: 'background 0.12s',
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                }}
                  onDoubleClick={() => handlePreview(f)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: favorites.includes(f.path) ? 'var(--warning)' : 'var(--text-muted)', opacity: favorites.includes(f.path) ? 1 : 0.4 }}
                    onClick={e => { e.stopPropagation(); toggleFav(f.path) }}>
                    <Star size={12} fill={favorites.includes(f.path) ? 'var(--warning)' : 'none'} />
                  </button>
                  <FileIcon ext={f.ext} type={f.type} />
                  {renameTarget?.path === f.path ? (
                    <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={() => setRenameTarget(null)} autoFocus style={{ height: 28, fontSize: 13 }} />
                  ) : (
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.type === 'directory' ? '-' : formatSize(f.size)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(f.modified)}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setRenameTarget(f); setRenameValue(f.name) }}><Edit3 size={12} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(f) }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File count */}
          {!loading && files.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', padding: '4px 8px' }}>
              {files.length} item{files.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 40 }}
          onClick={() => setPreviewFile(null)}>
          <div className="glass" style={{
            maxWidth: 720, width: '100%', maxHeight: '80vh', overflow: 'hidden', padding: 0,
            borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileIcon ext={previewFile.ext} type={previewFile.type} />
                <h3 style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewFile.name}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{formatSize(previewFile.size)}</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPreviewFile(null)}><X size={18} /></button>
            </div>
            <pre style={{
              fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 'calc(80vh - 80px)', overflow: 'auto',
              color: 'var(--text-secondary)', padding: 20, margin: 0,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: 1.6
            }}>{previewContent}</pre>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: 10, padding: 4, zIndex: 1000, minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)'
        }} onClick={() => setContextMenu(null)}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
            onClick={() => { handlePreview(contextMenu.file); setContextMenu(null) }}>
            {contextMenu.file.type === 'directory' ? 'Open' : 'Preview'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
            onClick={() => { setRenameTarget(contextMenu.file); setRenameValue(contextMenu.file.name); setContextMenu(null) }}>
            <Edit3 size={14} style={{ marginRight: 6 }} /> Rename
          </button>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
            onClick={() => { toggleFav(contextMenu.file.path); setContextMenu(null) }}>
            <Star size={14} style={{ marginRight: 6 }} /> {favorites.includes(contextMenu.file.path) ? 'Remove from' : 'Add to'} Favorites
          </button>
          {contextMenu.file.type === 'file' && (
            <>
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
              {contextMenu.file.name.endsWith('.alpha-encrypted') ? (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
                  onClick={() => { handleDecrypt(contextMenu.file); setContextMenu(null) }}>
                  <Unlock size={14} style={{ marginRight: 6 }} /> Decrypt
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
                  onClick={() => { handleEncrypt(contextMenu.file); setContextMenu(null) }}>
                  <Lock size={14} style={{ marginRight: 6 }} /> Encrypt
                </button>
              )}
            </>
          )}
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px', color: 'var(--danger)' }}
            onClick={() => { handleDelete(contextMenu.file); setContextMenu(null) }}>
            <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
          </button>
        </div>
      )}

      {/* Click away for context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setContextMenu(null)} />
      )}
    </div>
  )
}
