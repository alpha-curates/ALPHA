import React, { useEffect, useState } from 'react'
import { X, PartyPopper, Info, AlertTriangle, Gift } from 'lucide-react'

interface PopupData {
  id: string
  title: string
  message: string
  type: string
  created_at: string
}

const typeConfig: Record<string, { icon: React.ReactNode; gradient: string; border: string }> = {
  info: {
    icon: <Info size={24} />,
    gradient: 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(108,92,231,0.02))',
    border: 'var(--accent)',
  },
  celebration: {
    icon: <PartyPopper size={24} />,
    gradient: 'linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,170,0,0.02))',
    border: 'var(--warning)',
  },
  holiday: {
    icon: <Gift size={24} />,
    gradient: 'linear-gradient(135deg, rgba(0,214,143,0.1), rgba(0,214,143,0.02))',
    border: 'var(--success)',
  },
  alert: {
    icon: <AlertTriangle size={24} />,
    gradient: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(255,107,107,0.02))',
    border: 'var(--danger)',
  },
}

export default function PopupModal() {
  const [popups, setPopups] = useState<PopupData[]>([])
  const [current, setCurrent] = useState<number>(0)

  useEffect(() => {
    fetch('/api/popups/pending', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => setPopups(data))
      .catch(() => {})
  }, [])

  if (popups.length === 0 || current >= popups.length) return null

  const p = popups[current]
  const cfg = typeConfig[p.type] || typeConfig.info

  const dismiss = async () => {
    await fetch(`/api/popups/${p.id}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    if (current < popups.length - 1) {
      setCurrent(current + 1)
    } else {
      setPopups([])
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: 'var(--bg-secondary)',
        border: `1px solid ${cfg.border}`,
        borderRadius: 20,
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${cfg.border}22`,
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease'
      }}>
        <div style={{
          padding: '32px 32px 24px',
          background: cfg.gradient,
          textAlign: 'center'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `${cfg.border}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: cfg.border
          }}>
            {cfg.icon}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{p.title}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {p.message}
          </p>
        </div>
        <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className="btn btn-primary" onClick={dismiss} style={{ minWidth: 120, justifyContent: 'center' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
