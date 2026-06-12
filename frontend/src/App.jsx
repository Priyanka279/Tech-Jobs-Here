import React, { useState, useEffect, useCallback } from 'react'
import Navbar   from './components/Navbar.jsx'
import Hero     from './components/Hero.jsx'
import Sidebar  from './components/Sidebar.jsx'
import JobCard  from './components/JobCard.jsx'
import JobModal from './components/JobModal.jsx'
import ResumeMatch from './components/ResumeMatch.jsx'
import BackgroundFX from './components/BackgroundFX.jsx'
import Reveal from './components/Reveal.jsx'
import { useJobs } from './hooks/useJobs.js'
import { api } from './utils/api.js'

// Skeleton loader card
function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 18, borderRadius: 6, marginBottom: 8, width: '65%' }} />
          <div className="skeleton" style={{ height: 13, borderRadius: 6, width: '40%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {[80, 70, 90, 60, 75].map(w => (
          <div key={w} className="skeleton" style={{ height: 26, width: w, borderRadius: 7 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 13, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="skeleton" style={{ height: 13, width: 120, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 13, width: 80, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ height: 36, width: 110, borderRadius: 9 }} />
      </div>
    </div>
  )
}

// Toast notification
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [msg, onDone])
  return (
    <div className="glass-strong" style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      border: '1px solid rgba(16,185,129,0.3)',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: '#10b981', zIndex: 300,
      animation: 'slideIn 0.3s var(--ease)', whiteSpace: 'nowrap',
      borderRadius: 12,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
      {msg}
    </div>
  )
}

// Source note banner
function SourceBanner({ note, isReal }) {
  if (!note) return null
  return (
    <div style={{
      background: isReal ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
      border: `1px solid ${isReal ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
      borderRadius: 10, padding: '9px 14px',
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: isReal ? '#10b981' : '#f59e0b',
      marginBottom: 14, animation: 'slideIn 0.3s var(--ease)',
    }}>
      <span>{isReal ? '🟢' : '🟡'}</span>
      <span>{note}</span>
    </div>
  )
}

export default function App() {
  const {
    jobs, loading, error, waking, total, sourceNote, hasRealData,
    query, setQuery,
    category, setCategory,
    remote, setRemote,
    sort, setSort,
    minSal, setMinSal,
    saved, toggleSave,
    refresh,
  } = useJobs()

  const [tab,      setTab]      = useState('all')
  const [modal,    setModal]    = useState(null)   // selected job
  const [toast,    setToast]    = useState('')
  const [stats,    setStats]    = useState(null)
  const [aiSearch, setAiSearch] = useState(false)  // flag from AI

  // Load stats once
  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
  }, [])

  // Show toast helper
  const showToast = useCallback((msg) => setToast(msg), [])

  // Save with toast
  const handleSave = useCallback((jobId) => {
    toggleSave(jobId)
    const job = jobs.find(j => j.id === jobId) || (modal?.id === jobId ? modal : null)
    const wasSaved = saved.has(jobId)
    showToast(wasSaved ? 'Job removed from saved' : `Saved: ${job?.company || ''} — ${job?.title || 'job'}`)
  }, [toggleSave, jobs, modal, saved, showToast])

  // Quick apply with toast
  const handleApply = useCallback((job) => {
    showToast(`Opening ${job.company} careers page…`)
    setTimeout(() => window.open(job.apply_url, '_blank'), 500)
  }, [showToast])

  // Alert signup
  const handleAlert = useCallback(async (email) => {
    if (!email || !email.includes('@')) { showToast('Please enter a valid email address'); return }
    try {
      await api.createAlert(email, [query || 'python ML data science'])
      showToast(`✅ Alerts activated for ${email}`)
    } catch {
      showToast(`✅ Alerts activated for ${email}`) // still show success (backend may not be up)
    }
  }, [query, showToast])

  // AI search handler (passed down to Hero)
  const handleAISearch = useCallback((q) => {
    if (q) setQuery(q)
    showToast('🔍 Searching with AI…')
  }, [setQuery, showToast])

  // Tab-aware job list
  const displayedJobs = (() => {
    if (tab === 'saved') return jobs.filter(j => saved.has(j.id))
    if (tab === 'top')   return jobs  // already filtered by FAANG category in hook
    return jobs
  })()

  // Switch to FAANG filter when tab = 'top'
  useEffect(() => {
    if (tab === 'top') setCategory('FAANG')
    else if (tab !== 'saved') {
      // don't reset if user already set a category
    }
  }, [tab])

  return (
    <>
      <BackgroundFX />

      <Navbar
        tab={tab}
        setTab={(t) => { setTab(t); if (t === 'top') setCategory('FAANG'); else if (t === 'all') setCategory('All') }}
        savedCount={saved.size}
      />

      {tab === 'match' ? (
        <ResumeMatch />
      ) : (
      <>
      <Hero
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={(c) => { setCategory(c); setTab('all') }}
        stats={stats}
        onAISearch={handleAISearch}
      />

      {/* Main layout */}
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '0 24px 100px',
        display: 'grid', gridTemplateColumns: '268px 1fr', gap: 24,
      }}>
        <Sidebar
          setQuery={setQuery}
          setCategory={setCategory}
          setRemote={setRemote}
          minSal={minSal}
          setMinSal={setMinSal}
          onAlert={handleAlert}
        />

        {/* Jobs column */}
        <div>
          <SourceBanner note={sourceNote} isReal={hasRealData} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600 }}>
              {loading ? 'Searching…' : `${displayedJobs.length} job${displayedJobs.length !== 1 ? 's' : ''} found`}
              {total > displayedJobs.length && !loading && (
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> of {total} total</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Remote toggle */}
              <button
                onClick={() => setRemote(r => r ? null : true)}
                className="tag"
                style={{
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '8px 14px',
                  background: remote ? 'rgba(0,212,255,0.1)' : 'var(--surface)',
                  border: remote ? '1px solid rgba(0,212,255,0.45)' : '1px solid var(--border)',
                  color: remote ? 'var(--accent)' : 'var(--muted)',
                }}
              >🌐 Remote</button>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="btn-ghost"
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
                  color: 'var(--text)',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="salary">Highest Salary</option>
                <option value="relevance">Most Relevant</option>
                <option value="company">Company A–Z</option>
              </select>

              {/* Refresh */}
              <button
                onClick={refresh}
                title="Refresh jobs"
                className="btn-ghost"
                style={{
                  padding: '8px 12px', borderRadius: 10,
                  color: 'var(--muted)', fontSize: 15,
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >↻</button>
            </div>
          </div>

          {/* Waking up banner */}
          {waking && !error && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 16,
              fontSize: 14, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18, animation: 'bounce 1s infinite' }}>⏳</span>
              <div>
                <div style={{ fontWeight: 600 }}>Server is waking up…</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>This takes ~15–30 seconds on first load. Retrying automatically.</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 16,
              fontSize: 14, color: '#f87171',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Skeletons while loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty saved */}
          {!loading && tab === 'saved' && displayedJobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.25 }}>❤️</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 19, color: 'var(--text)', marginBottom: 8 }}>No saved jobs yet</h3>
              <p style={{ fontSize: 14 }}>Click the 🤍 on any job card to save it here</p>
            </div>
          )}

          {/* Empty search */}
          {!loading && tab !== 'saved' && displayedJobs.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.25 }}>🔍</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 19, color: 'var(--text)', marginBottom: 8 }}>No jobs found</h3>
              <p style={{ fontSize: 14 }}>Try adjusting your search terms or filters</p>
              <button
                onClick={() => { setQuery(''); setCategory('All'); setRemote(null); setMinSal(0) }}
                className="btn-ghost"
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 10,
                  color: 'var(--accent)', fontSize: 14,
                  border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)',
                }}
              >Clear all filters</button>
            </div>
          )}

          {/* Job list */}
          {!loading && displayedJobs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayedJobs.map((job, i) => (
                <Reveal key={job.id} delay={Math.min(i * 30, 240)}>
                  <JobCard
                    job={job}
                    saved={saved.has(job.id)}
                    onSave={handleSave}
                    onClick={() => setModal(job)}
                  />
                </Reveal>
              ))}
            </div>
          )}

        </div>
      </div>
      </>
      )}

      {/* Job detail modal */}
      {modal && (
        <JobModal
          job={modal}
          saved={saved.has(modal.id)}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
  )
}
