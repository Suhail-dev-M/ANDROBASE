# AndroBase 📱⚡

**The Universal, Lightweight Open-Source Mobile Server & Edge Backend Platform**

Turn old, idle, or spare Android smartphones into self-hosted personal backend servers accessible across your local network (LAN) and over secure SSH tunnels.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/arch-ARMv7%20%7C%20ARM64%20%7C%20x86__64-success.svg)](docs/COMPATIBILITY_MATRIX.md)
[![Profiles](https://img.shields.io/badge/profiles-Legacy%20%7C%20Standard%20%7C%20Advanced-emerald.svg)](docs/ARCHITECTURE.md)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](test/run-tests.ts)

---

## 🌟 Why AndroBase?

Millions of capable smartphones end up unused in drawers while still featuring multi-core ARM CPUs, gigabytes of flash storage, battery backup (built-in UPS!), and Wi-Fi connectivity. 

**AndroBase** brings these devices back to life as independent, energy-efficient self-hosted backend servers. Inspired by modern Backend-as-a-Service (BaaS) architectures, AndroBase is an independent, zero-vendor-lock-in implementation tailored for Android constraints.

### 🛡️ Core Highlights

- **Universal Hardware & Capability Detection**: Automatically inspects device CPU bitness, available RAM, Android API levels, storage write permissions, cryptographic primitives, and Termux APIs.
- **Three Compatibility Profiles**:
  - **Profile A (Legacy)**: Low-spec devices (ARMv7 32-bit, Android 5.1–7.x, <1GB RAM) with conservative memory and embedded disk-backed tables.
  - **Profile B (Standard)**: Typical devices (Android 8–11, 1GB–3GB RAM) with full relational database, authentication, file storage, and LAN dashboard.
  - **Profile C (Advanced)**: High-spec devices (Android 12+, 4GB+ RAM, ARM64) with background maintenance, multi-database sync, and expanded concurrency.
- **Zero-Native-Build Embedded Database**: Runs reliably in Termux without requiring native C++ compilers (`node-gyp`) or NDK toolchains. Features ACID-style transactions, schema migrations, and write-ahead journaling (WAL).
- **Private File Storage**: File uploads with strict path-traversal sanitization, quota monitoring, and executable payload blocking (`.apk`, `.sh`, `.dex`, `.so`).
- **Cryptographic Security**: PBKDF2 password hashing with per-user salts, constant-time verification, session token hashes, rate limiting, and local bootstrap tokens.
- **LAN & SSH Tunnel Management**: Direct IP pairing, QR connection codes, and one-command SSH port forwarding for encrypted remote management.
- **Web Management Dashboard**: Responsive console for desktop and mobile browsers to inspect health, query database tables, manage files, and restore backups.

---

## 🏗️ Architecture

```
                       +---------------------------------------+
                       |   Client (PC / Laptop / Phone)        |
                       |   Web Dashboard  / REST API Client    |
                       +---------------------------------------+
                                          |
                      (LAN HTTP or Encrypted SSH Tunnel)
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

## 🚀 Quick Start on Android (via Termux)

### Prerequisites

1. Install **Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/) (avoid the deprecated Google Play Store build).
2. (Recommended) Install **Termux:API** from F-Droid for wake-lock and battery status commands.

### 1-Line Quick Installation

Inside the Termux terminal on your Android device:

```bash
pkg update -y && pkg install -y git nodejs-lts
git clone https://github.com/Suhail-dev-M/ANDROBASE.git
cd ANDROBASE
./scripts/install.sh
```

### Start the Service

```bash
./scripts/service.sh start
```

### First-Run Setup & Admin Bootstrap

When starting for the first time, AndroBase generates a unique local bootstrap token printed to your Termux console and saved to `.androbase_data/.bootstrap_token`.

Open `http://127.0.0.1:3000` (or `http://<PHONE_IP>:3000` from your laptop) and enter your bootstrap token to create your administrator account.

---

## 🔒 Security Best Practices for Mobile Servers

1. **Wakelock & Battery Optimization**:
   Android aggressively suspends background processes when the screen turns off. Always run:
   ```bash
   termux-wake-lock
   ```
   and disable Battery Optimization for Termux in your Android Settings.

2. **Network Exposure**:
   By default, plain HTTP on untrusted public Wi-Fi is insecure. For untrusted networks, use the built-in **SSH Tunnel** command provided in the dashboard:
   ```bash
   ssh -N -L 3000:localhost:3000 -p 8022 <user>@<PHONE_IP>
   ```

3. **No Root Required**:
   AndroBase does not require Android root access. It operates completely within standard user permissions in the Termux sandbox.

---

## 🧪 Testing & Verification

Run the full automated test suite:

```bash
npm test
```

This verifies:
- Configuration parsing & hardware capability detection.
- Database engine CRUD, transactions, and rollback safety.
- PBKDF2 cryptography & rate-limiting lockout.
- Path traversal & executable upload prevention.
- Backup generation & SHA-256 integrity verification.

---

## 📚 Documentation

- [Architecture & Profiles](docs/ARCHITECTURE.md)
- [Universal Compatibility Matrix](docs/COMPATIBILITY_MATRIX.md)
- [Security Threat Model & Best Practices](docs/SECURITY_GUIDE.md)
- [Backup & Disaster Recovery Guide](docs/BACKUP_AND_RESTORE.md)
- [API Reference (v1)](docs/API_REFERENCE.md)
- [Troubleshooting & Android FAQ](docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

We welcome contributions from developers, security researchers, and mobile hardware enthusiasts! Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

AndroBase is licensed under the [Apache License, Version 2.0](LICENSE).
