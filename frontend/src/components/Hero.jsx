import React, { useState, useEffect } from 'react'

const CATS = [
  { id: 'All',      label: '⚡ All Roles' },
  { id: 'Software', label: '💻 Software Dev' },
  { id: 'ML/AI',    label: '🤖 ML / AI' },
  { id: 'Data',     label: '📊 Data Science' },
  { id: 'Python',   label: '🐍 Python' },
  { id: 'Backend',  label: '⚙️ Backend' },
  { id: 'Frontend', label: '🎨 Frontend' },
  { id: 'DevOps',   label: '☁️ DevOps' },
  { id: 'FAANG',    label: '🏢 FAANG+' },
]

function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let c = 0
    const step = Math.ceil(target / 50)
    const t = setInterval(() => {
      c = Math.min(c + step, target)
      setVal(c)
      if (c >= target) clearInterval(t)
    }, 25)
    return () => clearInterval(t)
  }, [target])
  return <>{val.toLocaleString()}{suffix}</>
}

export default function Hero({ query, setQuery, category, setCategory, stats, onAISearch }) {
  const [localQ, setLocalQ] = useState(query)

  const submit = (e) => {
    e?.preventDefault()
    setQuery(localQ)
  }

  return (
    <section style={{ padding: '52px 32px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 320,
        background: 'radial-gradient(ellipse at center,rgba(0,212,255,0.07) 0%,rgba(124,58,237,0.04) 40%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <h1 className="fade-up" style={{
        fontFamily: "'Syne', sans-serif", fontSize: 46, fontWeight: 800,
        lineHeight: 1.1, marginBottom: 14, letterSpacing: '-1px',
      }}>
        Find Your{' '}
        <span style={{
          background: 'linear-gradient(135deg,#00d4ff 20%,#7c3aed 80%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Dream Job</span>
        <br />in Tech & AI
      </h1>

      <p className="fade-up-1" style={{ color: '#64748b', fontSize: 16, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
        Real-time jobs from Google, Amazon, Meta, Microsoft, Apple, OpenAI and 500+ top tech companies — aggregated live, apply in one click
      </p>

      {/* Stats */}
      <div className="fade-up-2" style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 44 }}>
        {[
          { label: 'Active Jobs',   val: parseInt((stats?.total_jobs  || '2847').replace(/\D/g,'')), sfx: '+' },
          { label: 'Companies',     val: parseInt((stats?.companies   || '500').replace(/\D/g,'')),  sfx: '+' },
          { label: 'New Today',     val: parseInt((stats?.new_today   || '142').replace(/\D/g,'')),  sfx: '' },
          { label: 'Quick Apply',   val: parseInt((stats?.quick_apply || '1200').replace(/\D/g,'')), sfx: '+' },
        ].map(({ label, val, sfx }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#00d4ff' }}>
              <Counter target={val} suffix={sfx} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form className="fade-up-3" onSubmit={submit} style={{ maxWidth: 740, margin: '0 auto 14px' }}>
        <div style={{
          display: 'flex', background: '#161d2e',
          border: '1.5px solid #1e293b', borderRadius: 16, overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
          onFocus={() => {}} // handled by CSS via :focus-within in index.html
        >
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', color: '#64748b' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            value={localQ}
            onChange={e => setLocalQ(e.target.value)}
            placeholder="Python Developer, ML Engineer, Data Scientist, FAANG..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: 15, fontFamily: "'DM Sans', sans-serif", padding: '15px 0',
            }}
          />
          <button
            type="button"
            onClick={() => onAISearch(localQ)}
            style={{
              margin: 8, padding: '0 18px',
              background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
              border: 'none', borderRadius: 10, color: '#000',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap',
              transition: 'opacity 0.2s',
            }}
          >✦ AI Search</button>
          <button
            type="submit"
            style={{
              margin: '8px 8px 8px 0', padding: '0 18px',
              background: '#1c2538', border: '1px solid #1e293b',
              borderRadius: 10, color: '#e2e8f0',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >Search</button>
        </div>
      </form>

      {/* Category chips */}
      <div className="fade-up-4" style={{ maxWidth: 740, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {CATS.map(cat => {
          const on = category === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.18s', userSelect: 'none',
                background: on ? 'rgba(0,212,255,0.1)' : '#161d2e',
                border: on ? '1px solid #00d4ff' : '1px solid #1e293b',
                color: on ? '#00d4ff' : '#64748b',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >{cat.label}</button>
          )
        })}
      </div>
    </section>
  )
}
