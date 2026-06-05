#!/usr/bin/env bash
# ── Start TechJobs Hub Frontend ──────────────────────────────────────────────
set -e

cd "$(dirname "$0")/frontend"

echo "⚛️  Installing frontend dependencies..."
npm install

echo ""
echo "✅ Frontend starting at http://localhost:5173"
echo "   (API calls are proxied to http://localhost:8000)"
echo ""

npm run dev
