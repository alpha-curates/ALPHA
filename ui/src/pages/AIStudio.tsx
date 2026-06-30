import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Brain, Send, Trash2, MessageSquare, Plus, X,
  Cpu, FileCode, Github, FileSearch, Activity, Settings,
  ChevronDown, Bot, Globe, Zap, Paperclip, Save,
  Edit3, Check, Download, PanelLeftClose, PanelLeft,
  BookOpen, Sparkles, Image as ImageIcon, FolderOpen, Terminal,
  Link, Loader2, Palette, ExternalLink
} from 'lucide-react'
import {
  OPENCODE_MODELS, KEYLESSAI_MODELS, GROQ_MODELS,
  HUGGINGFACE_MODELS, CLOUDFLARE_MODELS,
  OPENAI_MODELS, GEMINI_MODELS, CLAUDE_MODELS,
  VIRTUAL_PROVIDERS, PROVIDER_TYPES
} from '../data/aiModels'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../utils/api'
import { ChatMsg } from '../types'

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  ollama: <Bot size={14} />, openai: <Zap size={14} />,
  gemini: <Globe size={14} />, claude: <Brain size={14} />,
}

const PROVIDER_COLORS: Record<string, string> = {
  ollama: 'var(--accent)', openai: 'var(--success)',
  gemini: 'var(--warning)', claude: 'var(--info)',
}

const AI_AGENTS = [
  { id: 'general', name: 'General', icon: Brain, color: 'var(--accent)',
    prompt: 'You are a helpful AI assistant. Respond conversationally and helpfully.' },
  { id: 'coding', name: 'Coding', icon: FileCode, color: 'var(--success)',
    prompt: 'You are an expert programmer. Write clean, well-structured code with explanations. Always include code examples when relevant.' },
  { id: 'sysadmin', name: 'Sys Admin', icon: Activity, color: 'var(--warning)',
    prompt: 'You are a Linux system administrator expert. Help diagnose issues, suggest commands, and explain system concepts clearly.' },
  { id: 'creative', name: 'Creative', icon: Sparkles, color: 'var(--info)',
    prompt: 'You are a creative writing assistant. Help with brainstorming, drafting, editing, and refining creative content.' },
  { id: 'analyst', name: 'Analyst', icon: FileSearch, color: 'var(--danger)',
    prompt: 'You are a data and file analysis expert. Analyze information thoroughly, identify patterns, and provide actionable insights.' },
]

const CMD_LIST = [
  { cmd: 'help', desc: 'Show all commands' },
  { cmd: 'system', desc: 'CPU, memory, system status' },
  { cmd: 'memory', desc: 'RAM usage details' },
  { cmd: 'storage', desc: 'Disk usage' },
  { cmd: 'temperature', desc: 'CPU temperature' },
  { cmd: 'processes', desc: 'Top processes' },
  { cmd: 'uptime', desc: 'Server uptime' },
  { cmd: 'restart', desc: 'Restart AlphaNAS' },
  { cmd: 'clear', desc: 'Clear conversation' },
]

const IMAGE_STYLES = [
  { id: 'realistic', name: 'Realistic' },
  { id: 'anime', name: 'Anime' },
  { id: 'digital-art', name: 'Digital Art' },
  { id: 'oil-painting', name: 'Oil Painting' },
  { id: 'watercolor', name: 'Watercolor' },
  { id: 'sketch', name: 'Sketch' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: '3d-render', name: '3D Render' },
]

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content" style={{ fontSize: 14, lineHeight: 1.6 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function AIStudio() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [showCmdMenu, setShowCmdMenu] = useState(false)
  const [cmdFilter, setCmdFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [providers, setProviders] = useState<any[]>([])
  const [activeProvider, setActiveProvider] = useState<any>(null)
  const [activeModel, setActiveModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const chatEnd = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [activeAgent, setActiveAgent] = useState('general')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [backendAvail, setBackendAvail] = useState(true)

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [showProviders, setShowProviders] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [showCmdToolbar, setShowCmdToolbar] = useState(false)

  const lsConvKey = 'visionhub_conversations'

  const saveConvsToLS = (convs: any[]) => {
    try { localStorage.setItem(lsConvKey, JSON.stringify(convs)) } catch {}
  }

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.get('/ai/conversations')
      setConversations(r.data)
      saveConvsToLS(r.data)
      setBackendAvail(true)
    } catch {
      try {
        const stored = localStorage.getItem(lsConvKey)
        if (stored) setConversations(JSON.parse(stored))
      } catch {}
    }
  }, [])

  const loadMessages = useCallback(async (convId?: string) => {
    if (convId) {
      try {
        const stored = localStorage.getItem(`visionhub_msgs_${convId}`)
        if (stored) { setMessages(JSON.parse(stored)); return }
      } catch {}
    }
    try {
      const params = convId ? `?conversation_id=${convId}` : ''
      const r = await api.get(`/ai/history${params}`)
      setMessages(r.data)
    } catch { setMessages([]) }
  }, [])

  const saveMessagesToLS = (convId: string, msgs: any[]) => {
    try { localStorage.setItem(`visionhub_msgs_${convId}`, JSON.stringify(msgs)) } catch {}
  }

  const switchConversation = async (conv: any) => {
    abortRef.current?.abort()
    setActiveConv(conv)
    const sp = conv?.system_prompt || ''
    setSystemPrompt(sp)
    const match = AI_AGENTS.find(a => a.prompt === sp)
    if (match) setActiveAgent(match.id)
    else setActiveAgent('general')
    await loadMessages(conv?.id)
    setShowProviderDropdown(false)
  }

  const newConversation = async () => {
    abortRef.current?.abort()
    const id = 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const conv = { id, title: 'New Chat', system_prompt: '', message_count: 0, created_at: new Date().toISOString() }
    setActiveConv(conv)
    setMessages([])
    setSystemPrompt('')
    setStreamingText('')
    setActiveAgent('general')
    try {
      const r = await api.post('/ai/conversations', { title: 'New Chat' })
      conv.id = r.data.id; conv.title = r.data.title
    } catch {
      setConversations(prev => {
        const next = [conv, ...prev]
        saveConvsToLS(next)
        return next
      })
    }
    loadConversations()
  }

  const deleteConversation = async (id: string) => {
    if (!confirm('Delete this conversation and all messages?')) return
    try {
      await api.delete(`/ai/conversations/${id}`)
    } catch {}
    try { localStorage.removeItem(`visionhub_msgs_${id}`) } catch {}
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      saveConvsToLS(next)
      return next
    })
    if (activeConv?.id === id) {
      setActiveConv(null)
      setMessages([])
    }
  }

  const renameConversation = async (id: string, title: string) => {
    try {
      await api.put(`/ai/conversations/${id}`, { title })
    } catch {}
    setEditingConvId(null)
    setConversations(prev => {
      const next = prev.map(c => c.id === id ? { ...c, title } : c)
      saveConvsToLS(next)
      return next
    })
    if (activeConv?.id === id) setActiveConv({ ...activeConv, title })
  }

  const updateSystemPrompt = async (prompt?: string) => {
    if (!activeConv) return
    const sp = prompt !== undefined ? prompt : systemPrompt
    try {
      await api.put(`/ai/conversations/${activeConv.id}`, { system_prompt: sp })
    } catch {}
    setShowSystemPrompt(false)
  }

  const selectAgent = (agentId: string) => {
    const agent = AI_AGENTS.find(a => a.id === agentId)
    if (!agent) return
    setActiveAgent(agentId)
    setSystemPrompt(agent.prompt)
    if (activeConv) {
      try { api.put(`/ai/conversations/${activeConv.id}`, { system_prompt: agent.prompt }) } catch {}
    }
    setShowAgentMenu(false)
  }

  useEffect(() => {
    loadConversations()
    loadMessages()
  }, [loadConversations, loadMessages])

  useEffect(() => {
    api.get('/ai/attachments').then(r => setPendingAttachments(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) { chatEnd.current?.scrollIntoView({ behavior: 'auto' }); return }
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (isNearBottom) chatEnd.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, streamingText])

  const selectProvider = (p: any, model: string) => {
    setActiveProvider({ id: p.id, name: p.name, type: p.type, model })
    setActiveModel(model)
    setShowProviderDropdown(false)
  }

  const callProviderDirect = async (msgText: string, provider: any, model: string, signal: AbortSignal) => {
    const apiUrl = provider?.api_url
    const apiKey = provider?.api_key
    if (!apiUrl) throw new Error('No API URL configured for this provider')

    const isOpenAICompat = provider?.type === 'openai'
    const body = isOpenAICompat ? {
      model: model || provider?.default_model || 'big-pickle',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: msgText }
      ],
      stream: true, max_tokens: 4096
    } : { message: msgText, model, stream: true }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey && apiKey !== 'not-needed') headers['Authorization'] = `Bearer ${apiKey}`

    const res = await fetch(apiUrl + '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(body), signal
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No reader')

    let fullText = ''
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') break
          try {
            const data = JSON.parse(dataStr)
            const token = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || ''
            if (token) { fullText += token; setStreamingText(fullText) }
          } catch {}
        }
      }
    }
    return fullText
  }

  const sendMessage = async (text?: string) => {
    const msgText = text || input
    if (!msgText.trim() || loading) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    if (!activeConv) {
      const id = 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      const conv = { id, title: msgText.trim().slice(0, 50), system_prompt: systemPrompt, message_count: 0, created_at: new Date().toISOString() }
      setActiveConv(conv)
      try {
        const r = await api.post('/ai/conversations', { title: msgText.trim().slice(0, 50), system_prompt: systemPrompt })
        conv.id = r.data.id; conv.title = r.data.title
      } catch {
        setConversations(prev => {
          const next = [conv, ...prev]
          saveConvsToLS(next)
          return next
        })
      }
    }

    setLoading(true)
    const userMsg: ChatMsg = {
      id: 'temp-' + Date.now(), role: 'user', content: msgText,
      model: activeModel, created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setInput(''); setStreamingText('')
    const convId = activeConv?.id || ''
    let fullText = ''

    try {
      if (backendAvail) {
        const res = await fetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            message: msgText, model: activeModel,
            provider_id: activeProvider?.id,
            provider_type: activeProvider?.type,
            provider_api_url: activeProvider?.api_url,
            provider_api_key: activeProvider?.api_key,
            conversation_id: convId
          }),
          signal: abortRef.current.signal
        })

        if (!res.ok) throw new Error('Backend stream failed')
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No reader')

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
                if (data.token) { fullText += data.token; setStreamingText(fullText) }
                if (data.done) break
                if (data.error) throw new Error(data.error)
              } catch {}
            }
          }
        }
      } else {
        if (activeProvider?.api_url) {
          fullText = await callProviderDirect(msgText, activeProvider, activeModel, abortRef.current.signal)
        } else {
          throw new Error('No provider configured. Add an API key in Provider settings.')
        }
      }

      if (fullText) {
        const respMsg: ChatMsg = {
          id: 'resp-' + Date.now(), role: 'assistant',
          content: fullText, model: activeModel,
          created_at: new Date().toISOString()
        }
        setMessages(prev => {
          const next = [...prev, respMsg]
          if (convId) saveMessagesToLS(convId, next)
          return next
        })
        setStreamingText('')
        loadConversations()
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errMsg = e.message || 'Connection error'
        setMessages(prev => {
          const next = [...prev, {
            id: 'err-' + Date.now(), role: 'assistant',
            content: errMsg,
            model: activeModel, created_at: new Date().toISOString()
          }]
          if (convId) saveMessagesToLS(convId, next)
          return next
        })
      }
      setStreamingText('')
    }
    setLoading(false)
  }

  const loadStatusAndProviders = useCallback(async () => {
    try {
      const [statusRes, provRes, histRes, modelsRes] = await Promise.all([
        api.get('/ai/status'),
        api.get('/ai/providers'),
        api.get('/ai/history'),
        api.get('/ai/models')
      ])
      setBackendAvail(true)
      let provs = provRes.data || []
      const ollamaOnline = statusRes.data?.ollama === true
      if (provs.length === 0) {
        const remoteModels = modelsRes.data?.remote || []
        const ollamaModels = remoteModels.length > 0
          ? remoteModels.map((m: any) => m.name)
          : ['llama3.2:1b', 'llama3.2:3b', 'llama3.1:8b', 'mistral:7b', 'codellama:7b', 'gemma4:e2b']
        if (ollamaOnline) {
          provs.push({ id: '__ollama__', name: 'Ollama (local)', type: 'ollama', default_model: ollamaModels[0] || 'llama3.2:1b', models: ollamaModels })
        }
        for (const vp of VIRTUAL_PROVIDERS) {
          provs.push({ ...vp })
        }
      }
      setProviders(provs)
      if (!activeProvider && provs.length > 0) {
        setActiveProvider(provs[0])
        setActiveModel(provs[0].default_model || provs[0].models[0])
      }
      if (histRes.data?.length) setMessages(histRes.data)
    } catch {
      setBackendAvail(false)
      const provs = VIRTUAL_PROVIDERS.map(vp => ({ ...vp }))
      try {
        const custom = JSON.parse(localStorage.getItem('visionhub_custom_providers') || '[]')
        if (custom.length) provs.push(...custom)
      } catch {}
      setProviders(provs)
      if (!activeProvider && provs.length > 0) {
        setActiveProvider(provs[0])
        setActiveModel(provs[0].default_model || provs[0].models[0])
      }
    }
  }, [])

  useEffect(() => { loadStatusAndProviders() }, [loadStatusAndProviders])

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAttachments(prev => [...prev, res.data])
    } catch {}
    if (fileInput.current) fileInput.current.value = ''
  }

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id))

  const fmtSize = (b: number) => {
    if (!b) return '0B'
    const u = ['B', 'KB', 'MB']; let i = 0; let s = b
    while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
    return `${s.toFixed(0)}${u[i]}`
  }

  const currentStreaming = streamingText

  const addToolMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: 'tool-' + Date.now(), role: 'assistant',
      content, model: activeProvider?.name || 'Tool',
      created_at: new Date().toISOString()
    }])
  }

  const toggleTool = (tool: string) => {
    setActiveTool(activeTool === tool ? null : tool)
    setShowToolsMenu(false)
  }

  const tools = [
    { id: 'github', label: 'GitHub Intel', icon: Github },
    { id: 'file-intel', label: 'File Analysis', icon: FileSearch },
    { id: 'system', label: 'System Assistant', icon: Terminal },
    { id: 'generate', label: 'Code Generation', icon: FileCode },
    { id: 'generate-image', label: 'Generate Images', icon: ImageIcon },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 0, flexShrink: 0, transition: 'width 0.2s',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0
      }}>
        <div className="glass-card" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="btn btn-primary btn-sm" onClick={newConversation} style={{ justifyContent: 'center', marginBottom: 4 }}>
            <Plus size={14} /> New Chat
          </button>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {conversations.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px',
                borderRadius: 6, cursor: 'pointer', fontSize: 12,
                background: activeConv?.id === c.id ? 'var(--accent-dim)' : 'transparent',
                color: activeConv?.id === c.id ? 'var(--accent)' : 'var(--text-secondary)'
              }}>
                <MessageSquare size={12} style={{ flexShrink: 0 }} />
                {editingConvId === c.id ? (
                  <input value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && renameConversation(c.id, editingTitle)}
                    onBlur={() => setEditingConvId(null)}
                    autoFocus style={{ flex: 1, height: 22, fontSize: 11 }} />
                ) : (
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={() => switchConversation(c)}
                    onDoubleClick={() => { setEditingConvId(c.id); setEditingTitle(c.title) }}>
                    {c.title}
                  </div>
                )}
                {activeConv?.id === c.id && (
                  <button className="btn btn-ghost btn-icon" style={{ padding: 2, flexShrink: 0 }}
                    onClick={() => deleteConversation(c.id)}>
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {activeProvider && (
          <div className="glass-card" style={{ padding: '8px 10px', fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: PROVIDER_COLORS[activeProvider.type] || 'var(--accent)' }}>
                {PROVIDER_ICONS[activeProvider.type] || <Bot size={14} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 12 }}>{activeProvider.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{activeModel || activeProvider.model}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div className="glass-card" style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className={`btn btn-ghost btn-sm ${showProviders ? 'active' : ''}`}
            onClick={() => setShowProviders(!showProviders)}
            style={{ justifyContent: 'flex-start', background: showProviders ? 'var(--accent-dim)' : 'transparent', fontSize: 12 }}>
            <Cpu size={13} /> Manage Providers
          </button>
        </div>
      </div>

      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ alignSelf: 'flex-start', flexShrink: 0, marginTop: 2 }}>
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
      </button>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, minWidth: 0 }}>
        {/* System prompt bar */}
        {activeConv && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
            <button className={`btn btn-ghost btn-sm ${showSystemPrompt ? 'active' : ''}`}
              onClick={() => { if (showSystemPrompt) updateSystemPrompt(); setShowSystemPrompt(!showSystemPrompt) }}
              style={{ fontSize: 11 }}>
              <BookOpen size={12} /> {showSystemPrompt ? 'Save Prompt' : 'System Prompt'}
            </button>
            {systemPrompt && !showSystemPrompt && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{systemPrompt.slice(0, 60)}{systemPrompt.length > 60 ? '...' : ''}"
              </span>
            )}
          </div>
        )}
        {showSystemPrompt && (
          <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful AI assistant..."
            style={{ width: '100%', height: 60, fontSize: 12, resize: 'vertical' }} />
        )}

        {/* Messages */}
        <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && !streamingText && !activeTool && (
            <div className="empty-state" style={{ flex: 1 }}>
              <Sparkles size={48} />
              <h3>AI Studio</h3>
              <p style={{ fontSize: 13 }}>Chat with AI — use the toolbar below for tools, commands, and agents</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{
              display: 'flex', gap: 10, padding: '10px 14px',
              background: m.role === 'assistant' ? 'rgba(108,92,231,0.04)' : 'transparent',
              borderRadius: 12, border: '1px solid var(--glass-border)'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: m.role === 'assistant' ? 'var(--accent-dim)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {m.role === 'assistant' ? <Brain size={14} /> : <MessageSquare size={14} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', gap: 8 }}>
                  <span>{m.role === 'assistant' ? 'ALPHA AI' : 'You'}</span>
                  {m.model && <span style={{ opacity: 0.6 }}>· {m.model}</span>}
                </div>
                {m.role === 'assistant' ? (
                  <MarkdownContent content={m.content} />
                ) : (
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                )}
              </div>
            </div>
          ))}
          {currentStreaming && (
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px',
              background: 'rgba(108,92,231,0.04)', borderRadius: 12,
              border: '1px solid var(--glass-border)'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Brain size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>ALPHA AI</div>
                <MarkdownContent content={currentStreaming} />
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {/* Inline tool panels */}
        {activeTool === 'github' && (
          <GitHubIntelPanel
            provider={activeProvider}
            onSendToChat={(text) => { addToolMessage(text); setActiveTool(null) }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'file-intel' && (
          <FileIntelPanel
            provider={activeProvider}
            onSendToChat={(text) => { addToolMessage(text); setActiveTool(null) }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'system' && (
          <SystemAssistantPanel
            provider={activeProvider}
            onSendToChat={(text) => { addToolMessage(text); setActiveTool(null) }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'generate' && (
          <GeneratePanel
            provider={activeProvider}
            onSendToChat={(text) => { addToolMessage(text); setActiveTool(null) }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'generate-image' && (
          <GenerateImagePanel
            onImageGenerated={(imgUrl, prompt) => {
              addToolMessage(`**Generated Image** — *${prompt}*\n\n![Generated Image](${imgUrl})`)
              setActiveTool(null)
            }}
            onClose={() => setActiveTool(null)}
          />
        )}

        {/* Attachments bar */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {attachments.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', background: 'rgba(108,92,231,0.1)',
                borderRadius: 8, fontSize: 12, border: '1px solid rgba(108,92,231,0.2)'
              }}>
                <Paperclip size={12} />
                <span>{a.file_name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({fmtSize(a.file_size)})</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeAttachment(a.id)} style={{ padding: 2 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tools dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowToolsMenu(!showToolsMenu); setShowAgentMenu(false); setShowCmdToolbar(false) }}
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              <Sparkles size={12} /> Tools <ChevronDown size={10} />
            </button>
            {showToolsMenu && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: 4, zIndex: 20, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {tools.map(t => (
                  <button key={t.id} className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11, gap: 6 }}
                    onClick={() => toggleTool(t.id)}>
                    <t.icon size={13} /> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attach button */}
          <button className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()}
            style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
            <Paperclip size={12} /> Attach
          </button>
          <input ref={fileInput} type="file" style={{ display: 'none' }} onChange={uploadFile} />

          {/* Agent dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowAgentMenu(!showAgentMenu); setShowToolsMenu(false); setShowCmdToolbar(false) }}
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              <Bot size={12} /> {AI_AGENTS.find(a => a.id === activeAgent)?.name || 'Agent'} <ChevronDown size={10} />
            </button>
            {showAgentMenu && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: 4, zIndex: 20, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {AI_AGENTS.map(a => {
                  const Icon = a.icon
                  return (
                    <button key={a.id} className="btn btn-ghost btn-sm"
                      style={{
                        width: '100%', justifyContent: 'flex-start', fontSize: 11, gap: 6,
                        background: activeAgent === a.id ? 'var(--accent-dim)' : 'transparent'
                      }}
                      onClick={() => selectAgent(a.id)}>
                      <Icon size={13} /> {a.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commands dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowCmdToolbar(!showCmdToolbar); setShowToolsMenu(false); setShowAgentMenu(false) }}
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              <Terminal size={12} /> Commands <ChevronDown size={10} />
            </button>
            {showCmdToolbar && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: 4, zIndex: 20, minWidth: 200, maxHeight: 300, overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {CMD_LIST.map(c => (
                  <div key={c.cmd} onClick={() => {
                    setInput(`#${c.cmd} `)
                    setShowCmdToolbar(false)
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }} style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11 }}>#{c.cmd}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider selector */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              {activeProvider ? (
                <>{PROVIDER_ICONS[activeProvider.type] || <Bot size={12} />} {activeProvider.name}</>
              ) : 'Provider'} <ChevronDown size={10} />
            </button>
            {showProviderDropdown && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                borderRadius: 8, padding: 4, zIndex: 20, minWidth: 200, maxHeight: 300, overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {providers.map(p => (
                  <div key={p.id}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>
                      {PROVIDER_ICONS[p.type] || <Bot size={11} />} {p.name}
                    </div>
                    {(p.models || []).map((m: string) => (
                      <button key={m} className="btn btn-ghost btn-sm"
                        style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11, paddingLeft: 24 }}
                        onClick={() => selectProvider(p, m)}>
                        {m}
                      </button>
                    ))}
                  </div>
                ))}
                {providers.length === 0 && (
                  <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    No providers configured.
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Send area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input ref={inputRef} style={{ flex: 1, height: 38, fontSize: 13, width: '100%' }}
              placeholder='Message AI... (type "#" for commands)'
              value={input}
              onChange={e => {
                const v = e.target.value; setInput(v)
                const lastHash = v.lastIndexOf('#')
                if (lastHash >= 0 && (lastHash === 0 || v[lastHash-1] === ' ')) {
                  const after = v.slice(lastHash + 1)
                  if (!after.includes(' ')) { setShowCmdMenu(true); setCmdFilter(after) }
                  else { setShowCmdMenu(false) }
                } else { setShowCmdMenu(false) }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { if (showCmdMenu) { setShowCmdMenu(false); return }; sendMessage() }
                if (e.key === 'Escape') setShowCmdMenu(false)
              }} />
            {showCmdMenu && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                borderRadius: 8, maxHeight: 200, overflow: 'auto', zIndex: 100,
                marginBottom: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {CMD_LIST.filter(c => c.cmd.includes(cmdFilter)).map(c => (
                  <div key={c.cmd} onClick={() => {
                    const before = input.slice(0, input.lastIndexOf('#') + 1)
                    setInput(before + c.cmd + ' ')
                    setShowCmdMenu(false)
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }} style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                    borderBottom: '1px solid var(--glass-border)'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>#{c.cmd}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading} style={{ height: 38 }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Providers Modal */}
      {showProviders && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowProviders(false) }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto', padding: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Cpu size={18} />
              <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>AI Providers</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProviders(false)}>
                <X size={16} />
              </button>
            </div>
            <ProvidersTabContent providers={providers} onUpdate={() => { loadStatusAndProviders(); setShowProviders(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Providers Tab Content (used in modal) =====
function ProvidersTabContent({ providers, onUpdate }: { providers: any[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [type, setType] = useState('openai')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [model, setModel] = useState('')
  const [testResult, setTestResult] = useState('')

  const addProvider = async () => {
    const p = {
      id: 'custom-' + Date.now(), name: name || type, type,
      api_url: apiUrl, api_key: apiKey, default_model: model || 'gpt-4o-mini',
      models: [], enabled: true, has_key: !!apiKey
    }
    try {
      await api.post('/ai/providers', { type, name: name || type, api_key: apiKey, api_url: apiUrl, default_model: model, enabled: true, force: true })
    } catch {
      try { localStorage.setItem('visionhub_custom_providers', JSON.stringify([...(JSON.parse(localStorage.getItem('visionhub_custom_providers') || '[]')), p])) } catch {}
    }
    setShowAdd(false); setName(''); setApiKey(''); setApiUrl(''); setModel('')
    onUpdate()
  }

  const testProvider = async () => {
    setTestResult('Testing...')
    const url = apiUrl || (type === 'openai' ? 'https://api.openai.com' : '')
    if (!url) { setTestResult('No API URL'); return }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(url + '/models', { headers })
      setTestResult(res.ok ? 'Connected!' : `Failed: HTTP ${res.status}`)
    } catch (e: any) { setTestResult(`Error: ${e.message}`) }
  }

  const removeProvider = async (id: string) => {
    try { await api.delete(`/ai/providers/${id}`) } catch {
      try {
        const stored = JSON.parse(localStorage.getItem('visionhub_custom_providers') || '[]')
        localStorage.setItem('visionhub_custom_providers', JSON.stringify(stored.filter((p: any) => p.id !== id)))
      } catch {}
    }
    onUpdate()
  }

  const providerDefaults: Record<string, { url: string; models: string[]; default_model?: string }> = {
    openai: { url: 'https://api.openai.com', models: OPENAI_MODELS, default_model: 'gpt-4o' },
    gemini: { url: '', models: GEMINI_MODELS, default_model: 'gemini-2.0-flash' },
    claude: { url: '', models: CLAUDE_MODELS, default_model: 'claude-3-5-sonnet-20241022' },
    ollama: { url: 'http://localhost:11434', models: [] },
    opencode: { url: 'https://opencode.ai/zen', models: OPENCODE_MODELS, default_model: 'big-pickle' },
    groq: { url: 'https://api.groq.com/openai/v1', models: GROQ_MODELS, default_model: 'llama-3.3-70b-versatile' },
    huggingface: { url: 'https://api-inference.huggingface.co/v1', models: HUGGINGFACE_MODELS, default_model: 'meta-llama/Llama-3.2-3B-Instruct' },
    cloudflare: { url: '', models: CLOUDFLARE_MODELS, default_model: '@cf/meta/llama-3.2-3b-instruct' },
  }

  const typeChanged = (t: string) => { setType(t); setApiUrl(providerDefaults[t]?.url || '') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> {showAdd ? 'Cancel' : 'Add Provider'}</button>
      </div>
      {showAdd && (
        <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{PROVIDER_TYPES.map(t => (
            <button key={t} className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => typeChanged(t)} style={{ textTransform: 'capitalize', fontSize: 10 }}>{t}</button>
          ))}</div>
          <input placeholder="Display name" value={name} onChange={e => setName(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          {type !== 'ollama' && <input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" style={{ height: 32, fontSize: 13 }} />}
          {['openai', 'ollama'].includes(type) && <input placeholder="API URL" value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={{ height: 32, fontSize: 13 }} />}
          <input placeholder="Default model" value={model} onChange={e => setModel(e.target.value)} style={{ height: 32, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={addProvider}><Plus size={12} /> Add</button>
            <button className="btn btn-secondary btn-sm" onClick={testProvider}><Zap size={12} /> Test</button>
          </div>
          {testResult && <div style={{ fontSize: 12, color: testResult.startsWith('Connected') ? 'var(--success)' : 'var(--danger)' }}>{testResult}</div>}
        </div>
      )}
      {providers.length === 0 && <div className="empty-state" style={{ padding: 20 }}><Cpu size={48} /><h3>No providers</h3></div>}
      {providers.map(p => (
        <div key={p.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: PROVIDER_COLORS[p.type] || 'var(--accent)' }}>{PROVIDER_ICONS[p.type] || <Bot size={18} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.type} · {p.has_key ? 'Key set' : 'No key'} · {p.enabled ? 'Enabled' : 'Disabled'}{p.default_model && ` · ${p.default_model}`}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeProvider(p.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  )
}

// ===== GitHub Intel Panel =====
function GitHubIntelPanel({ provider, onSendToChat, onClose }: { provider: any; onSendToChat: (text: string) => void; onClose: () => void }) {
  const [repos, setRepos] = useState<any[]>([])
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [filePath, setFilePath] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => { api.get('/ai/github/repos').then(r => setRepos(r.data)).catch(() => {}) }, [])

  const connect = async () => {
    if (!token || !repo) return
    setConnecting(true)
    try {
      await api.post('/ai/github/connect', { token, repo: repo.replace('https://github.com/', ''), branch })
      setToken(''); setRepo('')
      const r = await api.get('/ai/github/repos'); setRepos(r.data)
    } catch {} finally { setConnecting(false) }
  }

  const disconnect = async (id: string) => { await api.delete(`/ai/github/${id}/disconnect`); setRepos(prev => prev.filter(r => r.id !== id)) }

  const loadFiles = async (r: any, path = '') => {
    setSelectedRepo(r); setFilePath(path)
    try { const res = await api.get(`/ai/github/${r.id}/files?path=${encodeURIComponent(path)}`); setFiles(Array.isArray(res.data) ? res.data : [res.data]) } catch {}
  }

  const openFile = async (item: any) => {
    if (item.type === 'dir') loadFiles(selectedRepo, item.path)
    else try { const res = await api.get(`/ai/github/${selectedRepo.id}/files?path=${encodeURIComponent(item.path)}`); setFileContent(atob(res.data.content || '')) } catch {}
  }

  const analyzeCode = async () => {
    if (!selectedRepo || !filePath) return
    setAnalyzing(true)
    try {
      const res = await api.post(`/ai/github/${selectedRepo.id}/analyze`, { path: filePath, query: 'Analyze this code. What does it do?', provider_id: provider?.id || '' })
      setAnalysis(res.data.analysis)
    } catch {} finally { setAnalyzing(false) }
  }

  const sendAnalysisToChat = () => {
    if (analysis) {
      onSendToChat(`**GitHub Analysis** — \`${filePath}\` in \`${selectedRepo?.repo}\`\n\n${analysis}`)
    }
  }

  return (
    <div className="glass-card" style={{
      border: '1px solid var(--accent-dim)', borderRadius: 12, overflow: 'hidden',
      maxHeight: 400, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        <Github size={14} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>GitHub Intel</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input placeholder="GitHub PAT" value={token} onChange={e => setToken(e.target.value)} type="password" style={{ height: 30, fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <input placeholder="owner/repo" value={repo} onChange={e => setRepo(e.target.value)} style={{ flex: 1, height: 30, fontSize: 12 }} />
            <input placeholder="Branch" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 80, height: 30, fontSize: 12 }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting} style={{ fontSize: 11 }}>
            {connecting ? <Loader2 size={12} /> : <Github size={12} />} {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
        {repos.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {repos.map(r => (
              <button key={r.id} className={`btn btn-sm ${selectedRepo?.id === r.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => loadFiles(r)} style={{ fontSize: 10 }}>
                <Github size={10} /> {r.repo}
              </button>
            ))}
          </div>
        )}
        {selectedRepo && (
          <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 0 }}>
            <div style={{ width: 140, flexShrink: 0, overflow: 'auto', fontSize: 11, border: '1px solid var(--glass-border)', borderRadius: 6, padding: 4 }}>
              <div style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 3, fontSize: 10, color: 'var(--accent)' }}
                onClick={() => loadFiles(selectedRepo)}>
                <FolderOpen size={10} style={{ marginRight: 3 }} /> ..
              </div>
              {files.map((f: any) => (
                <div key={f.name} style={{ padding: '2px 4px', cursor: 'pointer', borderRadius: 3 }}
                  onClick={() => openFile(f)}>
                  {f.type === 'dir' ? '📁' : '📄'} {f.name}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              {fileContent && (
                <>
                  <pre style={{ fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto', padding: 8, background: '#0a0a0a', borderRadius: 6, margin: 0 }}>{fileContent.slice(0, 2000)}{fileContent.length > 2000 ? '\n... (truncated)' : ''}</pre>
                  <button className="btn btn-primary btn-sm" onClick={analyzeCode} disabled={analyzing} style={{ fontSize: 10 }}>
                    <Brain size={11} /> {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                </>
              )}
              {analysis && (
                <div style={{ borderLeft: '3px solid var(--accent)', padding: '6px 10px', background: 'rgba(108,92,231,0.04)', borderRadius: 6, fontSize: 12, maxHeight: 120, overflow: 'auto' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>AI Analysis</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{analysis}</div>
                  <button className="btn btn-ghost btn-sm" onClick={sendAnalysisToChat} style={{ fontSize: 10, marginTop: 4 }}>
                    <MessageSquare size={10} /> Send to Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== File Intel Panel =====
function FileIntelPanel({ provider, onSendToChat, onClose }: { provider: any; onSendToChat: (text: string) => void; onClose: () => void }) {
  const [path, setPath] = useState('')
  const [result, setResult] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileIntelInput = useRef<HTMLInputElement>(null)

  const analyze = async (filePath?: string) => {
    const p = filePath || path
    if (!p.trim()) return
    setAnalyzing(true)
    setResult('Analyzing...')
    try {
      const r = await api.post('/ai/file-intel', { path: p, provider_id: provider?.id || '' })
      setResult(r.data.analysis)
    } catch { setResult('Analysis failed') } finally { setAnalyzing(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const form = new FormData()
      form.append('file', file)
      api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(res => {
          const attached = res.data
          analyze(attached.file_path || attached.file_name)
        })
        .catch(() => {})
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(res => {
        const attached = res.data
        analyze(attached.file_path || attached.file_name)
      })
      .catch(() => {})
  }

  return (
    <div className="glass-card" style={{
      border: '1px solid var(--warning)', borderRadius: 12, overflow: 'hidden',
      maxHeight: 350, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        <FileSearch size={14} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>File Analysis</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>
        <div style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--glass-border)'}`,
          borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(108,92,231,0.05)' : 'transparent', fontSize: 12
        }} onClick={() => fileIntelInput.current?.click()}>
          <Paperclip size={20} style={{ opacity: 0.5, marginBottom: 4 }} />
          <div style={{ color: 'var(--text-muted)' }}>Drop a file here or click to browse</div>
        </div>
        <input ref={fileIntelInput} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder="Or enter file path (e.g. /notes/meeting.txt)"
            value={path} onChange={e => setPath(e.target.value)}
            style={{ flex: 1, height: 32, fontSize: 12 }} />
          <button className="btn btn-primary btn-sm" onClick={() => analyze()} disabled={analyzing} style={{ fontSize: 11 }}>
            {analyzing ? <Loader2 size={12} /> : <FileSearch size={12} />} Analyze
          </button>
        </div>
        {result && (
          <div style={{ borderLeft: '3px solid var(--warning)', padding: '6px 10px', background: 'rgba(255,165,0,0.04)', borderRadius: 6, fontSize: 12, maxHeight: 150, overflow: 'auto' }}>
            <MarkdownContent content={result} />
            <button className="btn btn-ghost btn-sm" onClick={() => onSendToChat(`**File Analysis Result**\n\n${result}`)} style={{ fontSize: 10, marginTop: 4 }}>
              <MessageSquare size={10} /> Send to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== System Assistant Panel =====
function SystemAssistantPanel({ provider, onSendToChat, onClose }: { provider: any; onSendToChat: (text: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResult('Analyzing system...')
    try {
      const r = await api.post('/ai/system-assistant', { query, provider_id: provider?.id || '' })
      setResult(r.data.response)
    } catch { setResult('System assistant unavailable') } finally { setLoading(false) }
  }

  return (
    <div className="glass-card" style={{
      border: '1px solid var(--info)', borderRadius: 12, overflow: 'hidden',
      maxHeight: 350, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        <Terminal size={14} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>System Assistant</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ask about system performance, diagnose issues, or analyze logs.</p>
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder='e.g. "Why is CPU high?" or "Show me disk usage"'
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            style={{ flex: 1, height: 32, fontSize: 12 }} />
          <button className="btn btn-primary btn-sm" onClick={ask} disabled={loading} style={{ fontSize: 11 }}>
            {loading ? <Loader2 size={12} /> : <Activity size={12} />} Ask
          </button>
        </div>
        {result && (
          <div style={{ borderLeft: '3px solid var(--info)', padding: '6px 10px', background: 'rgba(0,150,255,0.04)', borderRadius: 6, fontSize: 12, maxHeight: 180, overflow: 'auto' }}>
            <MarkdownContent content={result} />
            <button className="btn btn-ghost btn-sm" onClick={() => onSendToChat(`**System Assistant** — *${query}*\n\n${result}`)} style={{ fontSize: 10, marginTop: 4 }}>
              <MessageSquare size={10} /> Send to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Generate Panel (Code Generation) =====
function GeneratePanel({ provider, onSendToChat, onClose }: { provider: any; onSendToChat: (text: string) => void; onClose: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [fileType, setFileType] = useState('txt')
  const [result, setResult] = useState('')
  const [filename, setFilename] = useState('')
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setResult('')
    try {
      const r = await api.post('/ai/generate-file', {
        prompt, file_type: fileType, provider_id: provider?.id || ''
      })
      setResult(r.data.content || '')
      setFilename(r.data.filename || '')
    } catch {} finally { setGenerating(false) }
  }

  const sendToChat = () => {
    if (result) {
      onSendToChat(`**Generated Code** — *${filename || fileType}*\n\n\`\`\`${fileType}\n${result}\n\`\`\``)
    }
  }

  return (
    <div className="glass-card" style={{
      border: '1px solid var(--success)', borderRadius: 12, overflow: 'hidden',
      maxHeight: 400, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        <FileCode size={14} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Code Generation</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['txt', 'md', 'html', 'css', 'js', 'tsx', 'py', 'json', 'sh', 'sql', 'yaml', 'svg'].map(t => (
            <button key={t} className={`btn btn-sm ${fileType === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFileType(t)} style={{ fontSize: 10 }}>{t}</button>
          ))}
        </div>
        <textarea placeholder="Describe what code to generate..."
          value={prompt} onChange={e => setPrompt(e.target.value)}
          style={{ width: '100%', height: 60, fontSize: 12, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating} style={{ fontSize: 11 }}>
            {generating ? <Loader2 size={12} /> : <FileCode size={12} />} {generating ? 'Generating...' : 'Generate'}
          </button>
          {result && (
            <button className="btn btn-secondary btn-sm" onClick={sendToChat} style={{ fontSize: 11 }}>
              <MessageSquare size={12} /> Send to Chat
            </button>
          )}
        </div>
        {result && (
          <pre style={{ fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', padding: 8, background: '#0a0a0a', borderRadius: 6, margin: 0 }}>{result}</pre>
        )}
      </div>
    </div>
  )
}

// ===== Generate Image Panel =====
function GenerateImagePanel({ onImageGenerated, onClose }: { onImageGenerated: (imgUrl: string, prompt: string) => void; onClose: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('realistic')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [error, setError] = useState('')

  const generateImage = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setError('')
    setGeneratedUrl('')
    try {
      const r = await api.post('/ai/generate-image', {
        prompt: prompt.trim(),
        style,
        model: ''
      })
      const url = r.data.url || r.data.image_url || r.data.data?.url || ''
      if (!url) throw new Error('No image URL returned')
      setGeneratedUrl(url)
      onImageGenerated(url, prompt.trim())
    } catch (e: any) {
      setError(e.message || 'Image generation failed')
    } finally { setGenerating(false) }
  }

  return (
    <div className="glass-card" style={{
      border: '1px solid var(--accent)', borderRadius: 12, overflow: 'hidden',
      maxHeight: 420, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        <ImageIcon size={14} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Generate Images</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
          {IMAGE_STYLES.map(s => (
            <button key={s.id} className={`btn btn-sm ${style === s.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStyle(s.id)} style={{ fontSize: 10 }}>
              <Palette size={10} /> {s.name}
            </button>
          ))}
        </div>
        <textarea placeholder="Describe the image you want to generate..."
          value={prompt} onChange={e => setPrompt(e.target.value)}
          style={{ width: '100%', height: 60, fontSize: 12, resize: 'vertical' }} />
        <button className="btn btn-primary btn-sm" onClick={generateImage} disabled={generating || !prompt.trim()} style={{ fontSize: 11 }}>
          {generating ? <Loader2 size={12} /> : <ImageIcon size={12} />} {generating ? 'Generating...' : 'Generate Image'}
        </button>
        {error && (
          <div style={{ fontSize: 11, color: 'var(--danger)', padding: '4px 8px', background: 'rgba(255,0,0,0.05)', borderRadius: 6 }}>{error}</div>
        )}
        {generatedUrl && (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#0a0a0a', padding: 8 }}>
            <img src={generatedUrl} alt={prompt}
              style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 4 }}
              onError={() => setError('Failed to load image')} />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>
                <ExternalLink size={10} /> Open
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const a = document.createElement('a')
                a.href = generatedUrl
                a.download = `ai-${Date.now()}.png`
                document.body.appendChild(a); a.click()
                document.body.removeChild(a)
              }} style={{ fontSize: 10 }}>
                <Download size={10} /> Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
