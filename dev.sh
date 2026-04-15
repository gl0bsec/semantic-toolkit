#!/bin/bash
set -e

LOGDIR="$(cd "$(dirname "$0")" && pwd)/.logs"
mkdir -p "$LOGDIR"

# Kill any existing instances
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Start backend
source .venv/bin/activate
python3 toolkit/server/serve.py --port 8080 > "$LOGDIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Start frontend
cd toolkit/UI && npm run dev > "$LOGDIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo ""
echo "Home: http://localhost:8080/home/home.html"
echo ""
echo "Logs: .logs/backend.log, .logs/frontend.log"
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
