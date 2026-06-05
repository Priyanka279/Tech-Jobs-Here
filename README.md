# ⚡ TechJobs Hub — Full-Stack Tech Job Board

> Real-time tech job aggregator built with **React + FastAPI**.  
> Pulls live jobs from Adzuna, JSearch (LinkedIn/Indeed/Glassdoor), and RemoteOK.  
> AI-powered job assistant via Claude API.

---

## 🏗️ Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 18, Vite, custom CSS (no UI library) |
| Backend   | Python 3.11+, FastAPI, httpx                |
| Job APIs  | Adzuna · JSearch (RapidAPI) · RemoteOK      |
| AI        | Anthropic Claude API (sidebar assistant)    |
| Caching   | In-memory (15-min TTL, swap for Redis later)|

---

## 📁 Project Structure

```
techjobs/
├── backend/
│   ├── main.py              ← FastAPI app (job fetching, aggregation, caching)
│   ├── requirements.txt
│   ├── .env.example         ← API key template
│   └── .env                 ← Your actual keys (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Root component, state management
│   │   ├── components/
│   │   │   ├── Navbar.jsx   ← Top nav with live counter
│   │   │   ├── Hero.jsx     ← Search bar + category chips + stats
│   │   │   ├── Sidebar.jsx  ← AI assistant + company filter + alerts
│   │   │   ├── JobCard.jsx  ← Individual job listing card
│   │   │   └── JobModal.jsx ← Job detail popup
│   │   ├── hooks/
│   │   │   └── useJobs.js   ← Data fetching + filter state hook
│   │   └── utils/
│   │       └── api.js       ← Backend API client
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── start-backend.sh         ← One-command backend start
├── start-frontend.sh        ← One-command frontend start
└── README.md
```

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+

### Step 1 — Start the Backend

```bash
cd techjobs
chmod +x start-backend.sh
./start-backend.sh
```

Backend runs at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### Step 2 — Start the Frontend (new terminal tab)

```bash
chmod +x start-frontend.sh
./start-frontend.sh
```

Frontend runs at **http://localhost:5173** ✅

> **Without API keys** the app works with 12 curated sample jobs (Google, Meta, Amazon, OpenAI, etc.).  
> **With API keys** you get 100+ real live jobs updated every 15 minutes.

---

## 🔑 API Keys (all free tiers available)

Edit `backend/.env`:

```env
# 1. Adzuna — free, 250 req/month
#    Sign up: https://developer.adzuna.com/
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# 2. JSearch via RapidAPI — free, 200 req/month
#    Sign up: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
JSEARCH_KEY=your_rapidapi_key

# 3. RemoteOK — NO KEY NEEDED (always active, 25+ remote jobs)
```

After adding keys, restart the backend — jobs update automatically.

---

## 🌟 Features

### Job Discovery
- **3 live sources** — Adzuna, JSearch (LinkedIn + Indeed + Glassdoor), RemoteOK
- **Smart search** — keyword search across title, company, tags, description
- **Category filters** — Software Dev · ML/AI · Data Science · Python · Backend · Frontend · DevOps · FAANG+
- **Remote toggle** — filter remote-only jobs instantly
- **Salary slider** — filter by minimum salary ($0–$300k+)
- **Company filter** — click any FAANG+ company to see only their jobs
- **Sort options** — Newest · Highest Salary · Relevance · Company A–Z

### User Experience
- **1-click apply** — opens the exact company careers page in a new tab
- **Save jobs** — heart button saves jobs locally (persists across page refreshes)
- **Saved tab** — view all saved jobs in one place
- **Job alerts** — email signup to be notified of new matching jobs
- **15-min cache** — fast responses, fresh data, minimal API usage

### AI Assistant
- Sidebar chat powered by Claude
- Asks about roles, skills, companies, career advice
- Suggests filters based on your query
- Full conversation history in session

### Developer Experience
- **Auto-refresh** — backend caches responses, frontend debounces searches
- **Graceful fallback** — shows sample jobs if backend is down
- **Error states** — clear messaging when backend isn't running
- **Skeleton loaders** — smooth loading experience
- **No API keys required** to run locally

---

## 📡 Backend API Endpoints

| Method | Endpoint          | Description                        |
|--------|-------------------|------------------------------------|
| GET    | `/api/jobs`       | Fetch & aggregate jobs from all sources |
| GET    | `/api/jobs/{id}`  | Single job detail                  |
| GET    | `/api/categories` | Available job categories           |
| GET    | `/api/stats`      | Site-wide statistics               |
| POST   | `/api/alerts`     | Register job alert email           |

### Query parameters for `/api/jobs`

| Param    | Type    | Default    | Description                         |
|----------|---------|------------|-------------------------------------|
| `q`      | string  | `"python"` | Search keywords                     |
| `remote` | boolean | `null`     | Filter remote-only                  |
| `page`   | int     | `1`        | Pagination                          |
| `sort`   | string  | `newest`   | `newest \| salary \| relevance \| company` |
| `min_sal`| int     | `null`     | Minimum salary in dollars           |
| `source` | string  | `all`      | `all \| adzuna \| jsearch \| remoteok` |

---

## 🛠️ Customisation

### Add more job categories
Edit the `CATS` array in `frontend/src/components/Hero.jsx`.

### Add more companies to sidebar
Edit the `COMPANIES` array in `frontend/src/components/Sidebar.jsx`.

### Change cache TTL
Edit `CACHE_TTL` in `backend/main.py` (default: 900 seconds = 15 min).

### Add more job APIs
1. Write a `fetch_<source>()` async function in `main.py`
2. Write a `normalise_<source>()` function that returns the standard job shape
3. Add to the `asyncio.gather()` call in the `/api/jobs` route

### Deploy to production
- **Backend**: deploy to Railway / Render / Fly.io (`uvicorn main:app --host 0.0.0.0 --port $PORT`)
- **Frontend**: `npm run build` → deploy `dist/` to Vercel / Netlify
- Set `VITE_API_URL=https://your-backend.com/api` in Vercel env vars

---

## 📦 Dependencies

### Backend (`pip install -r requirements.txt`)
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
python-dotenv==1.0.1
```

### Frontend (`npm install`)
```
react ^18.3
react-dom ^18.3
vite ^5.3
@vitejs/plugin-react ^4.3
```

No UI library, no component framework — pure React + CSS-in-JS inline styles.

---

## 🗺️ Roadmap / Next Steps

- [ ] PostgreSQL database for job persistence + user accounts
- [ ] Redis cache (replace in-memory)
- [ ] Email delivery via SendGrid for job alerts
- [ ] More sources: LinkedIn Scraper, Greenhouse API, Lever API, Workday
- [ ] Resume upload + AI match scoring
- [ ] Browser extension for 1-click apply tracking
- [ ] Telegram / Slack bot for alerts

---

Built with ⚡ by TechJobs Hub
