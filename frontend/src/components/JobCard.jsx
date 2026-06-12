import React from 'react'

const COMPANY_COLORS = {
  'Google': '#4285f4', 'Google DeepMind': '#4285f4',
  'Meta': '#1877f2', 'Meta FAIR': '#1877f2',
  'Amazon': '#ff9900', 'Amazon AWS': '#ff9900',
  'Apple': '#888888',
  'Microsoft': '#00a4ef', 'Microsoft Azure': '#00a4ef',
  'OpenAI': '#10a37f',
  'Anthropic': '#c96a2e',
  'Netflix': '#e50914',
  'NVIDIA': '#76b900',
  'Stripe': '#635bff',
  'Spotify': '#1db954',
  'Uber': '#1c1c1c',
  'Airbnb': '#ff5a5f',
  'Databricks': '#ff3621',
  'GitLab': '#e24329',
}

function getColor(company) {
  if (!company) return '#7c3aed'
  for (const [key, val] of Object.entries(COMPANY_COLORS)) {
    if (company.toLowerCase().includes(key.toLowerCase())) return val
  }
  // Generate consistent color from string
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue},60%,55%)`
}

function getInitials(company) {
  if (!company) return '?'
  const words = company.split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return company.slice(0, 2).toUpperCase()
}

function BadgePill({ badge }) {
  if (!badge) return null
  const styles = {
    new:     { bg: 'rgba(16,185,129,0.13)',  color: '#10b981', border: 'rgba(16,185,129,0.3)',  label: 'New' },
    hot:     { bg: 'rgba(239,68,68,0.1)',    color: '#f87171', border: 'rgba(239,68,68,0.22)', label: '🔥 Hot' },
    feat:    { bg: 'rgba(124,58,237,0.1)',   color: '#a78bfa', border: 'rgba(124,58,237,0.28)',label: 'Featured' },
    urgent:  { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b', border: 'rgba(245,158,11,0.28)',label: 'Urgent' },
  }
  const cfg = styles[badge]
  if (!cfg) return null
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>{cfg.label}</span>
  )
}

export default function JobCard({ job, saved, onSave, onClick }) {
  const color = getColor(job.company)
  const initials = getInitials(job.company)

  // Pick a badge based on salary / recency
  const badge = job.salary_min > 200000 ? 'hot'
              : job.salary_min > 180000 ? 'feat'
              : job.posted_label?.includes('h') ? 'new'
              : null

  return (
    <div
      onClick={onClick}
      className="glass glow-hover"
      style={{
        padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: badge === 'hot' ? 'linear-gradient(180deg,#00d4ff,#7c3aed)'
                  : badge === 'feat'? 'linear-gradient(180deg,#7c3aed,#a855f7)'
                  : badge === 'new' ? 'var(--green)'
                  : 'transparent',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo */}
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: `${color}18`, color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 15,
            border: `1px solid ${color}25`,
          }}>
            {job.logo
              ? <img src={job.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} onError={e => e.target.style.display='none'} />
              : initials
            }
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--text)', lineHeight: 1.2 }}>
              {job.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{job.company}</div>
          </div>
        </div>
        {/* Right: badge + save + time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <BadgePill badge={badge} />
            <button
              onClick={e => { e.stopPropagation(); onSave(job.id) }}
              title={saved ? 'Unsave' : 'Save'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2, transition: 'transform 0.15s var(--ease)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >{saved ? '❤️' : '🤍'}</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{job.posted_label}</div>
        </div>
      </div>

      {/* Tags */}
      {job.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '10px 0' }}>
          {job.tags.slice(0, 6).map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
          {job.remote && (
            <span className="tag" style={{
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: 'var(--accent)',
            }}>🌐 Remote</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { icon: '📍', text: job.location?.length > 28 ? job.location.slice(0,26)+'…' : job.location },
            { icon: '💼', text: job.job_type },
          ].map(({ icon, text }) => text ? (
            <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
              <span>{icon}</span>{text}
            </div>
          ) : null)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="grad-text" style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700 }}>
            {job.salary_label}
          </div>
          <button
            onClick={e => { e.stopPropagation(); window.open(job.apply_url, '_blank') }}
            className="btn-primary"
            style={{
              padding: '9px 20px', fontSize: 13, whiteSpace: 'nowrap',
            }}
          >Quick Apply →</button>
        </div>
      </div>
    </div>
  )
}
