import React, { useState, useEffect } from 'react'

const CATS = [
  { id: 'All',      label: '⚡ All Roles' },
  { id: 'Software', label: '💻 Software Dev' },
  { id: 'ML/AI',    label: '🤖 ML / AI' },
  { id: 'Data',     label: '📊 Data Science' },
  { id: 'DataAnalyst', label: '📈 Data Analyst' },
  { id: 'DataEntry',   label: '⌨️ Data Entry' },
  { id: 'Entry',    label: '🌱 Entry Level / Fresher' },
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
    <section style={{ padding: '64px 32px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 800,
        lineHeight: 1.12, marginBottom: 16, letterSpacing: '-1.5px',
      }}>
        Find Your{' '}
        <span className="grad-text">Dream Job</span>
        <br />in Tech &amp; AI
      </h1>

      <p className="fade-up-1" style={{ color: 'var(--muted)', fontSize: 16.5, maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.7 }}>
        Real-time jobs from Google, Amazon, Meta, Microsoft, Apple, OpenAI and 500+ top tech companies — aggregated live, apply in one click
      </p>

      {/* Stats */}
      <div className="fade-up-2" style={{ display: 'flex', justifyContent: 'center', gap: 48, marginBottom: 48, flexWrap: 'wrap' }}>
        {[
          { label: 'Active Jobs',   val: parseInt((stats?.total_jobs  || '2847').replace(/\D/g,'')), sfx: '+' },
          { label: 'Companies',     val: parseInt((stats?.companies   || '500').replace(/\D/g,'')),  sfx: '+' },
          { label: 'New Today',     val: parseInt((stats?.new_today   || '142').replace(/\D/g,'')),  sfx: '' },
          { label: 'Quick Apply',   val: parseInt((stats?.quick_apply || '1200').replace(/\D/g,'')), sfx: '+' },
        ].map(({ label, val, sfx }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div className="grad-text" style={{ fontFamily: 'var(--font-head)', fontSize: 30, fontWeight: 800 }}>
              <Counter target={val} suffix={sfx} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontWeight: 500, letterSpacing: '0.2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form className="fade-up-3" onSubmit={submit} style={{ maxWidth: 760, margin: '0 auto 18px' }}>
        <div className="grad-border glow-hover" style={{ borderRadius: 18 }}>
          <div className="glass" style={{
            display: 'flex', alignItems: 'center',
            border: 'none', borderRadius: 17, overflow: 'hidden',
            background: 'rgba(12,16,28,0.7)',
          }}>
            <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
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
                color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)', padding: '17px 0',
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => onAISearch(localQ)}
              style={{
                margin: 8, padding: '12px 20px', fontSize: 13, whiteSpace: 'nowrap',
              }}
            >✦ AI Search</button>
            <button
              type="submit"
              className="btn-ghost"
              style={{
                margin: '8px 8px 8px 0', padding: '12px 20px',
                fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
              }}
            >Search</button>
          </div>
        </div>
      </form>

      {/* Category chips */}
      <div className="fade-up-4" style={{ maxWidth: 780, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {CATS.map(cat => {
          const on = category === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="tag"
              style={{
                cursor: 'pointer', userSelect: 'none', fontSize: 13,
                padding: '8px 16px', borderRadius: 20,
                background: on ? 'rgba(0,212,255,0.12)' : 'var(--surface)',
                border: on ? '1px solid rgba(0,212,255,0.45)' : '1px solid var(--border)',
                color: on ? 'var(--accent)' : 'var(--muted)',
                boxShadow: on ? '0 0 0 1px rgba(0,212,255,0.1), 0 8px 24px -12px rgba(0,212,255,0.45)' : 'none',
              }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--hover)' } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'var(--surface)' } }}
            >{cat.label}</button>
          )
        })}
      </div>
    </section>
  )
}
