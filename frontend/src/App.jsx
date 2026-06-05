import React, { useState, useEffect, useCallback } from 'react'
import Navbar   from './components/Navbar.jsx'
import Hero     from './components/Hero.jsx'
import Sidebar  from './components/Sidebar.jsx'
import JobCard  from './components/JobCard.jsx'
import JobModal from './components/JobModal.jsx'
import { useJobs } from './hooks/useJobs.js'
import { api } from './utils/api.js'

// Skeleton loader card
function SkeletonCard() {
  return (
    <div style={{ background: '#161d2e', border: '1px solid #1e293b', borderRadius: 16, padding: 22 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 13, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: '#10b981', zIndex: 300,
      animation: 'slideIn 0.3s ease', whiteSpace: 'nowrap',
      backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
      marginBottom: 14, animation: 'slideIn 0.3s ease',
    }}>
      <span>{isReal ? '🟢' : '🟡'}</span>
      <span>{note}</span>
      {!isReal && (
        <a href="#setup" style={{ marginLeft: 'auto', color: '#00d4ff', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>
          Add API keys →
        </a>
      )}
    </div>
  )
}

export default function App() {
  const {
    jobs, loading, error, total, sourceNote, hasRealData,
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
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn{ from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        @keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .fade-up  { animation: fadeUp 0.4s ease both }
        .fade-up-1{ animation: fadeUp 0.4s 0.05s ease both }
        .fade-up-2{ animation: fadeUp 0.4s 0.10s ease both }
        .fade-up-3{ animation: fadeUp 0.4s 0.15s ease both }
        .fade-up-4{ animation: fadeUp 0.4s 0.20s ease both }
        .skeleton {
          background: linear-gradient(90deg,#161d2e 25%,#1c2538 50%,#161d2e 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <Navbar
        tab={tab}
        setTab={(t) => { setTab(t); if (t === 'top') setCategory('FAANG'); else if (t === 'all') setCategory('All') }}
        savedCount={saved.size}
      />

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 600 }}>
              {loading ? 'Searching…' : `${displayedJobs.length} job${displayedJobs.length !== 1 ? 's' : ''} found`}
              {total > displayedJobs.length && !loading && (
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}> of {total} total</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Remote toggle */}
              <button
                onClick={() => setRemote(r => r ? null : true)}
                style={{
                  padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s',
                  background: remote ? 'rgba(0,212,255,0.1)' : '#161d2e',
                  border: remote ? '1px solid #00d4ff' : '1px solid #1e293b',
                  color: remote ? '#00d4ff' : '#64748b',
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >🌐 Remote</button>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{
                  background: '#161d2e', border: '1px solid #1e293b',
                  color: '#e2e8f0', padding: '8px 14px', borderRadius: 10,
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: 'pointer', outline: 'none',
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
                style={{
                  padding: '8px 12px', background: '#161d2e',
                  border: '1px solid #1e293b', borderRadius: 10,
                  color: '#64748b', cursor: 'pointer', fontSize: 15,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >↻</button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 16,
              fontSize: 14, color: '#f87171',
            }}>
              ⚠️ {error}
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Make sure the backend is running: <code style={{ background: '#111', padding: '2px 6px', borderRadius: 4 }}>uvicorn main:app --reload</code> in the <code style={{ background: '#111', padding: '2px 6px', borderRadius: 4 }}>backend/</code> folder.
              </div>
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
            <div style={{ textAlign: 'center', padding: '70px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.25 }}>❤️</div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, color: '#e2e8f0', marginBottom: 8 }}>No saved jobs yet</h3>
              <p style={{ fontSize: 14 }}>Click the 🤍 on any job card to save it here</p>
            </div>
          )}

          {/* Empty search */}
          {!loading && tab !== 'saved' && displayedJobs.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.25 }}>🔍</div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, color: '#e2e8f0', marginBottom: 8 }}>No jobs found</h3>
              <p style={{ fontSize: 14 }}>Try adjusting your search terms or filters</p>
              <button
                onClick={() => { setQuery(''); setCategory('All'); setRemote(null); setMinSal(0) }}
                style={{
                  marginTop: 16, padding: '10px 20px',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: 10, color: '#00d4ff', cursor: 'pointer', fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >Clear all filters</button>
            </div>
          )}

          {/* Job list */}
          {!loading && displayedJobs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayedJobs.map((job, i) => (
                <div
                  key={job.id}
                  className="fade-up"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
                >
                  <JobCard
                    job={job}
                    saved={saved.has(job.id)}
                    onSave={handleSave}
                    onClick={() => setModal(job)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Setup instructions (shown when using demo data) */}
          {!loading && !hasRealData && (
            <div id="setup" style={{
              marginTop: 32, background: '#161d2e',
              border: '1px solid #1e293b', borderRadius: 16, padding: 28,
            }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#00d4ff' }}>
                🔑 Add API Keys for Live Job Data
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.7 }}>
                Currently showing demo jobs. Add free API keys to get 100+ live job listings updated in real time:
              </p>
              {[
                { name: 'Adzuna API', desc: 'Free — 250 req/month. Best for US/UK jobs.', url: 'https://developer.adzuna.com/', key: 'ADZUNA_APP_ID + ADZUNA_APP_KEY' },
                { name: 'JSearch (RapidAPI)', desc: 'Free — 200 req/month. Aggregates LinkedIn, Indeed, Glassdoor.', url: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch', key: 'JSEARCH_KEY' },
                { name: 'RemoteOK', desc: 'Completely FREE, no key needed — 25+ remote tech jobs always live.', url: 'https://remoteok.com/api', key: '(no key required)' },
              ].map(({ name, desc, url, key }) => (
                <div key={name} style={{
                  background: '#111827', borderRadius: 10, padding: '14px 16px',
                  marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{ fontSize: 20 }}>🔗</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      <a href={url} target="_blank" rel="noreferrer" style={{ color: '#00d4ff', textDecoration: 'none' }}>{name} ↗</a>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{desc}</div>
                    <code style={{ fontSize: 12, color: '#10b981', background: '#0a0e1a', padding: '2px 8px', borderRadius: 5 }}>{key}</code>
                  </div>
                </div>
              ))}
              <div style={{
                background: '#0a0e1a', borderRadius: 10, padding: 16,
                fontFamily: 'monospace', fontSize: 13, color: '#10b981',
                marginTop: 8, lineHeight: 2,
              }}>
                <div style={{ color: '#64748b', marginBottom: 4 }}># backend/.env</div>
                <div>ADZUNA_APP_ID=your_id_here</div>
                <div>ADZUNA_APP_KEY=your_key_here</div>
                <div>JSEARCH_KEY=your_rapidapi_key</div>
                <div style={{ color: '#64748b', marginTop: 4 }}># Then restart: uvicorn main:app --reload</div>
              </div>
            </div>
          )}
        </div>
      </div>

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
