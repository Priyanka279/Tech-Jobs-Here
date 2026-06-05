import React, { useState, useEffect } from 'react'

const s = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 32px', borderBottom: '1px solid #1e293b',
    background: 'rgba(9,13,26,0.96)', backdropFilter: 'blur(14px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
    background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', letterSpacing: '-0.5px', cursor: 'default',
  },
  links: { display: 'flex', gap: 6 },
  pill: (active) => ({
    padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none',
    background: active ? 'linear-gradient(135deg,#00d4ff,#7c3aed)' : 'transparent',
    border: active ? '1px solid transparent' : '1px solid #1e293b',
    color: active ? '#000' : '#64748b',
    fontFamily: "'DM Sans', sans-serif",
  }),
  badge: {
    background: '#7c3aed', color: '#fff', padding: '1px 7px',
    borderRadius: 8, fontSize: 11, fontWeight: 700, marginLeft: 4,
  },
  live: {
    display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
    fontWeight: 500, color: '#10b981',
    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
    padding: '6px 14px', borderRadius: 20,
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%', background: '#10b981',
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
  ]

  return (
    <nav style={s.nav}>
      <div style={s.logo}>⚡ TechJobs Hub</div>
      <div style={s.links}>
        {tabs.map(t => (
          <button key={t.id} style={s.pill(tab === t.id)} onClick={() => setTab(t.id)}>
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
