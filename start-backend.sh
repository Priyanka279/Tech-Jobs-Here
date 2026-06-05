#!/usr/bin/env bash
# ── Start TechJobs Hub Backend ───────────────────────────────────────────────
set -e

cd "$(dirname "$0")/backend"

echo "🐍 Setting up Python environment..."

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

pip install -q -r requirements.txt

# Copy .env.example to .env if not present
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  Created backend/.env from template."
  echo "   Add your API keys for live job data (optional — works without them)."
  echo ""
fi

# Load env vars
export $(grep -v '^#' .env | xargs 2>/dev/null) || true

echo ""
echo "✅ Backend starting at http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
