#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Service & Daemon Controller with Android Wakelock Management & Health Verification
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="${ANDROBASE_DATA_DIR:-${HOME:-.}/.androbase}"
PID_FILE="$DATA_DIR/androbase.pid"
LOG_FILE="$DATA_DIR/logs/server-daemon.log"
PORT="${PORT:-3000}"

# Ensure runtime directories exist
mkdir -p "$DATA_DIR/logs"

acquire_wakelock() {
  if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
    echo "  [+] Acquired Termux wake-lock (CPU sleep prevented)."
  fi
}

release_wakelock() {
  if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock
    echo "  [-] Released Termux wake-lock."
  fi
}

find_entry_point() {
  if [ -f "$ROOT_DIR/server.js" ]; then
    echo "node|$ROOT_DIR/server.js"
  elif [ -f "$ROOT_DIR/server.ts" ] && command -v tsx >/dev/null 2>&1; then
    echo "tsx|$ROOT_DIR/server.ts"
  elif [ -f "$ROOT_DIR/server.ts" ] && command -v npx >/dev/null 2>&1; then
    echo "npx tsx|$ROOT_DIR/server.ts"
  else
    echo ""
  fi
}

check_http_health() {
  local health_url="http://127.0.0.1:${PORT}/api/v1/health"
  if command -v curl >/dev/null 2>&1; then
    curl -s -f -m 2 "$health_url" >/dev/null 2>&1
    return $?
  else
    # Fallback to Node built-in http check
    node -e "
      const http = require('http');
      const req = http.get('${health_url}', { timeout: 2000 }, (res) => {
        process.exit(res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1);
      });
      req.on('error', () => process.exit(1));
      req.on('timeout', () => { req.destroy(); process.exit(1); });
    " >/dev/null 2>&1
    return $?
  fi
}

start_service() {
  # 1. Clean up stale PID file if process no longer exists
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "AndroBase is already running (PID: $OLD_PID)."
      exit 0
    else
      echo "Removing stale PID file (previous PID: ${OLD_PID:-unknown})."
      rm -f "$PID_FILE"
    fi
  fi

  # 2. Determine actual runnable entry point
  ENTRY_SPEC=$(find_entry_point)
  if [ -z "$ENTRY_SPEC" ]; then
    echo "❌ Error: No runnable server entry point found."
    echo "   Neither 'server.js' nor a working TypeScript runner for 'server.ts' was detected."
    echo "   Please compile the server bundle first by running: npm run build"
    exit 1
  fi

  RUNNER=$(echo "$ENTRY_SPEC" | cut -d '|' -f 1)
  ENTRY_FILE=$(echo "$ENTRY_SPEC" | cut -d '|' -f 2)

  echo "Starting AndroBase daemon..."
  echo "  Entry point: $ENTRY_FILE ($RUNNER)"
  echo "  Log output:  $LOG_FILE"

  acquire_wakelock

  cd "$ROOT_DIR"
  if [ "$RUNNER" = "node" ]; then
    nohup node --max-old-space-size=256 "$ENTRY_FILE" >> "$LOG_FILE" 2>&1 &
  elif [ "$RUNNER" = "tsx" ]; then
    nohup tsx "$ENTRY_FILE" >> "$LOG_FILE" 2>&1 &
  else
    nohup npx tsx "$ENTRY_FILE" >> "$LOG_FILE" 2>&1 &
  fi

  PID=$!
  echo "$PID" > "$PID_FILE"

  # 3. Verify server startup & health ping (wait up to 6 seconds)
  echo -n "  Waiting for HTTP server to become healthy on port ${PORT}..."
  HEALTHY=false

  for _ in {1..12}; do
    # Check if process is still alive
    if ! kill -0 "$PID" 2>/dev/null; then
      echo ""
      echo "❌ Server process terminated unexpectedly during startup!"
      echo "--- Last 20 lines from $LOG_FILE ---"
      tail -n 20 "$LOG_FILE" 2>/dev/null || true
      echo "------------------------------------"
      rm -f "$PID_FILE"
      release_wakelock
      exit 1
    fi

    if check_http_health; then
      HEALTHY=true
      break
    fi

    sleep 0.5
    echo -n "."
  done
  echo ""

  if [ "$HEALTHY" = true ]; then
    echo "✅ AndroBase is running and verified healthy (PID: $PID)."
    echo "   Local URL: http://127.0.0.1:${PORT}"
    exit 0
  else
    echo "❌ Server process is running (PID: $PID) but failed HTTP health check after 6 seconds."
    echo "--- Last 15 lines from $LOG_FILE ---"
    tail -n 15 "$LOG_FILE" 2>/dev/null || true
    echo "------------------------------------"
    stop_service
    exit 1
  fi
}

stop_service() {
  if [ ! -f "$PID_FILE" ]; then
    echo "AndroBase is not running (no PID file found at $PID_FILE)."
    exit 0
  fi

  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping AndroBase (PID: $PID)..."
    kill -15 "$PID" 2>/dev/null || true # SIGTERM for graceful flush

    # Wait up to 5 seconds
    for _ in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done

    if kill -0 "$PID" 2>/dev/null; then
      echo "Process still alive after 5 seconds. Force stopping PID $PID..."
      kill -9 "$PID" 2>/dev/null || true
    fi
    echo "✅ AndroBase stopped."
  else
    echo "Process ${PID:-unknown} not running."
  fi

  rm -f "$PID_FILE"
  release_wakelock
}

status_service() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
      if check_http_health; then
        echo "AndroBase is RUNNING (PID: $PID, Health: OK, Port: $PORT)."
        exit 0
      else
        echo "AndroBase process is ACTIVE (PID: $PID) but NOT RESPONDING to HTTP health checks on port $PORT."
        exit 2
      fi
    else
      echo "AndroBase is STOPPED (stale PID file found)."
      rm -f "$PID_FILE"
      exit 1
    fi
  else
    echo "AndroBase is STOPPED."
    exit 3
  fi
}

case "${1:-}" in
  start)
    start_service
    ;;
  stop)
    stop_service
    ;;
  restart)
    stop_service
    sleep 1
    start_service
    ;;
  status)
    status_service
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
