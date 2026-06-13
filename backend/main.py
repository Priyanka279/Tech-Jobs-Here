"""
TechJobs Hub - FastAPI Backend
Fetches real jobs from free live sources (RemoteOK, Remotive, Arbeitnow, Jobicy)
plus optional keyed APIs (Adzuna, JSearch via RapidAPI)
"""

from fastapi import FastAPI, Query, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
import os
import io
import re
from typing import Optional
from datetime import datetime, timedelta
import hashlib
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TechJobs Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API KEYS (set in .env or environment) ──────────────────────────────────────
ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")       # free at adzuna.com/api
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
JSEARCH_KEY    = os.getenv("JSEARCH_KEY", "")          # rapidapi.com → JSearch
RAPIDAPI_HOST  = "jsearch.p.rapidapi.com"

# Simple in-memory cache (TTL = 15 minutes)
_cache: dict = {}
CACHE_TTL = 900  # seconds

def cache_get(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if (datetime.now() - ts).seconds < CACHE_TTL:
            return data
    return None

def cache_set(key: str, data):
    _cache[key] = (data, datetime.now())

def make_id(source: str, raw_id: str) -> str:
    return hashlib.md5(f"{source}:{raw_id}".encode()).hexdigest()[:12]

# ── NORMALISE JOB SHAPE ────────────────────────────────────────────────────────
def normalise_adzuna(job: dict) -> dict:
    return {
        "id":          make_id("adzuna", job.get("id", "")),
        "source":      "adzuna",
        "title":       job.get("title", ""),
        "company":     job.get("company", {}).get("display_name", "Unknown"),
        "location":    job.get("location", {}).get("display_name", ""),
        "description": job.get("description", "")[:400],
        "salary_min":  job.get("salary_min"),
        "salary_max":  job.get("salary_max"),
        "salary_label": _fmt_salary(job.get("salary_min"), job.get("salary_max")),
        "job_type":    job.get("contract_time", "full_time").replace("_", " ").title(),
        "remote":      "remote" in job.get("title", "").lower() or "remote" in job.get("description", "").lower(),
        "tags":        _extract_tags(job.get("title","") + " " + job.get("description","")),
        "apply_url":   job.get("redirect_url", "#"),
        "posted_at":   job.get("created", ""),
        "posted_label": _time_ago(job.get("created", "")),
        "logo":        None,
    }

def normalise_jsearch(job: dict) -> dict:
    return {
        "id":          make_id("jsearch", job.get("job_id", "")),
        "source":      "jsearch",
        "title":       job.get("job_title", ""),
        "company":     job.get("employer_name", "Unknown"),
        "location":    f"{job.get('job_city','')}, {job.get('job_country','')}".strip(", "),
        "description": job.get("job_description", "")[:400],
        "salary_min":  job.get("job_min_salary"),
        "salary_max":  job.get("job_max_salary"),
        "salary_label": _fmt_salary(job.get("job_min_salary"), job.get("job_max_salary")),
        "job_type":    job.get("job_employment_type", "FULLTIME").replace("_"," ").title(),
        "remote":      job.get("job_is_remote", False),
        "tags":        _extract_tags(job.get("job_title","") + " " + job.get("job_description","")),
        "apply_url":   job.get("job_apply_link", "#"),
        "posted_at":   job.get("job_posted_at_datetime_utc", ""),
        "posted_label": _time_ago(job.get("job_posted_at_datetime_utc", "")),
        "logo":        job.get("employer_logo"),
    }

def normalise_remoteok(job: dict) -> dict:
    tags = job.get("tags", [])
    return {
        "id":          make_id("remoteok", str(job.get("id", ""))),
        "source":      "remoteok",
        "title":       job.get("position", ""),
        "company":     job.get("company", "Unknown"),
        "location":    "🌐 Remote (Worldwide)",
        "description": job.get("description", "")[:400],
        "salary_min":  job.get("salary_min"),
        "salary_max":  job.get("salary_max"),
        "salary_label": _fmt_salary(job.get("salary_min"), job.get("salary_max")),
        "job_type":    "Full-time",
        "remote":      True,
        "tags":        tags[:6] if tags else _extract_tags(job.get("position","")),
        "apply_url":   job.get("apply_url") or job.get("url", "#"),
        "posted_at":   str(job.get("date", "")),
        "posted_label": _time_ago(str(job.get("date", ""))),
        "logo":        job.get("company_logo"),
    }

def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").replace("&amp;", "&").replace("&nbsp;", " ").strip()

def normalise_remotive(job: dict) -> dict:
    desc = _strip_html(job.get("description", ""))[:400]
    salary_raw = (job.get("salary") or "").strip()
    return {
        "id":          make_id("remotive", str(job.get("id", ""))),
        "source":      "remotive",
        "title":       job.get("title", ""),
        "company":     job.get("company_name", "Unknown"),
        "location":    job.get("candidate_required_location") or "🌐 Remote",
        "description": desc,
        "salary_min":  None,
        "salary_max":  None,
        "salary_label": salary_raw if salary_raw else "Competitive",
        "job_type":    (job.get("job_type") or "full_time").replace("_", " ").title(),
        "remote":      True,
        "tags":        (job.get("tags") or [])[:6] or _extract_tags(job.get("title", "") + " " + desc),
        "apply_url":   job.get("url", "#"),
        "posted_at":   job.get("publication_date", ""),
        "posted_label": _time_ago(job.get("publication_date", "")),
        "logo":        job.get("company_logo"),
    }

def normalise_arbeitnow(job: dict) -> dict:
    desc = _strip_html(job.get("description", ""))[:400]
    return {
        "id":          make_id("arbeitnow", job.get("slug", "")),
        "source":      "arbeitnow",
        "title":       job.get("title", ""),
        "company":     job.get("company_name", "Unknown"),
        "location":    job.get("location") or ("🌐 Remote" if job.get("remote") else ""),
        "description": desc,
        "salary_min":  None,
        "salary_max":  None,
        "salary_label": "Competitive",
        "job_type":    (job.get("job_types") or ["Full-time"])[0].replace("_", " ").title(),
        "remote":      bool(job.get("remote")),
        "tags":        (job.get("tags") or [])[:6] or _extract_tags(job.get("title", "") + " " + desc),
        "apply_url":   job.get("url", "#"),
        "posted_at":   str(job.get("created_at", "")),
        "posted_label": _time_ago(str(job.get("created_at", ""))),
        "logo":        None,
    }

def normalise_jobicy(job: dict) -> dict:
    desc = _strip_html(job.get("jobExcerpt") or job.get("jobDescription", ""))[:400]
    pub = (job.get("pubDate") or "").replace(" ", "T")
    job_type = job.get("jobType")
    if isinstance(job_type, list):
        job_type = job_type[0] if job_type else "Full-time"
    return {
        "id":          make_id("jobicy", str(job.get("id", ""))),
        "source":      "jobicy",
        "title":       job.get("jobTitle", ""),
        "company":     job.get("companyName", "Unknown"),
        "location":    job.get("jobGeo") or "🌐 Remote",
        "description": desc,
        "salary_min":  job.get("annualSalaryMin"),
        "salary_max":  job.get("annualSalaryMax"),
        "salary_label": _fmt_salary(job.get("annualSalaryMin"), job.get("annualSalaryMax")),
        "job_type":    (job_type or "Full-time").replace("_", " ").title(),
        "remote":      True,
        "tags":        _extract_tags(job.get("jobTitle", "") + " " + desc),
        "apply_url":   job.get("url", "#"),
        "posted_at":   pub,
        "posted_label": _time_ago(pub),
        "logo":        job.get("companyLogo"),
    }

# ── HELPERS ────────────────────────────────────────────────────────────────────
TECH_TAGS = [
    "Python","JavaScript","TypeScript","React","Node.js","Java","Go","Rust","C++","C#",
    "SQL","PostgreSQL","MySQL","MongoDB","Redis","Kafka","Spark","Hadoop",
    "TensorFlow","PyTorch","Keras","scikit-learn","JAX","CUDA","MLflow",
    "Docker","Kubernetes","AWS","GCP","Azure","Terraform","Airflow",
    "LLM","NLP","Computer Vision","Deep Learning","ML","AI","MLOps",
    "FastAPI","Django","Flask","REST","GraphQL","gRPC",
    "dbt","Looker","Tableau","Power BI","Snowflake","Databricks","Spark",
    "Excel","Google Sheets","Data Entry","Data Analysis","VLOOKUP","Salesforce",
    "Selenium","Cypress","Playwright","JUnit","TestNG","Appium","Postman","JIRA",
    "QA","Manual Testing","Automation Testing","API Testing","Test Automation",
]

def _extract_tags(text: str, limit: int = 7) -> list[str]:
    text_lower = text.lower()
    found = [t for t in TECH_TAGS if t.lower() in text_lower]
    return found[:limit] if limit else found

def _fmt_salary(mn, mx) -> str:
    if mn and mx:
        return f"${int(mn/1000)}k–${int(mx/1000)}k"
    if mn:
        return f"${int(mn/1000)}k+"
    if mx:
        return f"Up to ${int(mx/1000)}k"
    return "Competitive"

def _time_ago(ts: str) -> str:
    if not ts:
        return "Recently"
    try:
        if "T" in ts:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            dt = datetime.fromtimestamp(int(ts))
        diff = datetime.now(dt.tzinfo) - dt
        if diff.days == 0:
            h = diff.seconds // 3600
            return f"{h}h ago" if h > 0 else "Just now"
        elif diff.days == 1:
            return "1d ago"
        elif diff.days < 7:
            return f"{diff.days}d ago"
        elif diff.days < 30:
            return f"{diff.days // 7}w ago"
        else:
            return f"{diff.days // 30}mo ago"
    except Exception:
        return "Recently"

# ── JOB FETCHERS ───────────────────────────────────────────────────────────────
async def fetch_adzuna(query: str, location: str = "us", page: int = 1) -> list[dict]:
    if not ADZUNA_APP_ID:
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/us/search/{page}"
    params = {
        "app_id":  ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": 20,
        "what": query,
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            return [normalise_adzuna(j) for j in data.get("results", [])]
    except Exception as e:
        print(f"[Adzuna] Error: {e}")
        return []

async def fetch_jsearch(query: str, remote_only: bool = False) -> list[dict]:
    if not JSEARCH_KEY:
        return []
    url = "https://jsearch.p.rapidapi.com/search"
    params = {
        "query": query + (" remote" if remote_only else ""),
        "num_pages": "2",
        "date_posted": "week",
    }
    headers = {
        "X-RapidAPI-Key":  JSEARCH_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params, headers=headers)
            r.raise_for_status()
            data = r.json()
            return [normalise_jsearch(j) for j in data.get("data", [])]
    except Exception as e:
        print(f"[JSearch] Error: {e}")
        return []

async def fetch_remoteok(tags: list[str] = None) -> list[dict]:
    """RemoteOK is free, no key needed."""
    url = "https://remoteok.com/api"
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "TechJobsHub/1.0"}) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            jobs = [j for j in data if isinstance(j, dict) and j.get("position")]
            if tags:
                tags_lower = [t.lower() for t in tags]
                jobs = [
                    j for j in jobs
                    if any(tg.lower() in " ".join(j.get("tags", [])).lower() + " " + j.get("position","").lower()
                           for tg in tags_lower)
                ]
            return [normalise_remoteok(j) for j in jobs[:25]]
    except Exception as e:
        print(f"[RemoteOK] Error: {e}")
        return []

def _matches_query(text: str, query: str) -> bool:
    """True if any meaningful query word appears in the text."""
    words = [w.lower() for w in query.split() if len(w) > 2]
    if not words:
        return True
    t = text.lower()
    return any(w in t for w in words)

async def fetch_remotive(query: str) -> list[dict]:
    """Remotive — free remote-jobs API, no key needed."""
    url = "https://remotive.com/api/remote-jobs"
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "TechJobsHub/1.0"}) as client:
            r = await client.get(url, params={"search": query, "limit": 25})
            r.raise_for_status()
            data = r.json()
            return [normalise_remotive(j) for j in data.get("jobs", [])[:25]]
    except Exception as e:
        print(f"[Remotive] Error: {e}")
        return []

async def fetch_arbeitnow(query: str) -> list[dict]:
    """Arbeitnow job board — free API, no key needed. Filters client-side."""
    url = "https://www.arbeitnow.com/api/job-board-api"
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "TechJobsHub/1.0"}) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            jobs = [
                j for j in data.get("data", [])
                if _matches_query(j.get("title", "") + " " + " ".join(j.get("tags", [])), query)
            ]
            return [normalise_arbeitnow(j) for j in jobs[:20]]
    except Exception as e:
        print(f"[Arbeitnow] Error: {e}")
        return []

async def fetch_jobicy(query: str) -> list[dict]:
    """Jobicy — free remote-jobs API, no key needed."""
    url = "https://jobicy.com/api/v2/remote-jobs"
    # Jobicy's tag param works best with a single keyword
    first_word = next((w for w in query.split() if len(w) > 3), "")
    params = {"count": 25}
    if first_word:
        params["tag"] = first_word
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "TechJobsHub/1.0"}) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            return [normalise_jobicy(j) for j in data.get("jobs", [])[:25]]
    except Exception as e:
        print(f"[Jobicy] Error: {e}")
        return []

# ── FALLBACK SAMPLE JOBS (shown when no API keys configured) ──────────────────
SAMPLE_JOBS = [
    {"id":"s1","source":"sample","title":"Senior ML Engineer","company":"Google DeepMind","location":"Mountain View, CA (Hybrid)","description":"Work on foundation models powering Gemini. Design and implement ML systems at scale using PyTorch and TPUs.","salary_min":180000,"salary_max":280000,"salary_label":"$180k–$280k","job_type":"Full-time","remote":False,"tags":["Python","PyTorch","TensorFlow","LLMs","MLOps"],"apply_url":"https://careers.google.com","posted_at":"","posted_label":"2h ago","logo":None},
    {"id":"s2","source":"sample","title":"Staff Software Engineer – AI Infra","company":"Meta FAIR","location":"Menlo Park, CA","description":"Build training infrastructure for LLaMA models. CUDA kernel optimization and distributed systems at scale.","salary_min":220000,"salary_max":350000,"salary_label":"$220k–$350k","job_type":"Full-time","remote":False,"tags":["C++","CUDA","PyTorch","Distributed Systems"],"apply_url":"https://www.metacareers.com","posted_at":"","posted_label":"4h ago","logo":None},
    {"id":"s3","source":"sample","title":"Senior Data Scientist","company":"Amazon AWS","location":"Seattle, WA / Remote","description":"Drive product decisions for 500M+ customers using advanced causal inference and A/B testing at scale.","salary_min":155000,"salary_max":230000,"salary_label":"$155k–$230k","job_type":"Full-time","remote":True,"tags":["Python","SQL","Statistics","Spark","Redshift"],"apply_url":"https://www.amazon.jobs","posted_at":"","posted_label":"6h ago","logo":None},
    {"id":"s4","source":"sample","title":"ML Platform Engineer","company":"OpenAI","location":"San Francisco, CA","description":"Build the systems that train and serve GPT models. Work on inference optimization and training pipelines.","salary_min":200000,"salary_max":320000,"salary_label":"$200k–$320k","job_type":"Full-time","remote":False,"tags":["Python","Kubernetes","Ray","MLflow","Triton"],"apply_url":"https://openai.com/careers","posted_at":"","posted_label":"1d ago","logo":None},
    {"id":"s5","source":"sample","title":"Research Engineer – LLMs","company":"Anthropic","location":"San Francisco, CA","description":"Train and evaluate frontier language models. Work on RLHF, Constitutional AI, and safety research engineering.","salary_min":180000,"salary_max":300000,"salary_label":"$180k–$300k","job_type":"Full-time","remote":False,"tags":["Python","JAX","PyTorch","Transformers","RLHF"],"apply_url":"https://www.anthropic.com/careers","posted_at":"","posted_label":"2d ago","logo":None},
    {"id":"s6","source":"sample","title":"Data Engineer – Streaming","company":"Netflix","location":"Los Gatos, CA (Remote OK)","description":"Build streaming data pipelines processing trillions of events. Power real-time recommendations for 270M subscribers.","salary_min":165000,"salary_max":240000,"salary_label":"$165k–$240k","job_type":"Full-time","remote":True,"tags":["Python","Spark","Kafka","Flink","Apache Iceberg"],"apply_url":"https://jobs.netflix.com","posted_at":"","posted_label":"1d ago","logo":None},
    {"id":"s7","source":"sample","title":"Deep Learning GPU Engineer","company":"NVIDIA","location":"Santa Clara, CA","description":"Optimize GPU kernels for next-gen AI workloads. Develop TensorRT passes and improve throughput for trillion-parameter models.","salary_min":175000,"salary_max":270000,"salary_label":"$175k–$270k","job_type":"Full-time","remote":False,"tags":["CUDA","C++","Python","TensorRT","cuDNN"],"apply_url":"https://www.nvidia.com/careers","posted_at":"","posted_label":"3d ago","logo":None},
    {"id":"s8","source":"sample","title":"Senior Python Backend Engineer","company":"Stripe","location":"Remote (Global)","description":"Build high-reliability payment APIs processing billions in transactions. Design fault-tolerant microservices.","salary_min":140000,"salary_max":210000,"salary_label":"$140k–$210k","job_type":"Full-time","remote":True,"tags":["Python","Django","PostgreSQL","Redis","gRPC"],"apply_url":"https://stripe.com/jobs","posted_at":"","posted_label":"2d ago","logo":None},
    {"id":"s9","source":"sample","title":"AI/ML Software Engineer","company":"Microsoft Azure","location":"Redmond, WA / Remote","description":"Build Azure ML platform features used by millions. Work with the OpenAI partnership and Azure OpenAI Service.","salary_min":145000,"salary_max":220000,"salary_label":"$145k–$220k","job_type":"Full-time","remote":True,"tags":["Python","Azure","MLflow","ONNX","REST APIs"],"apply_url":"https://careers.microsoft.com","posted_at":"","posted_label":"4d ago","logo":None},
    {"id":"s10","source":"sample","title":"Senior Python Engineer – GenAI","company":"Databricks","location":"San Francisco, CA (Remote OK)","description":"Build LLM-powered data intelligence features used by 10,000+ organizations including 50% of Fortune 500.","salary_min":170000,"salary_max":255000,"salary_label":"$170k–$255k","job_type":"Full-time","remote":True,"tags":["Python","LLM","Spark","MLflow","REST APIs"],"apply_url":"https://www.databricks.com/careers","posted_at":"","posted_label":"1w ago","logo":None},
    {"id":"s11","source":"sample","title":"Computer Vision Engineer","company":"Apple","location":"Cupertino, CA","description":"Build real-time CV for Vision Pro. Optimize on-device inference for Apple Silicon with privacy-preserving ML.","salary_min":170000,"salary_max":260000,"salary_label":"$170k–$260k","job_type":"Full-time","remote":False,"tags":["Python","C++","CoreML","Metal","OpenCV"],"apply_url":"https://jobs.apple.com","posted_at":"","posted_label":"5d ago","logo":None},
    {"id":"s12","source":"sample","title":"MLOps Platform Engineer","company":"Airbnb","location":"San Francisco, CA (Remote OK)","description":"Build Airbnb's ML training and serving platform. Design feature stores enabling 100+ data scientists.","salary_min":150000,"salary_max":225000,"salary_label":"$150k–$225k","job_type":"Full-time","remote":True,"tags":["Python","Airflow","Kubernetes","MLflow","Docker"],"apply_url":"https://careers.airbnb.com","posted_at":"","posted_label":"5d ago","logo":None},
    {"id":"s13","source":"sample","title":"Data Analyst","company":"Spotify","location":"New York, NY (Remote OK)","description":"Analyze listener behavior and product metrics. Build dashboards and reports for product and marketing teams using SQL and Tableau.","salary_min":75000,"salary_max":105000,"salary_label":"$75k–$105k","job_type":"Full-time","remote":True,"tags":["SQL","Excel","Tableau","Data Analysis","Power BI"],"apply_url":"https://www.lifeatspotify.com","posted_at":"","posted_label":"3h ago","logo":None},
    {"id":"s14","source":"sample","title":"Junior Data Analyst (Entry Level)","company":"Capital One","location":"Richmond, VA / Remote","description":"Entry-level role for recent graduates. Support senior analysts with reporting, data cleaning, and ad-hoc analysis. Training provided.","salary_min":55000,"salary_max":70000,"salary_label":"$55k–$70k","job_type":"Full-time","remote":True,"tags":["SQL","Excel","Data Analysis","Power BI"],"apply_url":"https://www.capitalonecareers.com","posted_at":"","posted_label":"5h ago","logo":None},
    {"id":"s15","source":"sample","title":"Remote Data Entry Clerk","company":"Robert Half","location":"Remote (US)","description":"Accurately enter and update records into company databases and spreadsheets. No degree required — strong typing and attention to detail needed.","salary_min":35000,"salary_max":45000,"salary_label":"$35k–$45k","job_type":"Full-time","remote":True,"tags":["Data Entry","Excel","Google Sheets"],"apply_url":"https://www.roberthalf.com","posted_at":"","posted_label":"1h ago","logo":None},
    {"id":"s16","source":"sample","title":"Data Entry Specialist","company":"UnitedHealth Group","location":"Remote (US)","description":"Process and validate healthcare records and claims data. Entry-level position with full training and benefits from day one.","salary_min":38000,"salary_max":48000,"salary_label":"$38k–$48k","job_type":"Full-time","remote":True,"tags":["Data Entry","Excel","Salesforce"],"apply_url":"https://careers.unitedhealthgroup.com","posted_at":"","posted_label":"8h ago","logo":None},
    {"id":"s17","source":"sample","title":"Software Engineer I (New Grad / Fresher)","company":"Amazon","location":"Seattle, WA / Remote","description":"Entry-level software engineering role for new graduates. Work on real production systems with mentorship from senior engineers. CS degree or bootcamp welcome.","salary_min":95000,"salary_max":130000,"salary_label":"$95k–$130k","job_type":"Full-time","remote":True,"tags":["Python","Java","SQL","REST","AWS"],"apply_url":"https://www.amazon.jobs","posted_at":"","posted_label":"2h ago","logo":None},
    {"id":"s18","source":"sample","title":"Junior Python Developer (Entry Level)","company":"Cognizant","location":"Remote (Global)","description":"Great first job in tech for freshers. Build and maintain internal tools using Python and SQL under guidance of a senior team.","salary_min":50000,"salary_max":68000,"salary_label":"$50k–$68k","job_type":"Full-time","remote":True,"tags":["Python","SQL","REST","Excel"],"apply_url":"https://careers.cognizant.com","posted_at":"","posted_label":"4h ago","logo":None},
    {"id":"s19","source":"sample","title":"QA Automation Engineer","company":"Salesforce","location":"San Francisco, CA / Remote","description":"Build and maintain automated test suites for Salesforce cloud products using Selenium and Playwright. Design CI test pipelines and improve release quality.","salary_min":110000,"salary_max":160000,"salary_label":"$110k–$160k","job_type":"Full-time","remote":True,"tags":["Selenium","Playwright","Python","API Testing","JIRA"],"apply_url":"https://careers.salesforce.com","posted_at":"","posted_label":"3h ago","logo":None},
    {"id":"s20","source":"sample","title":"SDET – Software Development Engineer in Test","company":"Uber","location":"Seattle, WA","description":"Write test frameworks and automation infrastructure for Uber's rider and driver apps. Strong coding skills in Java or Python required.","salary_min":140000,"salary_max":200000,"salary_label":"$140k–$200k","job_type":"Full-time","remote":False,"tags":["Java","Python","Appium","Test Automation","CI/CD"],"apply_url":"https://www.uber.com/careers","posted_at":"","posted_label":"7h ago","logo":None},
    {"id":"s21","source":"sample","title":"Manual QA Tester (Entry Level)","company":"TCS","location":"Remote (Global)","description":"Entry-level QA role for freshers. Execute manual test cases, log defects in JIRA, and learn automation tools on the job. Full training provided.","salary_min":42000,"salary_max":58000,"salary_label":"$42k–$58k","job_type":"Full-time","remote":True,"tags":["Manual Testing","JIRA","QA","Postman"],"apply_url":"https://www.tcs.com/careers","posted_at":"","posted_label":"5h ago","logo":None},
]

# ── QUERY RELEVANCE ───────────────────────────────────────────────────────────
def _query_words(query: str) -> list[str]:
    return [w.lower() for w in (query or "").split() if len(w) > 2]

def _relevance_score(job: dict, words: list[str]) -> int:
    title = job["title"].lower()
    body = (" ".join(job.get("tags", [])) + " " + job.get("description", "")).lower()
    score = 0
    for w in words:
        if w in title:
            score += 3
        elif w in body:
            score += 1
    return score

def _filter_by_query(jobs: list[dict], query: str) -> list[dict]:
    """Keep only jobs matching at least one query word, best matches first.
    Returns the list unchanged if nothing matches, to avoid an empty page."""
    words = _query_words(query)
    if not words:
        return jobs
    scored = sorted(((j, _relevance_score(j, words)) for j in jobs),
                    key=lambda x: x[1], reverse=True)
    matched = [j for j, s in scored if s > 0]
    return matched if matched else jobs

_ENTRY_QUERY_WORDS = {
    "entry", "level", "entry-level", "junior", "graduate", "fresher",
    "trainee", "associate", "intern", "internship", "grad",
}

def _is_entry_query(query: str) -> bool:
    """True only when every query word signals entry-level intent — so the broad
    default query (which mentions 'entry level' among other roles) is unaffected."""
    words = _query_words(query)
    return bool(words) and all(w in _ENTRY_QUERY_WORDS for w in words)

# ── ROUTES ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "TechJobs Hub API running", "version": "1.0.0"}

async def _aggregate_jobs(
    q:       Optional[str],
    remote:  Optional[bool],
    page:    int,
    sort:    str,
    min_sal: Optional[int],
    source:  Optional[str],
):
    """
    Aggregate jobs from all configured sources.
    Falls back to sample jobs if no API keys are set.
    """
    cache_key = f"jobs:{q}:{remote}:{page}:{sort}:{min_sal}:{source}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    search_query = q or "python developer AI ML data scientist"

    # Always fetch from all available sources concurrently
    # RemoteOK is free and always runs; Adzuna/JSearch only run if keys are set
    tasks = []
    if source in ("all", "adzuna") and ADZUNA_APP_ID:
        tasks.append(fetch_adzuna(search_query, page=page))
    else:
        tasks.append(asyncio.sleep(0, result=[]))

    if source in ("all", "jsearch") and JSEARCH_KEY:
        tasks.append(fetch_jsearch(search_query, remote_only=(remote is True)))
    else:
        tasks.append(asyncio.sleep(0, result=[]))

    if source in ("all", "remoteok"):
        tag_hints = [w for w in search_query.split() if len(w) > 3]
        tasks.append(fetch_remoteok(tags=tag_hints[:4]))
    else:
        tasks.append(asyncio.sleep(0, result=[]))

    # Free keyless live sources — always fetched so the site stays dynamic
    if source == "all":
        tasks.append(fetch_remotive(search_query))
        tasks.append(fetch_arbeitnow(search_query))
        tasks.append(fetch_jobicy(search_query))
    else:
        tasks.extend(asyncio.sleep(0, result=[]) for _ in range(3))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_jobs = []
    for r in results:
        if isinstance(r, list):
            all_jobs.extend(r)

    # Fall back to sample data only if every source failed
    if not all_jobs:
        all_jobs = SAMPLE_JOBS.copy()
        source_note = "Showing sample jobs — live job sources unavailable right now"
        api_keys_configured = False
    else:
        active = sum(1 for r in results if isinstance(r, list) and r)
        source_note = f"🟢 Live jobs from {active} source(s) — updated every 15 min"
        api_keys_configured = True

    # Deduplicate by title + company
    seen = set()
    unique_jobs = []
    for j in all_jobs:
        key = f"{j['title'].lower()[:40]}:{j['company'].lower()[:20]}"
        if key not in seen:
            seen.add(key)
            unique_jobs.append(j)

    # Relevance: drop jobs that match nothing in the query, best matches first
    unique_jobs = _filter_by_query(unique_jobs, search_query)

    # If the user asked specifically for entry-level roles, hide senior-titled jobs
    if _is_entry_query(search_query):
        unique_jobs = [j for j in unique_jobs if _seniority_level(j["title"]) != "senior"]

    # Filter
    if remote is True:
        unique_jobs = [j for j in unique_jobs if j["remote"]]
    if min_sal:
        unique_jobs = [j for j in unique_jobs if (j["salary_min"] or 0) >= min_sal]

    # Sort
    if sort == "salary":
        unique_jobs.sort(key=lambda j: j["salary_min"] or 0, reverse=True)
    elif sort == "company":
        unique_jobs.sort(key=lambda j: j["company"])
    elif sort == "relevance":
        words = _query_words(search_query)
        unique_jobs.sort(key=lambda j: _relevance_score(j, words), reverse=True)

    result = {
        "jobs": unique_jobs,
        "total": len(unique_jobs),
        "page": page,
        "source_note": source_note,
        "api_keys_configured": api_keys_configured,
    }
    cache_set(cache_key, result)
    return result


@app.get("/api/jobs")
async def get_jobs(
    q:       Optional[str]  = Query(default="software engineer python AI ML data science"),
    remote:  Optional[bool] = Query(default=None),
    page:    int            = Query(default=1, ge=1),
    sort:    str            = Query(default="newest"),
    min_sal: Optional[int]  = Query(default=None),
    source:  Optional[str]  = Query(default="all"),  # all | adzuna | jsearch | remoteok
):
    return await _aggregate_jobs(q, remote, page, sort, min_sal, source)


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get a single job by id (from cache/sample data)."""
    # Check sample jobs
    for j in SAMPLE_JOBS:
        if j["id"] == job_id:
            return j
    raise HTTPException(status_code=404, detail="Job not found")


@app.get("/api/categories")
async def get_categories():
    return {
        "categories": [
            {"id": "software",  "label": "Software Dev",   "query": "software engineer developer"},
            {"id": "ml",        "label": "ML / AI",        "query": "machine learning AI engineer"},
            {"id": "data",      "label": "Data Science",   "query": "data scientist analyst"},
            {"id": "data_analyst", "label": "Data Analyst", "query": "data analyst business intelligence reporting Excel SQL"},
            {"id": "data_entry",   "label": "Data Entry",   "query": "data entry clerk remote typing administrative"},
            {"id": "entry_level",  "label": "Entry Level / Fresher", "query": "entry level junior graduate fresher trainee associate"},
            {"id": "qa",           "label": "QA / Testing", "query": "QA quality assurance test engineer automation tester SDET"},
            {"id": "python",    "label": "Python",         "query": "python developer engineer"},
            {"id": "backend",   "label": "Backend",        "query": "backend engineer API developer"},
            {"id": "frontend",  "label": "Frontend",       "query": "frontend React TypeScript developer"},
            {"id": "devops",    "label": "DevOps / Cloud", "query": "DevOps Kubernetes cloud engineer"},
            {"id": "data_eng",  "label": "Data Engineering","query": "data engineer Spark pipeline"},
        ]
    }


@app.get("/api/stats")
async def get_stats():
    return {
        "total_jobs":    "2,847+",
        "companies":     "500+",
        "new_today":     "142",
        "quick_apply":   "1,200+",
        "last_updated":  datetime.now().isoformat(),
    }


@app.post("/api/alerts")
async def create_alert(payload: dict):
    email    = payload.get("email", "")
    keywords = payload.get("keywords", [])
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    # In production: save to DB + send confirmation email
    print(f"[Alert] New alert: {email} → {keywords}")
    return {"status": "created", "message": f"Alerts activated for {email}"}


# ── AI RESUME MATCH ──────────────────────────────────────────────────────────
MAX_RESUME_CHARS = 8000
RESUME_MATCH_JOB_LIMIT = 25

def _extract_resume_text(filename: str, content: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return content.decode("utf-8", errors="ignore")

# Seniority signal words — used to avoid matching a fresher's resume to a "Staff/Principal" role and vice versa
SENIOR_WORDS = ["senior", "staff", "principal", "lead", "architect", "head of", "manager", "director"]
ENTRY_WORDS  = ["entry level", "entry-level", "fresher", "graduate", "new grad", "intern", "junior", "trainee", "associate"]

def _seniority_level(text: str) -> str:
    t = text.lower()
    if any(w in t for w in SENIOR_WORDS):
        return "senior"
    if any(w in t for w in ENTRY_WORDS):
        return "entry"
    return "mid"

def _match_resume_to_jobs(resume_text: str, jobs: list[dict]) -> list[dict]:
    """Free, deterministic resume-to-job matching based on skill-tag overlap + seniority fit."""
    resume_skills = set(_extract_tags(resume_text, limit=None))
    resume_level = _seniority_level(resume_text)

    matches = []
    for job in jobs:
        job_text = f"{job['title']} {job.get('description','')}"
        job_tags = set(job.get("tags", [])) | set(_extract_tags(job_text, limit=None))
        # Seniority is read from the title only — descriptions often mention
        # "senior engineers" etc. as colleagues, which would be misleading.
        job_level = _seniority_level(job["title"])

        matched = sorted(resume_skills & job_tags)
        missing = sorted(job_tags - resume_skills)[:6]

        skill_score = (len(matched) / len(job_tags) * 100) if job_tags else 30

        adjust = 0
        if resume_level == "entry" and job_level == "senior":
            adjust = -35
        elif resume_level == "senior" and job_level == "entry":
            adjust = -15
        elif resume_level == job_level and resume_level != "mid":
            adjust = 10

        score = max(0, min(100, round(skill_score + adjust)))

        if matched:
            summary = f"Matches {len(matched)} of {len(job_tags)} key skills ({', '.join(matched[:4])})."
        else:
            summary = "No direct skill overlap found — this role may require different skills than your resume shows."
        if resume_level == "entry" and job_level == "senior":
            summary += " Note: this role looks senior-level relative to your resume."
        elif resume_level == "senior" and job_level == "entry":
            summary += " Note: this role may be more junior than your experience level."

        matches.append({
            **job,
            "match_score":    score,
            "match_summary":  summary,
            "matched_skills": matched[:8],
            "missing_skills": missing,
        })

    matches.sort(key=lambda m: m["match_score"], reverse=True)
    return matches


@app.post("/api/resume-match")
async def resume_match(file: UploadFile = File(...)):
    """Upload a resume (PDF or text) and get jobs ranked by skill-overlap fit."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB).")

    try:
        resume_text = _extract_resume_text(file.filename or "", content).strip()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file. Please upload a PDF or .txt resume.")

    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from file. Please upload a PDF or .txt resume.")

    resume_text = resume_text[:MAX_RESUME_CHARS]

    jobs_result = await _aggregate_jobs(
        q="software engineer python AI ML data science data analyst data entry QA tester entry level junior",
        remote=None, page=1, sort="newest", min_sal=None, source="all",
    )
    jobs = jobs_result["jobs"][:RESUME_MATCH_JOB_LIMIT]

    matches = _match_resume_to_jobs(resume_text, jobs)
    return {"matches": matches, "total": len(matches)}
