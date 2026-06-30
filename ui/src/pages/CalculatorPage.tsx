import React, { useState, useCallback } from 'react'
import { Calculator, X, Delete } from 'lucide-react'

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

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

  const performOp = useCallback((nextOp: string) => {
    const current = parseFloat(display)
    if (prevValue === null) {
      setPrevValue(current)
    } else if (operator) {
      const result = calculate(prevValue!, current, operator)
      setDisplay(String(result))
      setPrevValue(result)
    }
    setOperator(nextOp)
    setWaiting(true)
  }, [display, prevValue, operator])

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b !== 0 ? a / b : NaN
      default: return b
    }
  }

  const equals = useCallback(() => {
    if (prevValue === null || !operator) return
    const current = parseFloat(display)
    const result = calculate(prevValue, current, operator)
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

  const btn = (label: string, onClick: () => void, className = '') => (
    <button onClick={onClick} className={`btn ${className}`} style={{
      height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: className.includes('btn-primary') ? 'var(--accent)' : 'var(--glass-bg)', color: className.includes('btn-primary') ? '#fff' : 'var(--text-primary)'
    }}>{label}</button>
  )

  const opBtn = (label: string, op: string) => btn(label, () => performOp(op), operator === op ? 'btn-primary' : '')
  const numBtn = (n: string) => btn(n, () => inputDigit(n))

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
    </div>
  )
}
