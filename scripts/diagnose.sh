#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Pre-Flight Diagnostic & Capability Inspection Tool
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

echo "============================================================"
echo "  🔍 ANDROBASE HARDWARE & RUNTIME DIAGNOSTIC CHECK"
echo "============================================================"

# Architecture
ARCH=$(uname -m)
echo "CPU Architecture:      $ARCH"

# Memory
if [ -f /proc/meminfo ]; then
  MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  MEM_AVAIL_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
  echo "Total System RAM:      $((MEM_TOTAL_KB / 1024)) MB"
  echo "Available RAM:         $((MEM_AVAIL_KB / 1024)) MB"
fi

# Android API Level
if [ -f /system/build.prop ]; then
  API_LEVEL=$(grep -E "ro.build.version.sdk=" /system/build.prop | head -n 1 | cut -d '=' -f 2 || true)
  if [ -n "$API_LEVEL" ]; then
    echo "Android API Level:     $API_LEVEL"
  fi
fi

# Node.js
if command -v node >/dev/null 2>&1; then
  echo "Node.js Runtime:       $(node -v) (Found)"
else
  echo "Node.js Runtime:       NOT FOUND"
fi

# Termux API
if command -v termux-wake-lock >/dev/null 2>&1; then
  echo "Termux Wake-Lock:      AVAILABLE"
else
  echo "Termux Wake-Lock:      NOT INSTALLED (Run 'pkg install termux-api')"
fi

# Network
echo ""
echo "Detected Network Interfaces:"
if command -v ip >/dev/null 2>&1; then
  ip -4 addr show | grep -E "inet |state" || true
elif command -v ifconfig >/dev/null 2>&1; then
  ifconfig | grep "inet " || true
fi

echo "============================================================"
