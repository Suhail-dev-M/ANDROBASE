# AndroBase Backup, Verification & Recovery Guide

## Philosophy: Never Lose Mobile Data

Smartphones are prone to battery exhaustion, sudden drops, and OS process termination. A reliable backup and restore system is vital.

AndroBase provides two independent backup mechanisms:
1. **API / Dashboard Automated Snapshot**: Creates structured JSON archives with table dumps, file inventories, config metadata, and SHA-256 integrity checksums.
2. **CLI Shell Backup Utility (`scripts/backup.sh`)**: Creates gzipped tarballs of the entire `.androbase` directory for automated cron jobs or off-device transfer.

---

## 1. Creating a Backup

### Via Dashboard
1. Navigate to the **Backups** tab in the web console.
2. Click **Create Snapshot Backup**.
3. The server takes an atomic snapshot of all tables, calculates the SHA-256 digest, and writes it to `.androbase/backups/`.
4. Click **Download** to save a copy directly to your computer.

### Via REST API
```bash
curl -X POST http://<PHONE_IP>:3000/api/v1/backup/create \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Via Termux CLI
```bash
./scripts/backup.sh
```

---

## 2. Restoring a Backup

AndroBase incorporates a **Safety Rollback Guard**:
Before any restoration takes effect, the server automatically saves a pre-restore rollback snapshot (`pre_restore_rollback_<timestamp>.json`). If parsing or schema migration fails mid-restore, the database immediately reverts to its pre-restore state.

### Via Web Dashboard
1. Open the **Backups** tab.
2. Click **Restore** next to any verified backup.
3. Confirm the restoration warning dialog.

### Via REST API
```bash
curl -X POST http://<PHONE_IP>:3000/api/v1/backup/restore \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename": "androbase_backup_2026-10-25T15-00-00-000Z.json"}'
```

---

## 3. Off-Device Sync & Export

To safeguard backups from phone hardware failure:
```bash
# From your computer, pull backups over SCP:
scp -P 8022 <termux-user>@<PHONE_IP>:~/.androbase/backups/* ./phone_backups/
```
