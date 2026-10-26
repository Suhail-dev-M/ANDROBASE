# AndroBase Security Architecture & Threat Model

## Threat Model Overview

Hosting a server on an Android device creates a different security boundary than running in an enterprise data center.

Key assumptions and risk factors:
1. **Physical Theft / Lost Device**: Older phones may not have active device encryption or updated lock screens.
2. **Untrusted Wi-Fi Networks**: Phones connect to public coffee shops, hotels, or shared dorm Wi-Fi networks where packet sniffing can occur.
3. **Android Application Sandbox**: Termux runs as an unprivileged user (`u0_a...`), isolating AndroBase from other Android applications without requiring root.
4. **No Public Internet by Default**: AndroBase intentionally does not configure automatic port-forwarding (UPnP) or public tunneling. Exposure must be deliberate.

---

## Security Controls Implemented

### 1. Local-Only Admin Bootstrap Token
Remote unauthenticated users cannot claim administrator rights over LAN.
- On first boot, a high-entropy random token is generated and written to `.androbase_data/.bootstrap_token` (mode `0600`).
- The administrator must read this token directly from the device screen or SSH console to complete first-run setup.
- Once the initial administrator account is registered, bootstrapping is permanently locked.

### 2. Password Storage
- Passwords are salted with 16 cryptographically secure random bytes from `crypto.randomBytes(16)`.
- Hashed using PBKDF2 with SHA-256 and constant-time buffer comparison (`crypto.timingSafeEqual`) to mitigate timing attacks.
- Profile-adaptive iterations prevent freezing older ARMv7 processors while retaining brute-force resistance.

### 3. Session & Token Management
- Sessions use high-entropy 32-byte tokens.
- Tokens are SHA-256 hashed before storage in the database table `_sessions`.
- Tokens expire after 72 hours (configurable via `sessionTtlHours`).
- Password changes instantly revoke all existing sessions for that user account.

### 4. File Storage Safety & Traversal Prevention
- All uploaded filenames are sanitized via `path.basename` and regex stripping.
- Target paths are strictly evaluated against the configured storage root using `path.relative`. Any path attempting `..` traversal triggers immediate rejection.
- Dangerous executable file extensions are strictly prohibited: `.apk`, `.dex`, `.so`, `.sh`, `.exe`, `.bat`, `.cmd`, `.php`, `.ps1`.
- Uploaded files are stored outside the public web root with random UUID prefixes.

### 5. Brute-Force Rate Limiting
- IP-based sliding window blocks repeated failed login attempts (5 attempts per 15-minute window).
- Lockout counters automatically reset upon valid authentication.

### 6. Encrypted Remote Access (SSH Tunneling)
Because Android devices often lack trusted public TLS certificates for local IPs (e.g. `192.168.1.150`), plain HTTP over untrusted Wi-Fi exposes credentials. AndroBase includes native guidance for SSH tunneling:
```bash
ssh -N -L 3000:localhost:3000 -p 8022 <termux-user>@<PHONE_IP>
```
This encapsulates all traffic in an SSH encrypted tunnel directly to loopback.
