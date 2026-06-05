import React, { useEffect } from 'react'

const COMPANY_COLORS = {
  'Google': '#4285f4', 'Meta': '#1877f2', 'Amazon': '#ff9900',
  'Apple': '#888', 'Microsoft': '#00a4ef', 'OpenAI': '#10a37f',
  'Anthropic': '#c96a2e', 'Netflix': '#e50914', 'NVIDIA': '#76b900',
  'Stripe': '#635bff', 'Spotify': '#1db954', 'Uber': '#1c1c1c',
  'Airbnb': '#ff5a5f', 'Databricks': '#ff3621', 'GitLab': '#e24329',
}

function getColor(company) {
  if (!company) return '#7c3aed'
  for (const [k, v] of Object.entries(COMPANY_COLORS))
    if (company.toLowerCase().includes(k.toLowerCase())) return v
  let h = 0
  for (let i = 0; i < company.length; i++) h = company.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360},60%,55%)`
}

function getInitials(c) {
  if (!c) return '?'
  const w = c.split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : c.slice(0,2).toUpperCase()
}

export default function JobModal({ job, saved, onSave, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  if (!job) return null
  const color = getColor(job.company)
  const initials = getInitials(job.company)

  // Parse description into bullet points if possible
  const descLines = (job.description || '')
    .split(/[.\n]/)
    .map(l => l.trim())
    .filter(l => l.length > 20)
    .slice(0, 5)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        background: '#161d2e', border: '1px solid #1e293b', borderRadius: 22,
        width: '100%', maxWidth: 660, maxHeight: '88vh', overflowY: 'auto',
        padding: 36, position: 'relative',
        animation: 'fadeUp 0.25s ease',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, right: 18,
            background: '#111827', border: '1px solid #1e293b', color: '#e2e8f0',
            width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 13, flexShrink: 0,
            background: `${color}18`, color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 20,
            border: `1px solid ${color}30`,
          }}>
            {job.logo
              ? <img src={job.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} onError={e => e.target.style.display='none'} />
              : initials
            }
          </div>
          <div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 5, lineHeight: 1.15 }}>
              {job.title}
            </h2>
            <div style={{ fontSize: 15, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color, fontWeight: 600 }}>{job.company}</span>
              <span>·</span>
              <span>{job.location}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>Posted {job.posted_label}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
          {job.tags?.map(t => (
            <span key={t} style={{
              padding: '4px 11px', background: '#111827', border: '1px solid #1e293b',
              borderRadius: 7, fontSize: 12, color: '#64748b',
            }}>{t}</span>
          ))}
          {job.remote && (
            <span style={{
              padding: '4px 11px', background: 'rgba(0,212,255,0.07)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 7, fontSize: 12, color: '#00d4ff',
            }}>🌐 Remote</span>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11, marginBottom: 20 }}>
          {[
            { label: 'Salary',   val: job.salary_label, color: '#00d4ff' },
            { label: 'Type',     val: job.job_type,     color: '#e2e8f0' },
            { label: 'Source',   val: job.source?.toUpperCase() || 'LIVE', color: '#10b981' },
          ].map(({ label, val, color: c }) => (
            <div key={label} style={{ background: '#111827', borderRadius: 11, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: c }}>{val || 'N/A'}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {descLines.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: 11 }}>About the Role</h3>
            <div style={{ background: '#111827', borderRadius: 11, padding: 16, fontSize: 14, color: '#e2e8f0', lineHeight: 1.75 }}>
              <ul style={{ paddingLeft: 18 }}>
                {descLines.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.open(job.apply_url, '_blank')}
            style={{
              flex: 1, padding: 16,
              background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
              border: 'none', borderRadius: 13, color: '#000',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              fontFamily: "'Syne',sans-serif", transition: 'opacity 0.2s',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.87'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >Apply at {job.company} →</button>

          <button
            onClick={() => onSave(job.id)}
            title={saved ? 'Unsave' : 'Save'}
            style={{
              padding: '16px 18px', background: '#111827',
              border: '1px solid #1e293b', borderRadius: 13,
              color: '#e2e8f0', fontSize: 22, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >{saved ? '❤️' : '🤍'}</button>
        </div>
      </div>
    </div>
  )
}
