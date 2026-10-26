#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Automated Termux & Android Linux Installer
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

echo ""
echo "============================================================"
echo "  📱 ANDROBASE INSTALLER FOR ANDROID / TERMUX"
echo "============================================================"
echo ""

# 1. Environment & Architecture Detection
echo "[1/7] Inspecting device architecture and environment..."
ARCH=$(uname -m)
KERNEL=$(uname -r)
echo "  Architecture: $ARCH"
echo "  Kernel:       $KERNEL"

IS_TERMUX=false
if [ -n "${TERMUX_VERSION:-}" ] || [ -d "/data/data/com.termux" ]; then
  IS_TERMUX=true
  echo "  Environment:  Termux on Android (detected)"
else
  echo "  Environment:  Generic Linux/POSIX environment"
fi

# 2. Dependency Checks (Node.js & npm/coreutils)
echo ""
echo "[2/7] Checking runtime dependencies..."

if ! command -v node >/dev/null 2>&1; then
  echo "  [!] Node.js is not installed."
  if [ "$IS_TERMUX" = true ]; then
    echo "      Installing Node.js via Termux package manager..."
    pkg update -y
    pkg install -y nodejs-lts
  else
    echo "      Please install Node.js (version 18 or newer recommended)."
    exit 1
  fi
fi

NODE_VER=$(node -v)
echo "  Node.js version: $NODE_VER (OK)"

# Check Termux API for wakelock
if [ "$IS_TERMUX" = true ]; then
  if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "  Termux Wake-Lock: Available (OK)"
  else
    echo "  [!] Optional: termux-api package recommended for preventing Android CPU sleep."
    echo "      You can install it with: pkg install termux-api"
  fi
fi

# 3. Directory Structure Setup
echo ""
echo "[3/7] Creating safe application directories..."
DATA_DIR="${HOME:-.}/.androbase"
mkdir -p "$DATA_DIR/storage"
mkdir -p "$DATA_DIR/backups"
mkdir -p "$DATA_DIR/logs"
chmod 700 "$DATA_DIR"
echo "  Data directory: $DATA_DIR (mode 0700 safe)"

# 4. Generate Initial Configuration (.env)
echo ""
echo "[4/7] Generating configuration..."
ENV_FILE="$DATA_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat <<EOF > "$ENV_FILE"
# AndroBase Server Configuration
HOST=0.0.0.0
PORT=3000
NODE_ENV=production
ANDROBASE_DATA_DIR=$DATA_DIR
ANDROBASE_JWT_SECRET=$JWT_SECRET
ANDROBASE_ALLOW_LAN=true
ANDROBASE_MAX_UPLOAD_BYTES=20971520
ANDROBASE_MAX_MEMORY_MB=256
EOF
  chmod 600 "$ENV_FILE"
  echo "  Configuration written to $ENV_FILE"
else
  echo "  Existing configuration found. Preserving current settings."
fi

# 5. Install Project Dependencies
echo ""
echo "[5/7] Installing application dependencies..."
if [ -f "package.json" ]; then
  npm install --omit=dev --no-audit --no-fund
  echo "  Dependencies installed successfully."
fi

# 6. Pre-flight Capability Test
echo ""
echo "[6/7] Running pre-flight system diagnostics..."
node -e "console.log('  V8 Heap Limit:', Math.round(require('v8').getHeapStatistics().heap_size_limit / (1024*1024)) + ' MB');"

# 7. Complete & Instructions
echo ""
echo "============================================================"
echo "  ✅ ANDROBASE INSTALLATION COMPLETE!"
echo "============================================================"
echo ""
echo "To start the server now:"
echo "  ./scripts/service.sh start"
echo ""
echo "Or start directly with Node:"
echo "  node server.ts"
echo ""
echo "Dashboard will be accessible at:"
echo "  Local: http://127.0.0.1:3000"
echo "  LAN:   http://<YOUR_PHONE_WIFI_IP>:3000"
echo ""
echo "Important: Acquire wakelock in Termux to prevent sleep:"
echo "  termux-wake-lock"
echo "============================================================"
