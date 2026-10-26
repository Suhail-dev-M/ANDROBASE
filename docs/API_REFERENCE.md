# AndroBase REST API Reference (v1)

Base URL: `/api/v1`

All requests expecting or returning payloads use `Content-Type: application/json`.
Protected endpoints require the HTTP header:
`Authorization: Bearer <TOKEN>`

---

## 1. System & Capability Endpoints

### `GET /api/v1/health`
Checks server liveness, uptime, memory consumption, and active profile.
- **Auth**: None
- **Response**:
```json
{
  "status": "healthy",
  "uptimeSeconds": 1420,
  "timestamp": "2026-10-25T15:20:00.000Z",
  "version": "1.0.0-rc1",
  "profile": "profile_b",
  "memory": { "freeMb": 1120, "totalMb": 2048, "usedMb": 928 }
}
```

### `GET /api/v1/status`
Comprehensive runtime telemetry, DB record counts, storage stats, and LAN addresses.
- **Auth**: None

### `GET /api/v1/capabilities`
Hardware and runtime inspection report with compatibility profile criteria.
- **Auth**: None

---

## 2. Authentication & Users

### `GET /api/v1/auth/bootstrap-status`
Checks if an administrator has been configured.
- **Auth**: None

### `POST /api/v1/auth/bootstrap`
Initial administrator creation using the local console bootstrap token.
- **Body**: `{ "username": "admin", "email": "admin@example.com", "password": "...", "bootstrapToken": "..." }`

### `POST /api/v1/auth/login`
Authenticate user with rate-limiting guard.
- **Body**: `{ "identifier": "admin", "password": "..." }`

### `POST /api/v1/auth/logout`
Revoke active session token.
- **Auth**: Required

### `GET /api/v1/auth/me`
Retrieve currently authenticated user profile and permissions.
- **Auth**: Required

---

## 3. Database Engine

### `GET /api/v1/database/tables`
List all tables, column schemas, and record counts.
- **Auth**: Required

### `POST /api/v1/database/tables`
Create a new user table.
- **Auth**: Admin
- **Body**:
```json
{
  "name": "devices",
  "primaryKey": "id",
  "columns": [
    { "name": "id", "type": "string", "required": true, "unique": true },
    { "name": "name", "type": "string", "required": true },
    { "name": "ip", "type": "string" }
  ]
}
```

### `POST /api/v1/database/query/:table`
Execute parameterized query with filtering, sorting, and pagination.
- **Auth**: Required
- **Body**:
```json
{
  "filters": [{ "field": "status", "operator": "eq", "value": "active" }],
  "sortField": "created_at",
  "sortDirection": "desc",
  "limit": 25,
  "offset": 0
}
```

### `POST /api/v1/database/records/:table`
Insert a new record into table.
- **Auth**: Required

### `PUT /api/v1/database/records/:table/:id`
Update an existing record by primary key.
- **Auth**: Required

### `DELETE /api/v1/database/records/:table/:id`
Delete record by primary key.
- **Auth**: Required

---

## 4. File Storage

### `GET /api/v1/files`
List stored files and metadata.
- **Auth**: Required

### `POST /api/v1/files`
Upload a file (`multipart/form-data` with field name `file`).
- **Auth**: Required

### `GET /api/v1/files/:id/download`
Download stored file.
- **Auth**: Required

### `DELETE /api/v1/files/:id`
Delete stored file.
- **Auth**: Required (Owner or Admin)

---

## 5. Backups & Auditing

### `GET /api/v1/backup/list`
List snapshot backups with SHA-256 digests.
- **Auth**: Admin

### `POST /api/v1/backup/create`
Generate a new atomic snapshot backup.
- **Auth**: Admin

### `POST /api/v1/backup/restore`
Restore system database from backup archive.
- **Auth**: Admin

### `GET /api/v1/admin/audit-logs`
Retrieve security and operational audit trail.
- **Auth**: Admin
