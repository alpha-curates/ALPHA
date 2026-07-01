import React, { useState, useCallback } from 'react'
import { Sparkles, X, Brain, Zap, Palette, Cpu, Wifi, TrendingUp, Shield, Activity, Globe, Star, Heart } from 'lucide-react'
import api from '../../utils/api'
import { DashboardWidget, AIProvider } from '../../types'
import { VIRTUAL_PROVIDERS } from '../../data/aiModels'

const VIRTUAL_FALLBACK = VIRTUAL_PROVIDERS.length > 0 ? {
  id: VIRTUAL_PROVIDERS[0].id, name: VIRTUAL_PROVIDERS[0].name,
  type: VIRTUAL_PROVIDERS[0].type, api_url: VIRTUAL_PROVIDERS[0].api_url,
  api_key: VIRTUAL_PROVIDERS[0].api_key,
  default_model: VIRTUAL_PROVIDERS[0].default_model, enabled: true,
} : null'

const PRESET_PROMPTS = [
  { label: 'System', icon: Cpu, prompt: 'CPU load, memory usage, temperature, processes, uptime, disk I/O' },
  { label: 'Network', icon: Wifi, prompt: 'bandwidth, latency, packets, connections, DNS, WiFi signal' },
  { label: 'Performance', icon: TrendingUp, prompt: 'IOPS, cache hit rate, throughput, response time, queue depth' },
  { label: 'Security', icon: Shield, prompt: 'failed logins, firewall hits, SSL expiry, open ports, threats' },
  { label: 'Creative', icon: Star, prompt: 'fun stats, motivational metrics, creative visualizations' },
  { label: 'Custom', icon: Activity, prompt: '' },
]

const COLORS = ['#6c5ce7','#3b82f6','#10b981','#f59e0b','#ec4899','#14b8a6','#ef4444','#f43f5e','#d97709','#06b6d4','#4f46e5','#d946ef','#ff6b6b','#00d2d3','#0984e3','#27ae60','#a29bfe']

function parseWidgets(text: string): DashboardWidget[] {
  const lines = text.split('\n').filter(l => l.trim())
  const widgets: DashboardWidget[] = []
  for (const line of lines) {
    const clean = line.replace(/^[-*\d.\])]\s*/, '').trim()
    const parts = clean.split('|').map(p => p.trim())
    if (parts.length >= 3) {
      widgets.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'ai',
        title: parts[0],
        value: parts[1],
        subtitle: parts[2],
        icon: 'zap',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        source: 'ai',
      })
    }
  }
  return widgets
}

interface Props {
  providers: AIProvider[]
  onGenerate: (widgets: DashboardWidget[]) => void
  onClose: () => void
}

const VIRTUAL_IDS = new Set(VIRTUAL_PROVIDERS.map(vp => vp.id))
const CLOUD_TYPES = new Set(['openai', 'gemini', 'claude', 'groq', 'huggingface', 'cloudflare', 'opencode'])

function isCloudProvider(p: AIProvider): boolean {
  return VIRTUAL_IDS.has(p.id) || CLOUD_TYPES.has(p.type)
}

function findBestProvider(providers: AIProvider[]): AIProvider | undefined {
  if (!providers.length) return undefined
  for (const p of providers) {
    if (VIRTUAL_IDS.has(p.id)) return p
  }
  for (const p of providers) {
    if (CLOUD_TYPES.has(p.type)) return p
  }
  return providers[0]
}

export default function AIWidgetGenerator({ providers, onGenerate, onClose }: Props) {
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(50)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [providerId, setProviderId] = useState('')
  const [error, setError] = useState('')

  const activeProvider = providers.find(p => p.id === providerId) || findBestProvider(providers) || VIRTUAL_FALLBACK

  const handleGenerate = useCallback(async () => {
    if (!activeProvider) { setError('No AI provider configured. Go to AI Studio to set one up.'); return }
    if (!prompt.trim()) { setError('Please describe what kind of widgets you want'); return }
    setGenerating(true)
    setError('')
    setProgress('Analyzing prompt...')

    try {
      const systemMsg = `You are a dashboard widget generator. Generate exactly ${count} widgets as a list. Each line must be: Title | Value | Description. The title is short, value is a metric, description explains it. Use real-looking data. Theme: ${prompt}`

      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          message: `Generate ${count} dashboard widgets about: ${prompt}. Format each line as: Widget Name | Value | Short Description`,
          model: activeProvider.default_model || 'llama3.2:1b',
          provider_id: activeProvider.id,
          provider_type: activeProvider.type,
          provider_api_url: activeProvider.api_url,
          provider_api_key: activeProvider.api_key,
          system_prompt: systemMsg,
        }),
      })

      if (!res.ok) throw new Error('API request failed')
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      let fullText = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.token) fullText += data.token
              if (data.done) break
            } catch {}
          }
        }
        setProgress(`Generating... ${fullText.split('\n').length} widgets so far`)
      }

      const widgets = parseWidgets(fullText)
      if (widgets.length === 0) {
        const fallback: DashboardWidget[] = Array.from({ length: Math.min(count, 20) }, (_, i) => ({
          id: `ai-${Date.now()}-${i}`,
          type: 'ai',
          title: `${prompt.split(' ')[0] || 'Metric'} ${i + 1}`,
          value: `${Math.floor(Math.random() * 100)}%`,
          subtitle: `AI-generated from "${prompt.slice(0, 30)}"`,
          icon: 'zap',
          color: COLORS[i % COLORS.length],
          source: 'ai',
        }))
        onGenerate(fallback)
      } else {
        onGenerate(widgets)
      }
    } catch (e: any) {
      setError(e.message || 'Generation failed')
    }
    setGenerating(false)
    setProgress('')
  }, [prompt, count, activeProvider, onGenerate])

  return (
    <div className="widget-gen-panel" style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="widget-gen-header">
          <div className="widget-gen-icon"><Sparkles /></div>
          <div>
            <div className="widget-gen-title">AI Widget Generator</div>
            <div className="widget-gen-sub">AI generates widgets based on your description</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="widget-gen-input-row">
        <input
          placeholder="Describe the widgets you want..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />
      </div>

      <div className="widget-gen-presets">
        {PRESET_PROMPTS.map(p => (
          <button key={p.label} className="widget-gen-preset"
            onClick={() => setPrompt(p.prompt)}
            style={{
              background: prompt === p.prompt ? 'var(--accent-dim)' : undefined,
              borderColor: prompt === p.prompt ? 'var(--accent-dim)' : undefined,
              color: prompt === p.prompt ? 'var(--accent)' : undefined,
            }}>
            <p.icon size={12} /> {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Count:
          <input type="number" min={1} max={100000}
            value={count} onChange={e => setCount(Math.min(100000, Math.max(1, parseInt(e.target.value) || 1)))}
            style={{ width: 80, height: 36, textAlign: 'center', fontSize: 13 }} />
        </div>
        {providers.length > 0 ? (
          <select value={activeProvider?.id || ''}
            onChange={e => setProviderId(e.target.value)}
            style={{ width: 240, height: 36, fontSize: 13 }}>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type}) [{isCloudProvider(p) ? 'Cloud' : 'Local'}]
              </option>
            ))}
          </select>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--danger)', padding: '6px 10px', background: 'var(--danger-dim)', borderRadius: 6 }}>
            No AI provider configured. Go to AI Studio to set one up.
          </div>
        )}
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger-dim)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={generating || !activeProvider}
          style={{ flex: 1, justifyContent: 'center' }}>
          {generating ? <><span className="spin">⟳</span> Generating... {progress}</> : <><Brain size={16} /> Generate {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count} AI Widgets</>}
        </button>
      </div>

      {generating && <div className="widget-gen-progress"><div className="fill" style={{ width: '100%', animation: 'skeleton 1.5s ease-in-out infinite' }} /></div>}
    </div>
  )
}
