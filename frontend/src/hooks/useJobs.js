import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../utils/api'

export function useJobs() {
  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [total,       setTotal]       = useState(0)
  const [sourceNote,  setSourceNote]  = useState('')
  const [hasRealData, setHasRealData] = useState(false)
  const [waking,      setWaking]      = useState(false)

  // Filters
  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState('All')
  const [remote,   setRemote]   = useState(null)
  const [sort,     setSort]     = useState('newest')
  const [minSal,   setMinSal]   = useState(0)
  const [page,     setPage]     = useState(1)

  // Saved jobs (localStorage-backed)
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('saved_jobs') || '[]')) }
    catch { return new Set() }
  })

  const debounceRef = useRef(null)
  const retryRef    = useRef(null)
  const retryCount  = useRef(0)

  const fetchJobs = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    clearTimeout(retryRef.current)
    try {
      // Build query string — merge category into q if not "All"
      let q = params.query ?? query
      if ((params.category ?? category) !== 'All') {
        const cat = params.category ?? category
        const catMap = {
          Software: 'software engineer developer',
          'ML/AI':  'machine learning AI engineer',
          Data:     'data scientist analyst',
          DataAnalyst: 'data analyst business intelligence reporting Excel SQL',
          DataEntry:   'data entry clerk remote typing administrative',
          Entry:    'entry level junior graduate fresher trainee associate',
          QA:       'QA quality assurance test engineer automation tester SDET',
          Python:   'python developer',
          Backend:  'backend engineer',
          Frontend: 'frontend react developer',
          DevOps:   'devops cloud kubernetes',
          FAANG:    'software engineer Google Amazon Meta Apple Microsoft',
        }
        q = catMap[cat] || cat
      }

      const data = await api.getJobs({
        q:      q || 'software engineer python AI ML data science data analyst data entry entry level junior',
        remote: params.remote ?? remote,
        page:   params.page ?? page,
        sort:   params.sort ?? sort,
        minSal: (params.minSal ?? minSal) > 0 ? (params.minSal ?? minSal) * 1000 : undefined,
      })

      retryCount.current = 0
      setWaking(false)
      setJobs(data.jobs || [])
      setTotal(data.total || 0)
      setSourceNote(data.source_note || '')
      setHasRealData(data.api_keys_configured || false)
    } catch (e) {
      if (retryCount.current < 4) {
        // Backend likely sleeping on Render free tier — retry with backoff
        retryCount.current++
        setWaking(true)
        setError(null)
        retryRef.current = setTimeout(() => fetchJobs(params), 8000)
      } else {
        setWaking(false)
        setError('Could not connect to server. Please try again later.')
      }
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query, category, remote, sort, minSal, page])

  // Debounced fetch on filter change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchJobs(), 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, category, remote, sort, minSal, page])

  const toggleSave = useCallback((jobId) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(jobId) ? next.delete(jobId) : next.add(jobId)
      try { localStorage.setItem('saved_jobs', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const refresh = () => fetchJobs()

  return {
    jobs, loading, error, waking, total, sourceNote, hasRealData,
    query,    setQuery,
    category, setCategory,
    remote,   setRemote,
    sort,     setSort,
    minSal,   setMinSal,
    page,     setPage,
    saved,    toggleSave,
    refresh,
  }
}
