# AndroBase

**Universal Lightweight Open-Source Mobile Server and Edge Backend Platform**

Turn old, spare, or idle Android smartphones into self-hosted personal backend servers accessible across your local network (LAN), over secure SSH tunnels, or via direct USB tethering.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/arch-ARMv7%20%7C%20ARM64%20%7C%20x86__64-success.svg)](docs/COMPATIBILITY_MATRIX.md)
[![Profiles](https://img.shields.io/badge/profiles-Legacy%20%7C%20Standard%20%7C%20Advanced-emerald.svg)](docs/ARCHITECTURE.md)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](test/run-tests.ts)

---

## Why AndroBase?

Millions of capable smartphones end up unused in drawers while still featuring multi-core ARM processors, gigabytes of flash storage, battery backup (built-in uninterruptible power supply), and Wi-Fi connectivity.

AndroBase brings these devices back to life as independent, energy-efficient self-hosted backend servers. It offers a zero-vendor-lock-in platform specifically engineered for Android and Termux hardware constraints.

### Core Highlights

- **Universal Hardware & Capability Detection**: Automatically inspects device CPU architecture, available RAM, Android API levels, storage write permissions, cryptographic primitives, and Termux APIs.
- **Three Compatibility Profiles**:
  - **Profile A (Legacy)**: Tailored for low-spec devices (ARMv7 32-bit, Android 5.1 to 7.x, or under 1GB RAM) with conservative memory usage, full CRUD database operations, and sandboxed file storage.
  - **Profile B (Standard)**: For standard devices (Android 8 to 11, 1GB to 3GB RAM) with full relational tables, user authentication, file storage with quotas, and automated backups.
  - **Profile C (Advanced)**: For higher-end devices (Android 12+, 4GB+ RAM, ARM64) with background maintenance, multi-database sync, and expanded request concurrency.
- **Pure JavaScript Embedded Database**: Runs reliably in Termux without requiring native C++ compilers (`node-gyp`) or Android NDK toolchains. Includes transaction support, schema migrations, and write-ahead journaling (WAL).
- **Private File Storage**: File uploads with strict path-traversal sanitization, quota monitoring, and executable payload blocking (`.apk`, `.sh`, `.dex`, `.so`).
- **Cryptographic Security**: PBKDF2 password hashing with unique per-user salts, constant-time verification, session token hashes, sliding brute-force rate limiting, and local bootstrap tokens.
- **LAN and Tunnel Management**: Direct IP pairing, stylized QR connection frame, ADB USB port forwarding, and one-command SSH port forwarding for encrypted remote management.
- **Responsive Web Console**: Touch-friendly dashboard for desktop and mobile browsers to inspect health, query database tables, insert records, upload files, and manage snapshot backups.

---

## Architecture Overview

```
                       +---------------------------------------+
                       |   Client (PC / Laptop / Phone)        |
                       |   Web Dashboard  / REST API Client    |
                       +---------------------------------------+
                                           |
                       (LAN HTTP, SSH Tunnel, or USB ADB)
                                           |
                                           v
+-------------------------------------------------------------------------------+
|                       ANDROBASE MOBILE SERVER ENGINE                          |
|                                                                               |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  |  Capability Engine |  |  Security / Auth   |  |  Network & Interface    |  |
|  |  (Profile A / B / C)| |  (PBKDF2, RBAC)    |  |  (LAN IP & SSH Guides)  |  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|                                                                               |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  | Portable DB Engine |  | Private File Store |  |  Flash-Safe Audit Log   |  |
|  | (Atomic WAL Sync)  |  | (Traversal Guard)  |  |  (Auto Size Rotation)   |  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |              Termux Android Linux Layer & Wakelock Guard                |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

Detailed architectural specifications are available in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quick Start on Android (via Termux)

### Prerequisites

1. Install **Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/) (avoid the deprecated Google Play Store build).
2. (Recommended) Install **Termux:API** from F-Droid for wake-lock and battery status commands.

### Step 1: Install Dependencies & Clone

Open the Termux app on your phone and run:

```bash
pkg update -y
pkg install -y nodejs-lts git
git clone https://github.com/Suhail-dev-M/ANDROBASE.git
cd ANDROBASE
chmod +x ./scripts/install.sh ./scripts/service.sh
bash scripts/install.sh
```

### Step 2: Start the Server

```bash
# Option A: Start in background with automatic wakelock protection:
bash scripts/service.sh start

# Option B: Run directly in the foreground:
node server.js
```

To verify the service status at any time:
```bash
bash scripts/service.sh status
```

To stop the background service:
```bash
bash scripts/service.sh stop
```

---

## Accessing the Dashboard & First-Time Setup

### Step 1: Get Your Admin Bootstrap Token

When starting for the first time, AndroBase generates a one-time bootstrap token for secure administrator initialization. Run this command in Termux:

```bash
cat ~/.androbase/.bootstrap_token 2>/dev/null || cat .androbase_data/.bootstrap_token 2>/dev/null
```

### Step 2: Open the Web Console

Open your browser and navigate to:
- **On the smartphone itself**: `http://127.0.0.1:3000`
- **From a laptop on the same Wi-Fi**: `http://<PHONE_IP>:3000` (e.g., `http://192.168.1.15:3000`)

### Step 3: Initialize the Administrator Account

1. Click the **Set Up Admin** button in the header.
2. Enter the bootstrap token retrieved in Step 1.
3. Choose your administrator username and password (minimum 8 characters).
4. Click **Initialize Admin**. You will be logged in immediately.

---

## Connecting from Your Computer

### Method 1: Local Wi-Fi (LAN)
Make sure your computer and phone are connected to the same Wi-Fi network. Find your phone's IP address in the AndroBase dashboard under the **Network** tab or run `ifconfig wlan0` in Termux, then visit `http://<PHONE_IP>:3000`.

### Method 2: Direct USB Cable (ADB Port Forwarding)
No Wi-Fi needed. Plug your phone into your laptop via USB with USB Debugging enabled, and run:

```bash
adb forward tcp:3000 tcp:3000
```

Then open `http://localhost:3000` in your computer's browser.

### Method 3: Encrypted SSH Tunnel
If you are on an untrusted public Wi-Fi network, forward port 3000 securely over SSH:

- **macOS / Linux**:
  ```bash
  ssh -N -L 3000:localhost:3000 -p 8022 <termux_user>@<PHONE_IP>
  ```
- **Windows PowerShell**:
  ```powershell
  ssh -N -L 3000:localhost:3000 -p 8022 <termux_user>@<PHONE_IP>
  ```

Once connected, open `http://localhost:3000` on your computer.

---

## Keeping the Server Running 24/7

Android aggressively suspends background processes when the screen turns off or when battery saving is active. To ensure uninterrupted operation:

1. **Acquire CPU Wake-Lock**:
   Run this command in Termux:
   ```bash
   termux-wake-lock
   ```
2. **Disable Battery Optimization**:
   Go to your Android phone's **Settings > Apps > Termux > Battery** (or App Info > Battery) and select **Unrestricted** (or "Don't optimize").
3. **Keep Wi-Fi Active During Sleep**:
   Under **Settings > Wi-Fi > Advanced**, ensure Wi-Fi is configured to stay connected during sleep mode.

---

## REST API Overview

All endpoints are versioned under `/api/v1` and support standard JSON bodies.

### System Endpoints (Public)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Server health, uptime, and memory usage |
| `GET` | `/api/v1/status` | System status, active profile, and database metrics |
| `GET` | `/api/v1/capabilities` | Hardware detection results and profile report |
| `GET` | `/api/v1/network/interfaces`| Available network adapters and SSH instructions |

### Authentication Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/bootstrap` | One-time admin creation using bootstrap token |
| `POST` | `/api/v1/auth/login` | Authenticate using username/email and password |
| `POST` | `/api/v1/auth/logout` | Invalidate current session token |
| `GET` | `/api/v1/auth/me` | Inspect current user and session details |

### Database & Storage Endpoints (Authenticated)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/db/tables` | List all database tables and record counts |
| `POST` | `/api/v1/db/tables` | Create a new custom table (Admin only) |
| `DELETE` | `/api/v1/db/tables/:name` | Drop a table (Admin only) |
| `POST` | `/api/v1/db/:table/query` | Query rows with filters, sorting, and pagination |
| `POST` | `/api/v1/db/records/:table`| Insert a new record into a table |
| `DELETE` | `/api/v1/db/records/:table/:id` | Delete a specific record by ID |
| `GET` | `/api/v1/storage/files` | List private files stored on the phone |
| `POST` | `/api/v1/storage/files` | Upload a file via multipart form-data |
| `GET` | `/api/v1/storage/:id` | Download a stored file |
| `DELETE` | `/api/v1/storage/files/:id` | Delete a file from storage |
| `GET` | `/api/v1/backups` | List snapshot archives with SHA-256 integrity |
| `POST` | `/api/v1/backups` | Generate an atomic point-in-time snapshot |

Include your Bearer token in the request header:
```text
Authorization: Bearer <your_jwt_token>
```

---

## Development vs Production Mobile Architecture

To support low-spec Android devices and older Node.js runtimes without CPU freezes or compilation errors:

- **Development & Build (PC / Laptop)**:
  Run `npm run build` to compile the web console into static assets (`dist/`) and bundle the backend into a standalone CommonJS file (`server.js`).
- **Production Runtime (Android / Termux)**:
  The smartphone only needs lightweight pure-JavaScript production dependencies (`express`, `multer`, `dotenv`). It does not run native C++ compilations, Android NDK toolchains, or development build packages like `vite`, `esbuild`, or `tsx`.

---

## Testing & Verification

Run the automated test suite:

```bash
npm test
```

This verifies:
- Configuration parsing and hardware capability detection.
- Portable UUID generation across modern and legacy Node.js runtimes.
- Database engine CRUD, transactions, and rollback safety.
- PBKDF2 password hashing, verification, and rate-limiting lockout.
- Path traversal and executable upload prevention.
- Snapshot archive generation and SHA-256 integrity checks.
- Mobile script syntax and dependency boundaries.

---

## Documentation

- [Architecture & Profiles](docs/ARCHITECTURE.md)
- [Universal Compatibility Matrix](docs/COMPATIBILITY_MATRIX.md)
- [Security Threat Model & Best Practices](docs/SECURITY_GUIDE.md)
- [Backup & Disaster Recovery Guide](docs/BACKUP_AND_RESTORE.md)
- [API Reference (v1)](docs/API_REFERENCE.md)
- [Troubleshooting & Android FAQ](docs/TROUBLESHOOTING.md)

---

## Contributing

We welcome contributions from developers, security researchers, and mobile hardware enthusiasts. Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

AndroBase is licensed under the [Apache License, Version 2.0](LICENSE).
