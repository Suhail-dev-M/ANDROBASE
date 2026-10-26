#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Service & Daemon Controller with Android Wakelock Management
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

PID_FILE="${HOME:-.}/.androbase/androbase.pid"
LOG_FILE="${HOME:-.}/.androbase/logs/server-daemon.log"

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

start_service() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "AndroBase is already running (PID: $(cat "$PID_FILE"))."
    exit 0
  fi

  acquire_wakelock
  echo "Starting AndroBase daemon on Android..."
  mkdir -p "$(dirname "$PID_FILE")" "$(dirname "$LOG_FILE")"

  # Start server with low memory ceiling flag for mobile safety
  nohup node --max-old-space-size=256 server.ts >> "$LOG_FILE" 2>&1 &
  PID=$!
  echo "$PID" > "$PID_FILE"
  echo "AndroBase started with PID $PID."
  echo "Logs streaming to: $LOG_FILE"
}

stop_service() {
  if [ ! -f "$PID_FILE" ]; then
    echo "AndroBase is not running (no PID file found)."
    exit 0
  fi

  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping AndroBase (PID: $PID)..."
    kill -15 "$PID" # SIGTERM for graceful flush
    
    # Wait up to 5 seconds
    for _ in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done

    if kill -0 "$PID" 2>/dev/null; then
      echo "Force stopping PID $PID..."
      kill -9 "$PID"
    fi
    echo "AndroBase stopped."
  else
    echo "Process $PID not found."
  fi

  rm -f "$PID_FILE"
  release_wakelock
}

status_service() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "AndroBase is RUNNING (PID: $(cat "$PID_FILE"))."
  else
    echo "AndroBase is STOPPED."
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
