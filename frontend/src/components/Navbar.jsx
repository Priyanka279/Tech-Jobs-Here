import React, { useState, useEffect } from 'react'

const s = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 32px', borderBottom: '1px solid var(--border)',
    background: 'rgba(5,7,13,0.7)', backdropFilter: 'blur(18px) saturate(160%)',
    WebkitBackdropFilter: 'blur(18px) saturate(160%)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800,
    letterSpacing: '-0.5px', cursor: 'default',
  },
  links: { display: 'flex', gap: 6 },
  pill: (active) => ({
    padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.25s var(--ease)', userSelect: 'none',
    background: active ? 'var(--grad)' : 'transparent',
    border: active ? '1px solid transparent' : '1px solid var(--border)',
    color: active ? '#04060c' : 'var(--muted)',
    fontFamily: 'var(--font-body)',
    boxShadow: active ? '0 8px 24px -10px rgba(0,212,255,0.45)' : 'none',
  }),
  badge: {
    background: 'var(--accent2)', color: '#fff', padding: '1px 7px',
    borderRadius: 8, fontSize: 11, fontWeight: 700, marginLeft: 4,
  },
  live: {
    display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
    fontWeight: 500, color: 'var(--green)',
    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
    padding: '6px 14px', borderRadius: 20,
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%', background: 'var(--green)',
    animation: 'pulse 1.6s ease-in-out infinite',
    flexShrink: 0,
  },
}

export default function Navbar({ tab, setTab, savedCount }) {
  const [liveCount, setLiveCount] = useState(2847)

  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount(n => n + Math.floor(Math.random() * 3))
    }, 9000)
    return () => clearInterval(id)
  }, [])

  const tabs = [
    { id: 'all',   label: 'All Jobs' },
    { id: 'saved', label: 'Saved' },
    { id: 'top',   label: 'FAANG+' },
    { id: 'match', label: '✨ AI Resume Match' },
  ]

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        <span style={{ fontSize: 22 }}>⚡</span>
        <span className="grad-text">TechJobs Hub</span>
      </div>
      <div style={s.links}>
        {tabs.map(t => (
          <button
            key={t.id}
            style={s.pill(tab === t.id)}
            onClick={() => setTab(t.id)}
            onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)' } }}
            onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' } }}
          >
            {t.label}
            {t.id === 'saved' && savedCount > 0 && (
              <span style={s.badge}>{savedCount}</span>
            )}
          </button>
        ))}
      </div>
      <div style={s.live}>
        <span style={s.dot} />
        {liveCount.toLocaleString()} live jobs
      </div>
    </nav>
  )
}
