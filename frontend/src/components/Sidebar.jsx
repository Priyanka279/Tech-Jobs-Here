import React, { useState, useRef } from 'react'

const block = (extra = {}) => ({
  background: '#161d2e', border: '1px solid #1e293b', borderRadius: 16,
  padding: 20, marginBottom: 14, ...extra,
})
const title = {
  fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b', marginBottom: 14,
}

const COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Apple', 'Microsoft',
  'OpenAI', 'Anthropic', 'Netflix', 'NVIDIA', 'Stripe',
]
const COMPANY_COLORS = {
  'Google': '#4285f4', 'Meta': '#1877f2', 'Amazon': '#ff9900',
  'Apple': '#888', 'Microsoft': '#00a4ef', 'OpenAI': '#10a37f',
  'Anthropic': '#c96a2e', 'Netflix': '#e50914', 'NVIDIA': '#76b900',
  'Stripe': '#635bff',
}

export default function Sidebar({ setQuery, setCategory, setRemote, minSal, setMinSal, onAlert }) {
  const [aiMsg,     setAiMsg]     = useState('👋 Hi! I can help you find the perfect tech job.\n\nTry: "Find remote ML jobs at FAANG" or "What Python skills are most in demand?"')
  const [aiInput,   setAiInput]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [selCo,     setSelCo]     = useState('')
  const [alertEmail,setAlertEmail]= useState('')
  const historyRef = useRef([])

  const askAI = async () => {
    const q = aiInput.trim()
    if (!q) return
    setAiInput('')
    setAiLoading(true)
    historyRef.current.push({ role: 'user', content: q })

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a helpful tech job search assistant for TechJobs Hub — a job board for software engineering, AI/ML, data science, and Python roles. Jobs are aggregated live from Adzuna, JSearch, and RemoteOK APIs.

When users ask to find jobs, suggest which search keywords to use and mention the filters available: category chips (Software Dev, ML/AI, Data Science, Data Analyst, Data Entry, Entry Level/Fresher, Python, Backend, Frontend, DevOps, FAANG+), remote toggle, salary slider, and company filter.

Be concise (2-4 sentences), specific, and encouraging. Mention real companies like Google, Amazon, Meta, OpenAI, Anthropic, etc. If asked about skills, highlight: Python, PyTorch, TensorFlow, SQL, Spark, Kubernetes, CUDA, LLMs, RAG, MLOps, dbt.`,
          messages: historyRef.current,
        }),
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Try searching for specific roles using the search bar above!'
      historyRef.current.push({ role: 'assistant', content: reply })
      setAiMsg(reply)
    } catch {
      setAiMsg('Connection issue — try the search bar above to find your ideal tech role!')
    } finally {
      setAiLoading(false)
    }
  }

  const handleCoClick = (co) => {
    const next = selCo === co ? '' : co
    setSelCo(next)
    setQuery(next ? next : '')
    if (!next) setCategory('All')
  }

  return (
    <aside>
      {/* AI Assistant */}
      <div style={{ ...block(), border: '1px solid rgba(0,212,255,0.18)', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 14, right: 16, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.8px', color: '#00d4ff',
          background: 'rgba(0,212,255,0.1)', padding: '3px 9px',
          borderRadius: 6, border: '1px solid rgba(0,212,255,0.25)',
        }}>AI</div>

        <div style={{ ...title, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#00d4ff">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
          AI Job Assistant
        </div>

        <div style={{
          fontSize: 13, color: '#e2e8f0', lineHeight: 1.65,
          background: '#111827', borderRadius: 10, padding: 13,
          marginBottom: 10, minHeight: 70,
          whiteSpace: 'pre-line',
        }}>
          {aiLoading
            ? <span style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, background: '#00d4ff', borderRadius: '50%',
                    display: 'inline-block',
                    animation: `bounce 1s ${i*0.15}s ease-in-out infinite`,
                  }} />
                ))}
              </span>
            : aiMsg
          }
        </div>

        <div style={{ display: 'flex', gap: 7 }}>
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAI()}
            placeholder="Ask about jobs..."
            style={{
              flex: 1, background: '#111827', border: '1px solid #1e293b',
              color: '#e2e8f0', padding: '9px 12px', borderRadius: 9,
              fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={askAI}
            style={{
              padding: '9px 15px', background: '#00d4ff', border: 'none',
              borderRadius: 9, color: '#000', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            }}
          >→</button>
        </div>
      </div>

      {/* Top Companies */}
      <div style={block()}>
        <div style={title}>Top Companies Hiring</div>
        {COMPANIES.map(co => {
          const color = COMPANY_COLORS[co] || '#7c3aed'
          const active = selCo === co
          return (
            <div key={co}
              onClick={() => handleCoClick(co)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px',
                borderRadius: 10, cursor: 'pointer', fontSize: 14,
                border: `1px solid ${active ? `${color}35` : 'transparent'}`,
                background: active ? `${color}0d` : 'transparent',
                transition: 'all 0.15s', marginBottom: 2,
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = '#1c2538')}
              onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${color}20`, color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12,
              }}>{co[0]}</div>
              <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{co}</span>
              <span style={{
                fontSize: 11, background: '#1c2538', padding: '2px 8px',
                borderRadius: 8, color: '#64748b',
              }}>→</span>
            </div>
          )
        })}
      </div>

      {/* Job Types */}
      <div style={block()}>
        <div style={title}>Job Type</div>
        {[
          { label: 'Full-time',      color: '#10b981', cnt: 'Most' },
          { label: 'Remote-friendly',color: '#00d4ff', cnt: '40%+' },
          { label: 'Contract',       color: '#f59e0b', cnt: 'Some' },
          { label: 'Internship',     color: '#a78bfa', cnt: 'Few' },
        ].map(({ label, color, cnt }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', fontSize: 14,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 10 }} />
              {label}
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>{cnt}</span>
          </div>
        ))}
        <div
          onClick={() => setRemote(prev => prev ? null : true)}
          style={{
            marginTop: 10, padding: '8px 12px',
            background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 9, fontSize: 13, color: '#00d4ff',
            cursor: 'pointer', textAlign: 'center', fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >🌐 Toggle Remote Only</div>
      </div>

      {/* Salary */}
      <div style={block()}>
        <div style={title}>Minimum Salary ($/yr)</div>
        <input
          type="range" min={0} max={300} step={10} value={minSal}
          onChange={e => setMinSal(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#00d4ff', margin: '10px 0' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Any</span>
          <span style={{ fontWeight: 700, color: '#00d4ff' }}>
            {minSal > 0 ? `$${minSal}k+ / year` : 'Any salary'}
          </span>
        </div>
      </div>

      {/* Alerts */}
      <div style={{ ...block(), border: '1px solid rgba(0,212,255,0.18)' }}>
        <div style={{ ...title, color: '#00d4ff' }}>🔔 Instant Job Alerts</div>
        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
          Get notified the moment Google, Amazon, Meta and other top companies post matching roles
        </p>
        <input
          type="email"
          value={alertEmail}
          onChange={e => setAlertEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            width: '100%', background: '#111827', border: '1px solid #1e293b',
            color: '#e2e8f0', padding: '9px 13px', borderRadius: 9,
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: 'none',
            marginBottom: 8, transition: 'border-color 0.18s',
          }}
        />
        <button
          onClick={() => { onAlert(alertEmail); setAlertEmail('') }}
          style={{
            width: '100%', padding: 10, background: '#00d4ff', border: 'none',
            borderRadius: 9, color: '#000', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: "'Syne',sans-serif",
            transition: 'opacity 0.2s',
          }}
        >Activate Alerts ↗</button>
      </div>
    </aside>
  )
}
