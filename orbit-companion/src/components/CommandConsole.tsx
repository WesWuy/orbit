import { useState, useRef, useEffect } from 'react'
import type { CommandEntry } from '../lib/types'

interface Props {
  history: CommandEntry[]
  onSend: (text: string) => void
  loading: boolean
}

export function CommandConsole({ history, onSend, loading }: Props) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="orbit-card flex flex-col" style={{ maxHeight: '280px' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orbit-muted mb-2">Commands</h3>

      {/* History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 mb-2 min-h-0">
        {history.length === 0 && (
          <p className="text-xs text-orbit-muted italic">
            Try: launch, orbit, focus, dock, land, stop
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i} className="text-xs">
            <span className="text-orbit-accent font-mono">&gt; {entry.text}</span>
            <span className={`ml-2 ${entry.result.accepted ? 'text-orbit-success' : 'text-orbit-danger'}`}>
              {entry.result.message}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          className="flex-1 bg-orbit-bg border border-orbit-border rounded-lg px-3 py-2 text-sm
                     text-orbit-text placeholder-orbit-muted focus:outline-none focus:border-orbit-accent
                     font-mono"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="orbit-btn-primary px-4"
        >
          Send
        </button>
      </form>
    </div>
  )
}
