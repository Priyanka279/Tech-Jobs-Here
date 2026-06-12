import React, { useState, useRef } from 'react'
import { api } from '../utils/api'
import Reveal from './Reveal.jsx'

function scoreColor(score) {
  if (score >= 75) return '#10b981'
  if (score >= 50) return '#00d4ff'
  if (score >= 25) return '#f59e0b'
  return '#f87171'
}

function ScoreRing({ score }) {
  const color = scoreColor(score)
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color,
      }}>{score}</div>
    </div>
  )
}

function MatchCard({ job }) {
  return (
    <div className="glass glow-hover" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <ScoreRing score={job.match_score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {job.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{job.company} · {job.location}</div>
            </div>
            <div className="grad-text" style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {job.salary_label}
            </div>
          </div>

          {job.match_summary && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0' }}>{job.match_summary}</p>
          )}

          {job.matched_skills?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {job.matched_skills.map(s => (
                <span key={s} style={{
                  padding: '3px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981',
                }}>✓ {s}</span>
              ))}
            </div>
          )}

          {job.missing_skills?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {job.missing_skills.map(s => (
                <span key={s} style={{
                  padding: '3px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b',
                }}>+ {s}</span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => window.open(job.apply_url, '_blank')}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: 13 }}
            >Quick Apply →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResumeMatch() {
  const [file,     setFile]     = useState(null)
  const [matches,  setMatches]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setMatches(null); setError(null) }
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.matchResume(file)
      setMatches(data.matches || [])
    } catch (e) {
      setError(e.message || 'Something went wrong analyzing your resume.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 100px' }}>
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: '-1px' }}>
          <span className="grad-text">✨ AI Resume Match</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
          Upload your resume and we'll score how well you fit each open role —
          highlighting matched skills and gaps to work on.
        </p>
      </div>

      <div className="grad-border fade-up-1">
        <div className="glass" style={{ padding: 24, border: 'none' }}>
          <div style={{
            border: `1.5px dashed ${file ? 'rgba(0,212,255,0.35)' : 'var(--border-2)'}`, borderRadius: 12, padding: 28,
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s var(--ease)',
            background: file ? 'rgba(0,212,255,0.05)' : 'transparent',
          }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            {file
              ? <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{file.name}</div>
              : <div style={{ color: 'var(--muted)', fontSize: 14 }}>Click to upload your resume (PDF or .txt, max 5MB)</div>
            }
          </div>

          <button
            onClick={analyze}
            disabled={!file || loading}
            className={(!file || loading) ? '' : 'btn-primary'}
            style={{
              width: '100%', marginTop: 16, padding: 13, borderRadius: 10,
              fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: (!file || loading) ? 'default' : 'pointer',
              background: (!file || loading) ? 'var(--surface-2)' : undefined,
              color: (!file || loading) ? 'var(--muted)' : undefined,
            }}
          >{loading ? 'Analyzing your resume…' : 'Analyze My Fit'}</button>

          {error && (
            <div style={{
              marginTop: 14, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 13,
            }}>⚠️ {error}</div>
          )}
        </div>
      </div>

      {matches && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {matches.length} job{matches.length !== 1 ? 's' : ''} ranked by fit
          </div>
          {matches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No matches found — try a different resume.
            </div>
          )}
          {matches.map((job, i) => (
            <Reveal key={job.id} delay={Math.min(i * 40, 200)}>
              <MatchCard job={job} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
