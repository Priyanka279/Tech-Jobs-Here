// API base — proxied through Vite in dev, direct in production
const BASE = import.meta.env.VITE_API_URL || '/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  getJobs: ({ q, remote, page = 1, sort = 'newest', minSal, source } = {}) => {
    const params = new URLSearchParams()
    if (q)      params.set('q', q)
    if (remote !== undefined && remote !== null) params.set('remote', remote)
    if (page)   params.set('page', page)
    if (sort)   params.set('sort', sort)
    if (minSal) params.set('min_sal', minSal)
    if (source) params.set('source', source)
    return apiFetch(`/jobs?${params}`)
  },

  getStats: () => apiFetch('/stats'),

  getCategories: () => apiFetch('/categories'),

  createAlert: (email, keywords) =>
    apiFetch('/alerts', {
      method: 'POST',
      body: JSON.stringify({ email, keywords }),
    }),
}
