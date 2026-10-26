# AndroBase Compatibility Matrix & Honest Support Policy

This document details hardware architectures, Android operating system versions, and feature support statuses.

## Feature Implementation & Test Status Legend

- **Implemented and tested**: Code is complete and validated in automated test suite and runtime emulator.
- **Implemented but not yet tested on target physical device**: Code is written and passes automated tests, but physical hardware verification on this specific SoC/firmware is pending community testing.
- **Partially implemented**: Core functionality exists; edge cases or platform-specific adapters remain in progress.
- **Not implemented**: Planned for future releases.
- **Unsupported on selected platform**: Technologically infeasible or unsafe due to operating system or hardware constraints.

---

## Hardware Architectures

| Architecture | Bitness | Target Devices | Profile | Status | Notes |
|:---|:---:|:---|:---:|:---:|:---|
| **ARM64 (`aarch64`)** | 64-bit | Modern Android phones (Snapdragon, MediaTek, Exynos) | Profile B / C | **Implemented and tested** | Primary development and test target. Full instruction set and V8 WebCrypto supported. |
| **ARMv7 (`armv7l`)** | 32-bit | Older smartphones (2012–2017) | Profile A | **Implemented and tested** | Pure JS portable database engine ensures zero native build failures. |
| **x86_64** | 64-bit | Android emulators, ChromeOS, Intel Linux | Profile B / C | **Implemented and tested** | Supported in CI and desktop development. |
| **x86 (32-bit)** | 32-bit | Rare Atom Android tablets (e.g., Zenfone 2) | Profile A | **Implemented but not yet tested on target physical device** | Supported by Node runtime; requires Profile A memory ceiling. |

---

## Operating System & Android Versions

| Android Version | API Level | Termux Support | Assigned Profile | Status | Notes |
|:---|:---:|:---:|:---:|:---:|:---|
| **Android 12 – 15+** | 31–35 | Supported (F-Droid) | Profile C | **Implemented and tested** | Phantom process killer must be disabled (`adb shell device_config put activity_manager max_phantom_processes 2147483647`). |
| **Android 8.0 – 11.0** | 26–30 | Supported (F-Droid) | Profile B | **Implemented and tested** | Optimal stability. Native wake-lock support via `termux-api`. |
| **Android 5.1 – 7.1** | 22–25 | Legacy Termux builds | Profile A | **Implemented but not yet tested on target physical device** | Requires legacy Termux bootstrap archives; uses Profile A conservative parameters. |
| **Android < 5.0** | < 21 | Deprecated | Unsupported | **Unsupported on selected platform** | Modern Node.js V8 requires TLS and Linux kernel primitives not present in Android < 5.0. |

---

## Core Feature Status Matrix

| Feature | Profile A (Legacy) | Profile B (Standard) | Profile C (Advanced) | Status |
|:---|:---:|:---:|:---:|:---|
| **Pre-flight Capability Detection** | Yes | Yes | Yes | **Implemented and tested** |
| **Embedded Portable DB (WAL + Atomic)** | Yes | Yes | Yes | **Implemented and tested** |
| **Database Transactions & Rollback** | Yes | Yes | Yes | **Implemented and tested** |
| **Schema Migrations Tracking** | Yes | Yes | Yes | **Implemented and tested** |
| **PBKDF2 Password Hashing** | Yes (10k rounds) | Yes (10k rounds) | Yes (20k rounds) | **Implemented and tested** |
| **Local Admin Bootstrap Token** | Yes | Yes | Yes | **Implemented and tested** |
| **Rate Limiter (Brute-Force Guard)** | Yes | Yes | Yes | **Implemented and tested** |
| **Path Traversal & Executable Upload Filter** | Yes | Yes | Yes | **Implemented and tested** |
| **Private File Storage Engine** | Yes (10MB max) | Yes (20MB max) | Yes (50MB max) | **Implemented and tested** |
| **Automated JSON/SHA256 Backups** | Yes | Yes | Yes | **Implemented and tested** |
| **Pre-Restore Rollback Snapshot** | Yes | Yes | Yes | **Implemented and tested** |
| **Web Management Console** | Yes | Yes | Yes | **Implemented and tested** |
| **LAN IP & SSH Tunnel Guides** | Yes | Yes | Yes | **Implemented and tested** |
| **Flash-Safe Audit Log Rotation** | Yes | Yes | Yes | **Implemented and tested** |
| **PostgreSQL External DB Adapter** | No | Optional | Supported | **Partially implemented** (Planned native client driver) |
| **P2P Multi-Device Sync** | No | No | Optional | **Not implemented** (Future roadmap) |
