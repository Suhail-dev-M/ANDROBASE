# AndroBase Architecture & Design Specification

## Overview

AndroBase is engineered specifically to operate under the constraints and realities of mobile hardware running Android Linux layers (primarily Termux).

Unlike standard server platforms designed for cloud virtual machines with unlimited swap, stable wall power, and systemd init systems, mobile devices present unique design hurdles:

1. **Android Low Memory Killer (LMK)**: The Android kernel aggressively terminates background processes when foreground apps demand memory.
2. **Aggressive Doze & CPU Sleep**: When screens turn off, the Android OS puts the CPU into low-power states unless explicit wake-locks are held.
3. **Storage Flash Wear**: High-frequency writes can wear out eMMC/UFS storage on older phones.
4. **Toolchain & Compiler Gaps**: Many older 32-bit ARMv7 Android devices cannot compile native Node addons (e.g. `sqlite3`, `bcrypt`) due to broken or missing clang/NDK headers in legacy Termux repos.
5. **Dynamic LAN Addressing**: Mobile devices frequently change IP addresses between Wi-Fi roaming and cellular handoffs.

---

## The Three Compatibility Profiles

AndroBase uses runtime capability discovery to automatically select a compatibility profile:

### Profile A: Legacy Mobile
- **Target**: Android 5.1–7.1.2, 32-bit ARMv7 (`armv7l`), 512MB–1GB RAM.
- **Engine Rules**:
  - Max heap bound to 128MB (`--max-old-space-size=128`).
  - Single-threaded disk operations.
  - PBKDF2 iterations tuned to prevent CPU thermal throttling.
  - In-memory caching minimized.
  - Upload file size capped at 10MB.
- **Disabled**: Background scheduled cron jobs, external database adapters, heavy image transformations.

### Profile B: Standard Mobile
- **Target**: Android 8.0–11.0, 32-bit or 64-bit ARM (`aarch64`), 1GB–3GB RAM.
- **Engine Rules**:
  - Full relational database support with JSON document capabilities.
  - 20MB file upload limits with full SHA-256 validation.
  - JWT / session token rotation and rate-limiting bucket.
  - Automated database backup snapshots.

### Profile C: Advanced Mobile / Edge
- **Target**: Android 12+, 64-bit ARM (`aarch64`), 4GB+ RAM.
- **Engine Rules**:
  - High concurrency request pooling.
  - Automated integrity checks and scheduled maintenance.
  - Faster cryptographic rounds and real-time telemetry streaming.

---

## Embedded Database Engine Design

To avoid dependency on native C++ compilation, AndroBase features an independent file-backed database engine (`PortableDatabase`):
- **Atomic Disk Synchronization**: Writes data to a temporary file (`.tmp`) before calling `fs.renameSync`. On POSIX systems, `rename` is an atomic filesystem operation. If Android LMK kills the process mid-write, the existing database file remains intact.
- **Write-Ahead Log (WAL)**: Journal changes before committing.
- **Schema Migrations**: Tracks version history in `_androbase_migrations`.
- **Query Engine**: Supports parameterized filtering (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`), sorting, and hard-bounded pagination (maximum 1,000 rows per query) to avoid memory spikes.

---

## Separated Build & Runtime Architecture

To ensure flawless installation on resource-constrained Android smartphones without encountering compiler failures, missing NDK toolchains, or unsupported Node.js engine versions:

1. **Development & Compilation Phase (PC / CI Runner)**:
   - Modern development tools (`vite`, `esbuild`, `tailwindcss`, `typescript`, `@types/*`) compile the client React application into static assets in `dist/`.
   - The backend `server.ts` is bundled into a standalone `server.js` targeting Node.js 14+ (`esbuild server.ts --bundle --platform=node --format=esm --target=node14 --outfile=server.js ...`).
   - All TypeScript parameter and type annotations are stripped; modern syntax features (like optional chaining and nullish coalescing) are safely down-leveled.

2. **Mobile Runtime Execution Phase (Android Smartphone / Termux)**:
   - The smartphone only needs to install pure-JavaScript production dependencies (`express`, `multer`, `dotenv`).
   - The server is launched via `node server.js` (or managed as a background daemon via `bash scripts/service.sh start`).
   - No compiler, native binary wrappers, or heavy dev tools ever run on the phone.
   - The background daemon actively monitors process survival and verifies HTTP response on `/api/v1/health` before confirming startup.
