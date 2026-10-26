#!/bin/bash
# ==============================================================================
# AndroBase - Open-Source Mobile Server Platform
# Standalone CLI Backup Tool
# SPDX-License-Identifier: Apache-2.0
# ==============================================================================

set -euo pipefail

DATA_DIR="${HOME:-.}/.androbase"
BACKUP_DIR="$DATA_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cli_backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating atomic backup of AndroBase data..."

if [ ! -d "$DATA_DIR" ]; then
  echo "Error: Data directory $DATA_DIR does not exist."
  exit 1
fi

tar --exclude="*.log" --exclude="*.tmp*" --exclude="backups" \
  -czf "$BACKUP_FILE" -C "$DATA_DIR" .

SHA=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")

echo "Backup complete:"
echo "  File:    $BACKUP_FILE"
echo "  Size:    $SIZE bytes"
echo "  SHA-256: $SHA"
