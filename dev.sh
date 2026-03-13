#!/bin/bash
set -e

# Kill any existing instances
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Start backend
source .venv/bin/activate
python3 toolkit/server/serve.py --dataset RU_AFR_EXPERIMENT --port 8080 &
BACKEND_PID=$!

# Start frontend
cd toolkit/UI && npm run dev &
FRONTEND_PID=$!

echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
