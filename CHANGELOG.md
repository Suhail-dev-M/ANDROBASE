# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc1] - 2026-10-25

### Added
- **Hardware & Android Capability Engine**: Real-time inspection of CPU architecture, bitness, available RAM, Android API level, Termux environment, and storage write permissions.
- **Three Compatibility Profiles**: Profile A (Legacy), Profile B (Standard), and Profile C (Advanced) based on genuine hardware checks.
- **Portable Relational & Document Database**: Embedded zero-native-build engine with atomic write synchronization (`renameSync`), WAL journaling, transactions, rollback safety, and schema migrations.
- **Security & Auth Engine**: PBKDF2 password hashing with random salt, constant-time verification, session token hashes, rate-limiting lockout against brute force, and local admin bootstrap tokens.
- **Private File Storage**: File upload/download engine with strict path traversal rejection, executable payload blocking (`.apk`, `.sh`, `.dex`, `.so`), and storage quota monitoring.
- **Backup & Recovery**: Timestamped JSON snapshots with SHA-256 integrity verification, pre-restore rollback safety snapshot, and CLI tarball utility.
- **Responsive Web Management Dashboard**: Full-featured developer console for managing tables, files, users, backups, and network access from any browser on the LAN.
- **Network Discovery & SSH Tunnel Generator**: Auto-discovery of Wi-Fi LAN IP, hotspot IP (`192.168.43.1`), and copyable SSH port forwarding commands.
- **Automated Test Suite**: 10 unit, integration, and security test cases verifying database rollback, rate limiting, traversal prevention, and backup integrity.
- **Termux Shell Scripts**: `install.sh`, `service.sh` with wake-lock support, `diagnose.sh`, and `backup.sh`.
