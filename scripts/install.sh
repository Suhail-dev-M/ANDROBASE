#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Automated Termux & Android Linux Installer with Runtime Validation
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "============================================================"
echo "  📱 ANDROBASE INSTALLER FOR ANDROID / TERMUX"
echo "============================================================"
echo ""

# Ensure all scripts are executable
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

# 1. Environment & Architecture Detection
echo "[1/6] Inspecting device architecture and environment..."
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
echo "[2/6] Checking runtime dependencies..."

if ! command -v node >/dev/null 2>&1; then
  echo "  [!] Node.js is not installed."
  if [ "$IS_TERMUX" = true ]; then
    echo "      Installing Node.js and curl via Termux package manager..."
    pkg update -y
    pkg install -y nodejs-lts curl git
  else
    echo "  ❌ Error: Node.js runtime not found. Please install Node.js (version 18+ recommended)."
    exit 1
  fi
fi

if [ "$IS_TERMUX" = true ] && ! command -v curl >/dev/null 2>&1; then
  echo "  [+] Installing curl for health monitoring..."
  pkg install -y curl || true
fi

NODE_VER=$(node -v)
echo "  Node.js version: $NODE_VER"

# Parse major Node.js version
NODE_MAJOR=$(echo "$NODE_VER" | tr -d 'v' | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 14 ]; then
  echo "  ⚠️ Warning: Node.js version is older than v14 (found $NODE_VER)."
  echo "     Running in Profile A (Legacy Mobile) compatibility mode."
fi

# Check Termux API for wakelock
if [ "$IS_TERMUX" = true ]; then
  if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "  Termux Wake-Lock: Available"
  else
    echo "  [!] Recommended: Install termux-api to prevent CPU sleep during server operation:"
    echo "      pkg install termux-api"
  fi
fi

# 3. Directory Structure Setup
echo ""
echo "[3/6] Configuring application directories and permissions..."
DATA_DIR="${ANDROBASE_DATA_DIR:-${HOME:-.}/.androbase}"
mkdir -p "$DATA_DIR/storage"
mkdir -p "$DATA_DIR/backups"
mkdir -p "$DATA_DIR/logs"
chmod 700 "$DATA_DIR" 2>/dev/null || true
echo "  Data directory: $DATA_DIR"

# 4. Generate Initial Configuration (.env)
echo ""
echo "[4/6] Verifying server configuration..."
ENV_FILE="$DATA_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "androbase-fallback-secret-$RANDOM$RANDOM")
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
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  echo "  Configuration written to $ENV_FILE"
else
  echo "  Existing configuration found at $ENV_FILE. Preserving settings."
fi

# 5. Install Production Runtime Dependencies
echo ""
echo "[5/6] Installing production server dependencies (pure JS runtime)..."
cd "$ROOT_DIR"

if [ -f "package.json" ]; then
  # Install only runtime dependencies, skipping dev/build tools and optional native addons
  if ! npm install --omit=dev --omit=optional --legacy-peer-deps --no-audit --no-fund; then
    echo "❌ Error: npm install failed. Please inspect npm error logs above."
    exit 1
  fi

  # Pre-flight check: ensure critical runtime packages load cleanly
  if ! node -e "require('express'); require('multer'); require('dotenv');" >/dev/null 2>&1; then
    echo "❌ Error: Installed packages could not be resolved by Node.js."
    exit 1
  fi
  echo "  Runtime dependencies installed and verified."
fi

# 6. Verify Server Entry Point
echo ""
echo "[6/6] Verifying server entry point..."
if [ -f "$ROOT_DIR/server.cjs" ]; then
  echo "  Found production server bundle: server.cjs (CommonJS ready for all Node versions)"
elif [ -f "$ROOT_DIR/server.js" ]; then
  echo "  Found production server bundle: server.js (Ready for execution)"
elif [ -f "$ROOT_DIR/server.ts" ]; then
  if command -v tsx >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
    echo "  Found server.ts with TypeScript runtime (Ready for development)"
  else
    echo "  ⚠️ Warning: 'server.cjs' / 'server.js' not found. If this is a production device, ensure"
    echo "     the project was built on a PC/CI runner ('npm run build') before deployment."
  fi
else
  echo "❌ Error: No server entry point ('server.cjs', 'server.js', or 'server.ts') was found in $ROOT_DIR."
  exit 1
fi

echo ""
echo "============================================================"
echo "  ✅ ANDROBASE INSTALLATION VERIFIED SUCCESSFULLY!"
echo "============================================================"
echo ""
echo "To start the background server daemon:"
echo "  bash scripts/service.sh start"
echo ""
echo "To check server status and HTTP health:"
echo "  bash scripts/service.sh status"
echo ""
echo "To stop the server daemon:"
echo "  bash scripts/service.sh stop"
echo ""
echo "Or start directly in the foreground:"
echo "  node server.js"
echo ""
echo "Dashboard will be accessible at:"
echo "  Local: http://127.0.0.1:3000"
echo "  LAN:   http://<YOUR_PHONE_WIFI_IP>:3000"
echo "============================================================"
