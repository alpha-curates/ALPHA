import React, { useState, useCallback, useEffect } from 'react'
import { Calculator, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface HistoryEntry {
  expression: string
  result: string
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [memory, setMemory] = useState<number>(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const inputDigit = useCallback((digit: string) => {
    if (waiting) {
      setDisplay(digit)
      setWaiting(false)
    } else {
      setDisplay(prev => prev === '0' ? digit : prev + digit)
    }
  }, [waiting])

  const inputDecimal = useCallback(() => {
    if (waiting) {
      setDisplay('0.')
      setWaiting(false)
      return
    }
    if (!display.includes('.')) setDisplay(prev => prev + '.')
  }, [display, waiting])

  const clear = useCallback(() => {
    setDisplay('0')
    setPrevValue(null)
    setOperator(null)
    setWaiting(false)
  }, [])

  const deleteLast = useCallback(() => {
    if (waiting) return
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
  }, [waiting])

  const calc = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b !== 0 ? a / b : NaN
      default: return b
    }
  }

  const performOp = useCallback((nextOp: string) => {
    const current = parseFloat(display)
    if (prevValue === null) {
      setPrevValue(current)
    } else if (operator) {
      const result = calc(prevValue!, current, operator)
      setHistory(prev => {
        const entry = { expression: `${prevValue} ${operator} ${current}`, result: String(result) }
        return [...prev, entry].slice(-10)
      })
      setDisplay(String(result))
      setPrevValue(result)
    }
    setOperator(nextOp)
    setWaiting(true)
  }, [display, prevValue, operator])

  const equals = useCallback(() => {
    if (prevValue === null || !operator) return
    const current = parseFloat(display)
    const result = calc(prevValue, current, operator)
    setHistory(prev => {
      const entry = { expression: `${prevValue} ${operator} ${current}`, result: String(result) }
      return [...prev, entry].slice(-10)
    })
    setDisplay(String(result))
    setPrevValue(null)
    setOperator(null)
    setWaiting(true)
  }, [display, prevValue, operator])

  const percent = useCallback(() => {
    setDisplay(String(parseFloat(display) / 100))
  }, [display])

  const negate = useCallback(() => {
    setDisplay(String(-parseFloat(display)))
  }, [display])

  const memoryClear = useCallback(() => setMemory(0), [])
  const memoryRecall = useCallback(() => {
    setDisplay(String(memory))
    setWaiting(false)
  }, [memory])
  const memoryAdd = useCallback(() => setMemory(prev => prev + parseFloat(display)), [display])
  const memorySubtract = useCallback(() => setMemory(prev => prev - parseFloat(display)), [display])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); return }
      switch (e.key) {
        case '+': performOp('+'); break
        case '-': performOp('-'); break
        case '*': performOp('*'); break
        case '/': e.preventDefault(); performOp('/'); break
        case 'Enter': case '=': equals(); break
        case 'Escape': clear(); break
        case 'Backspace': deleteLast(); break
        case '.': inputDecimal(); break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [inputDigit, inputDecimal, clear, deleteLast, performOp, equals])

  const btn = (label: string, onClick: () => void, className = '') => (
    <button onClick={onClick} className={`btn ${className}`} style={{
      height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: className.includes('btn-primary') ? 'var(--accent)' : 'var(--glass-bg)', color: className.includes('btn-primary') ? '#fff' : 'var(--text-primary)'
    }}>{label}</button>
  )

  const opBtn = (label: string, op: string) => btn(label, () => performOp(op), operator === op ? 'btn-primary' : '')
  const numBtn = (n: string) => btn(n, () => inputDigit(n))

  const opSymbol = (op: string) => {
    switch (op) {
      case '+': return '+'
      case '-': return '−'
      case '*': return '×'
      case '/': return '÷'
      default: return op
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calculator size={18} /> Calculator
      </h3>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{
          background: 'var(--bg-primary)', borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          textAlign: 'right', fontSize: 28, fontWeight: 600, fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: 44,
          color: 'var(--text-primary)'
        }}>
          {display === 'NaN' ? 'Error' : display}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 4 }}>
          {btn('MC', memoryClear)}
          {btn('MR', memoryRecall)}
          {btn('M+', memoryAdd)}
          {btn('M-', memorySubtract)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {btn('AC', clear, '')}
          {btn('±', negate, '')}
          {btn('%', percent, '')}
          {opBtn('÷', '/')}

          {numBtn('7')}
          {numBtn('8')}
          {numBtn('9')}
          {opBtn('×', '*')}

          {numBtn('4')}
          {numBtn('5')}
          {numBtn('6')}
          {opBtn('−', '-')}

          {numBtn('1')}
          {numBtn('2')}
          {numBtn('3')}
          {opBtn('+', '+')}

          {numBtn('0')}
          {btn('.', inputDecimal, '')}
          {btn('⌫', deleteLast, '')}
          {btn('=', equals, 'btn-primary')}
        </div>
      </div>

      {history.length > 0 && (
        <div className="glass-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setShowHistory(!showHistory)}>
            <RotateCcw size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>History ({history.length})</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          {showHistory && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...history].reverse().map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
                  fontSize: 12, fontFamily: 'monospace', borderRadius: 4,
                  background: i % 2 === 0 ? 'var(--glass-bg)' : 'transparent'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>{entry.expression}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>= {entry.result}</span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, fontSize: 10 }} onClick={() => setHistory([])}>Clear history</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
