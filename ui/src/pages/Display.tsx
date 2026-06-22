import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Brain, Wrench, AlertTriangle, AlertCircle, Info, Mic, Cpu, X } from 'lucide-react'
import api from '../utils/api'

interface Fault {
  type: string
  title: string
  message: string
  time: string
}

export default function DisplayPage() {
  const [faults, setFaults] = useState<Fault[]>([])
  const [ollamaOk, setOllamaOk] = useState(false)
  const [theme, setTheme] = useState({ accent: '#6c5ce7', wallpaper: '' })
  const [aiActive, setAiActive] = useState(false)
  const [customActive, setCustomActive] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [hostname, setHostname] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')
  const recognitionRef = useRef<any>(null)
  const pollRef = useRef<number>(0)

  // Accept token from URL query param (for kiosk)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('token', token)
      // Remove token from URL
      window.history.replaceState({}, '', '/display')
    }
  }, [])

  // Poll for status updates
  const loadStatus = useCallback(async () => {
    try {
      const r = await api.get('/display/status')
      setFaults(r.data.faults || [])
      setOllamaOk(r.data.ollama?.healthy ?? r.data.ollama)
      setTheme(r.data.theme || { accent: '#6c5ce7', wallpaper: '' })
      setHostname(r.data.hostname)
      setTimeStr(r.data.time)
      setDateStr(r.data.date)
    } catch {}
  }, [])

  useEffect(() => {
    loadStatus()
    pollRef.current = window.setInterval(loadStatus, 10000)
    // Update clock every 30s
    const clock = setInterval(() => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))
    }, 30000)
    return () => { clearInterval(pollRef.current); clearInterval(clock) }
  }, [loadStatus])

  // Voice recognition setup
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAiResponse('Voice not supported in this browser')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setListening(false)
      setAiResponse('Thinking...')
      try {
        const r = await api.post('/display/ai-voice', { text })
        setAiResponse(r.data.response)
        // Text-to-speak the response
        if ('speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(r.data.response)
          utter.rate = 1.0
          speechSynthesis.speak(utter)
        }
      } catch {
        setAiResponse('AI unavailable')
      }
    }

    recognition.onerror = () => {
      setListening(false)
      setAiResponse('Mic error. Try again.')
    }

    recognition.onend = () => setListening(false)

    setListening(true)
    setAiResponse('')
    recognition.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  const toggleAI = () => {
    setAiActive(!aiActive)
    if (aiActive) {
      stopListening()
      setAiResponse('')
    } else {
      startListening()
    }
  }

  const toggleCustom = () => {
    setCustomActive(!customActive)
  }

  const faultIcon = (type: string) => {
    switch(type) {
      case 'alert': return <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
      case 'system': return <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
      default: return <Info size={14} style={{ color: 'var(--info)' }} />
    }
  }

  const faultColor = (type: string) => {
    switch(type) {
      case 'alert': return '#ff6b6b'
      case 'system': return '#ffa726'
      default: return '#6c5ce7'
    }
  }

  // Apply theme background
  const bgStyle: React.CSSProperties = theme.wallpaper
    ? { backgroundImage: `url(${theme.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--bg-primary)' }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', userSelect: 'none', position: 'relative',
      ...bgStyle
    }}>
      {/* Semi-transparent overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        zIndex: 0
      }} />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>A</div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>ALPHA</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hostname}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ollamaOk ? 'var(--success)' : 'var(--danger)'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>Ollama {ollamaOk ? 'OK' : 'Off'}</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 16 }}>{timeStr}</span>
          <span style={{ color: 'var(--text-muted)' }}>{dateStr}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', gap: 16, padding: 16,
        minHeight: 0
      }}>
        {/* Left panel - buttons */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: 16
        }}>
          {/* AI Button (Red) */}
          <button onClick={toggleAI} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, borderRadius: 20, border: 'none', cursor: 'pointer',
            background: listening
              ? 'linear-gradient(135deg, #ff1744, #d50000)'
              : aiActive
                ? 'linear-gradient(135deg, #ff5252, #ff1744)'
                : 'linear-gradient(135deg, rgba(255,23,68,0.8), rgba(213,0,0,0.6))',
            color: 'white', transition: 'all 0.3s',
            boxShadow: listening ? '0 0 40px rgba(255,23,68,0.5)' : '0 4px 20px rgba(0,0,0,0.3)',
            position: 'relative', overflow: 'hidden'
          }}>
            {listening && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            )}
            {listening ? <Mic size={48} /> : <Brain size={48} />}
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              {listening ? 'Listening...' : aiActive ? 'AI Active' : 'AI Assistant'}
            </span>
            {listening && (
              <span style={{ fontSize: 13, opacity: 0.8 }}>Speak now...</span>
            )}
            {!listening && !aiActive && (
              <span style={{ fontSize: 13, opacity: 0.7 }}>Tap to speak with AI</span>
            )}
          </button>

          {/* AI Response area */}
          {aiResponse && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              fontSize: 15, lineHeight: 1.6,
              color: 'var(--text-primary)',
              maxHeight: 120, overflow: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Brain size={14} style={{ color: theme.accent }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.accent }}>AI Response</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setAiResponse('')}>
                  <X size={12} />
                </button>
              </div>
              {transcript && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>"{transcript}"</div>}
              <div>{aiResponse}</div>
            </div>
          )}

          {/* Custom Button (Blue) */}
          <button onClick={toggleCustom} style={{
            flex: customActive ? 1.5 : 0.7, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 20, border: 'none', cursor: 'pointer',
            background: customActive
              ? 'linear-gradient(135deg, #448aff, #2979ff)'
              : 'linear-gradient(135deg, rgba(68,138,255,0.8), rgba(41,121,255,0.6))',
            color: 'white', transition: 'all 0.3s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <Wrench size={36} />
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              {customActive ? 'Custom Panel' : 'Custom Widget'}
            </span>
            {customActive && (
              <div style={{ fontSize: 13, opacity: 0.9, textAlign: 'center', padding: '0 16px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Cpu size={14} />
                  <span>System Monitor</span>
                </div>
              </div>
            )}
            {!customActive && (
              <span style={{ fontSize: 13, opacity: 0.7 }}>Tap to customize</span>
            )}
          </button>
        </div>

        {/* Right panel - Faults */}
        <div style={{
          width: 300, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
          borderRadius: 20, padding: 16,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: 1, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <AlertTriangle size={14} /> Faults
            {faults.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 10, padding: '1px 8px', borderRadius: 8,
                background: 'var(--danger-dim)', color: 'var(--danger)'
              }}>{faults.length}</span>
            )}
          </div>

          {faults.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,214,143,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} style={{ color: 'var(--success)' }} />
              </div>
              <span>All systems normal</span>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {faults.map((f, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: `3px solid ${faultColor(f.type)}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {faultIcon(f.type)}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 20 }}>{f.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom info bar (like a 4-pin screen would show) */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '8px 20px', fontSize: 11, color: 'var(--text-muted)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 20
      }}>
        <span>ALPHA v1.0</span>
        <span>Nodes: 2</span>
        <span style={{ color: ollamaOk ? 'var(--success)' : 'var(--danger)' }}>
          AI: {ollamaOk ? 'Online' : 'Offline'}
        </span>
        <span>Faults: {faults.length}</span>
      </div>
    </div>
  )
}
