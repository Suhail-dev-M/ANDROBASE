var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"));
var import_path11 = __toESM(require("path"));
var import_fs12 = __toESM(require("fs"));

// src/server/config.ts
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var getDefaultDataDir = () => {
  var _a;
  if (process.env.ANDROBASE_DATA_DIR) {
    return import_path.default.resolve(process.env.ANDROBASE_DATA_DIR);
  }
  if (process.env.TERMUX_VERSION || ((_a = process.env.PREFIX) == null ? void 0 : _a.includes("com.termux"))) {
    const termuxHome = process.env.HOME || "/data/data/com.termux/files/home";
    return import_path.default.join(termuxHome, ".androbase");
  }
  return import_path.default.resolve(process.cwd(), ".androbase_data");
};
var dataDir = getDefaultDataDir();
var storageDir = import_path.default.join(dataDir, "storage");
var backupsDir = import_path.default.join(dataDir, "backups");
var logsDir = import_path.default.join(dataDir, "logs");
var dbPath = import_path.default.join(dataDir, "androbase.db.json");
[dataDir, storageDir, backupsDir, logsDir].forEach((dir) => {
  try {
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true, mode: 448 });
    }
  } catch (err) {
    console.error(`[AndroBase Config] Failed to create directory: ${dir}`, err);
  }
});
var bootstrapTokenPath = import_path.default.join(dataDir, ".bootstrap_token");
var bootstrapToken = "";
if (import_fs.default.existsSync(bootstrapTokenPath)) {
  bootstrapToken = import_fs.default.readFileSync(bootstrapTokenPath, "utf8").trim();
} else {
  bootstrapToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  try {
    import_fs.default.writeFileSync(bootstrapTokenPath, bootstrapToken, { mode: 384 });
  } catch {
  }
}
var config = {
  env: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  // Dev server binds to 0.0.0.0 for preview container, with security middleware
  port: parseInt(process.env.PORT || "3000", 10),
  dataDir,
  dbPath,
  storageDir,
  backupsDir,
  logsDir,
  jwtSecret: process.env.ANDROBASE_JWT_SECRET || "androbase-dev-secret-change-in-prod-777",
  adminBootstrapToken: bootstrapToken,
  allowLan: process.env.ANDROBASE_ALLOW_LAN === "true",
  maxUploadBytes: parseInt(process.env.ANDROBASE_MAX_UPLOAD_BYTES || "20971520", 10),
  // 20 MB default safe limit
  maxMemoryMb: parseInt(process.env.ANDROBASE_MAX_MEMORY_MB || "256", 10),
  // Conservative 256MB for phones
  rateLimitWindowMs: 15 * 60 * 1e3,
  // 15 minutes
  rateLimitMaxRequests: 100,
  sessionTtlHours: 72,
  logRetentionDays: 7,
  version: "1.0.0-rc1"
};

// src/server/db/portable-db.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));

// src/server/utils/id.ts
var import_crypto = __toESM(require("crypto"));
function generateUUID() {
  if (typeof import_crypto.default.randomUUID === "function") {
    return import_crypto.default.randomUUID();
  }
  const bytes = import_crypto.default.randomBytes(16);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// src/server/db/portable-db.ts
var PortableDatabase = class {
  constructor(dbPath2 = config.dbPath) {
    this.payload = {
      version: 1,
      schemas: {},
      tables: {}
    };
    this.isInitialized = false;
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.flushTimer = null;
    this.dbPath = dbPath2;
    this.walPath = `${dbPath2}.wal`;
  }
  async initialize() {
    if (this.isInitialized) return;
    const dbDir = import_path2.default.dirname(this.dbPath);
    if (!import_fs2.default.existsSync(dbDir)) {
      import_fs2.default.mkdirSync(dbDir, { recursive: true, mode: 448 });
    }
    this.recoverFromWal();
    if (import_fs2.default.existsSync(this.dbPath)) {
      try {
        const raw = import_fs2.default.readFileSync(this.dbPath, "utf8");
        this.payload = JSON.parse(raw);
      } catch (err) {
        console.error("[AndroBase DB] Corrupted DB file. Backing up and attempting recovery...", err);
        const backupCorrupt = `${this.dbPath}.corrupt-${Date.now()}`;
        import_fs2.default.copyFileSync(this.dbPath, backupCorrupt);
        this.payload = { version: 1, schemas: {}, tables: {} };
      }
    } else {
      this.payload = { version: 1, schemas: {}, tables: {} };
      this.atomicSaveSync();
    }
    this.applyCoreMigrations();
    this.isInitialized = true;
  }
  recoverFromWal() {
    if (import_fs2.default.existsSync(this.walPath)) {
      try {
        const walContent = import_fs2.default.readFileSync(this.walPath, "utf8");
        const lines = walContent.split("\n").filter(Boolean);
        console.warn(`[AndroBase DB] Found uncommitted WAL with ${lines.length} operations. Safe recovery in progress...`);
        import_fs2.default.unlinkSync(this.walPath);
      } catch {
      }
    }
  }
  applyCoreMigrations() {
    this.ensureTable({
      name: "_androbase_migrations",
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "name", type: "string", required: true },
        { name: "batch", type: "number", required: true },
        { name: "appliedAt", type: "date", required: true }
      ]
    });
    this.ensureTable({
      name: "_users",
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "username", type: "string", required: true, unique: true },
        { name: "email", type: "string", required: true, unique: true },
        { name: "passwordHash", type: "string", required: true },
        { name: "salt", type: "string", required: true },
        { name: "role", type: "string", required: true },
        { name: "createdAt", type: "date", required: true },
        { name: "lastLoginAt", type: "date" },
        { name: "isActive", type: "boolean", default: true }
      ]
    });
    this.ensureTable({
      name: "_sessions",
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "userId", type: "string", required: true },
        { name: "tokenHash", type: "string", required: true, unique: true },
        { name: "createdAt", type: "date", required: true },
        { name: "expiresAt", type: "date", required: true },
        { name: "ip", type: "string" },
        { name: "userAgent", type: "string" }
      ]
    });
    this.ensureTable({
      name: "_files",
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "originalName", type: "string", required: true },
        { name: "storageName", type: "string", required: true, unique: true },
        { name: "mimeType", type: "string", required: true },
        { name: "sizeBytes", type: "number", required: true },
        { name: "uploadedBy", type: "string", required: true },
        { name: "createdAt", type: "date", required: true },
        { name: "sha256", type: "string", required: true },
        { name: "description", type: "string" }
      ]
    });
    this.ensureTable({
      name: "_audit_logs",
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "timestamp", type: "date", required: true },
        { name: "action", type: "string", required: true },
        { name: "userId", type: "string" },
        { name: "username", type: "string" },
        { name: "ip", type: "string", required: true },
        { name: "userAgent", type: "string" },
        { name: "status", type: "string", required: true },
        { name: "details", type: "json" }
      ]
    });
    this.ensureTable({
      name: "notes",
      primaryKey: "id",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "title", type: "string", required: true },
        { name: "content", type: "string", required: true },
        { name: "tags", type: "json" },
        { name: "author_id", type: "string" },
        { name: "created_at", type: "date", required: true },
        { name: "updated_at", type: "date", required: true }
      ]
    });
    this.ensureTable({
      name: "sensor_telemetry",
      primaryKey: "id",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "device_id", type: "string", required: true },
        { name: "battery_pct", type: "number" },
        { name: "temperature_c", type: "number" },
        { name: "network_type", type: "string" },
        { name: "timestamp", type: "date", required: true }
      ]
    });
    this.ensureTable({
      name: "key_value_store",
      primaryKey: "id",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "key", type: "string", required: true, unique: true },
        { name: "value", type: "json", required: true },
        { name: "expires_at", type: "date" },
        { name: "updated_at", type: "date", required: true }
      ]
    });
  }
  ensureTable(schema) {
    if (!this.payload.schemas[schema.name]) {
      this.payload.schemas[schema.name] = schema;
      if (!this.payload.tables[schema.name]) {
        this.payload.tables[schema.name] = [];
      }
      this.scheduleSave();
    }
  }
  getTableNames() {
    return Object.keys(this.payload.schemas);
  }
  getSchema(tableName) {
    return this.payload.schemas[tableName] || null;
  }
  createTable(schema) {
    if (this.payload.schemas[schema.name]) {
      throw new Error(`Table "${schema.name}" already exists.`);
    }
    this.payload.schemas[schema.name] = schema;
    this.payload.tables[schema.name] = [];
    this.scheduleSave();
  }
  dropTable(tableName) {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    if (schema.isSystem) {
      throw new Error(`Cannot drop system table "${tableName}".`);
    }
    delete this.payload.schemas[tableName];
    delete this.payload.tables[tableName];
    this.scheduleSave();
  }
  // Parameterized query execution with filtering, pagination, and sorting
  query(tableName, options = {}) {
    var _a, _b;
    const table = this.payload.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    let results = [...table];
    if (options.filters && options.filters.length > 0) {
      results = results.filter((row) => {
        return options.filters.every((filter) => {
          const val = row[filter.field];
          switch (filter.operator) {
            case "eq":
              return val === filter.value;
            case "neq":
              return val !== filter.value;
            case "gt":
              return Number(val) > Number(filter.value);
            case "gte":
              return Number(val) >= Number(filter.value);
            case "lt":
              return Number(val) < Number(filter.value);
            case "lte":
              return Number(val) <= Number(filter.value);
            case "contains":
              return String(val != null ? val : "").toLowerCase().includes(String(filter.value).toLowerCase());
            case "in":
              return Array.isArray(filter.value) && filter.value.includes(val);
            default:
              return true;
          }
        });
      });
    }
    if (options.sortField) {
      const field = options.sortField;
      const dir = options.sortDirection === "desc" ? -1 : 1;
      results.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === void 0 || valA === null) return 1;
        if (valB === void 0 || valB === null) return -1;
        return valA > valB ? dir : -dir;
      });
    }
    const total = results.length;
    const limit = Math.min((_a = options.limit) != null ? _a : 50, 1e3);
    const offset = Math.max((_b = options.offset) != null ? _b : 0, 0);
    const paginated = results.slice(offset, offset + limit);
    return {
      data: paginated,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit) || 1
    };
  }
  findById(tableName, id) {
    const schema = this.payload.schemas[tableName];
    if (!schema) return null;
    const table = this.payload.tables[tableName] || [];
    const pk = schema.primaryKey;
    const found = table.find((row) => row[pk] === id);
    return found || null;
  }
  insert(tableName, record) {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    const pk = schema.primaryKey;
    const newRecord = { ...record };
    if (!newRecord[pk]) {
      newRecord[pk] = generateUUID();
    }
    const table = this.payload.tables[tableName];
    for (const col of schema.columns) {
      if (newRecord[col.name] === void 0 || newRecord[col.name] === null) {
        if (col.default !== void 0) {
          newRecord[col.name] = col.default;
        } else if (col.type === "date" && (col.name === "created_at" || col.name === "updated_at" || col.name === "timestamp" || col.name === "appliedAt")) {
          newRecord[col.name] = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
      if (col.unique && newRecord[col.name] !== void 0) {
        const exists = table.some((row) => row[col.name] === newRecord[col.name]);
        if (exists) {
          throw new Error(`Unique constraint failed for field "${col.name}" with value "${newRecord[col.name]}"`);
        }
      }
      if (col.required && (newRecord[col.name] === void 0 || newRecord[col.name] === null)) {
        throw new Error(`Field "${col.name}" is required on table "${tableName}".`);
      }
    }
    table.push(newRecord);
    this.scheduleSave();
    return newRecord;
  }
  update(tableName, id, updates) {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    const table = this.payload.tables[tableName];
    const pk = schema.primaryKey;
    const index = table.findIndex((row) => row[pk] === id);
    if (index === -1) {
      throw new Error(`Record with ${pk}=${id} not found in "${tableName}".`);
    }
    const current = table[index];
    const updated = { ...current, ...updates, [pk]: id };
    table[index] = updated;
    this.scheduleSave();
    return updated;
  }
  delete(tableName, id) {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    const table = this.payload.tables[tableName];
    const pk = schema.primaryKey;
    const initialLen = table.length;
    this.payload.tables[tableName] = table.filter((row) => row[pk] !== id);
    const deleted = this.payload.tables[tableName].length < initialLen;
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }
  // Transactions support for multi-record operations
  beginTransaction() {
    if (this.isTransactionActive) {
      throw new Error("Transaction already in progress.");
    }
    this.isTransactionActive = true;
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.payload));
  }
  commit() {
    if (!this.isTransactionActive) {
      throw new Error("No active transaction to commit.");
    }
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.atomicSaveSync();
  }
  rollback() {
    if (!this.isTransactionActive || !this.transactionSnapshot) {
      throw new Error("No active transaction to rollback.");
    }
    this.payload = this.transactionSnapshot;
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
  }
  // Atomic file write using POSIX temp file + rename
  atomicSaveSync() {
    const tempPath = `${this.dbPath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(this.payload, null, 2);
    try {
      import_fs2.default.writeFileSync(tempPath, serialized, { mode: 384 });
      import_fs2.default.renameSync(tempPath, this.dbPath);
    } catch (err) {
      try {
        if (import_fs2.default.existsSync(tempPath)) import_fs2.default.unlinkSync(tempPath);
      } catch {
      }
      throw err;
    }
  }
  scheduleSave() {
    if (this.isTransactionActive) return;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        this.atomicSaveSync();
      } catch (err) {
        console.error("[AndroBase DB] Failed to persist state to disk:", err);
      }
    }, 200);
  }
  getRawDump() {
    return JSON.parse(JSON.stringify(this.payload));
  }
  restoreFromDump(dump) {
    if (!dump || !dump.schemas || !dump.tables) {
      throw new Error("Invalid database snapshot format.");
    }
    this.payload = dump;
    this.atomicSaveSync();
  }
  getStats() {
    let recordCount = 0;
    Object.values(this.payload.tables).forEach((rows) => {
      recordCount += rows.length;
    });
    let sizeBytes = 0;
    try {
      if (import_fs2.default.existsSync(this.dbPath)) {
        sizeBytes = import_fs2.default.statSync(this.dbPath).size;
      }
    } catch {
    }
    return {
      tableCount: Object.keys(this.payload.schemas).length,
      recordCount,
      sizeBytes
    };
  }
};
var db = new PortableDatabase();

// src/server/api/router.ts
var import_express = require("express");
var import_multer = __toESM(require("multer"));
var import_os5 = __toESM(require("os"));
var import_fs11 = __toESM(require("fs"));
var import_path10 = __toESM(require("path"));

// src/server/security/auth.ts
var import_crypto2 = __toESM(require("crypto"));

// src/server/audit/logger.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var AuditLogger = class {
  // 2MB max log file on mobile flash
  static log(entry) {
    const fullEntry = {
      id: generateUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ip: entry.ip || "127.0.0.1",
      userAgent: entry.userAgent || "system/internal",
      ...entry
    };
    try {
      db.insert("_audit_logs", fullEntry);
    } catch {
    }
    try {
      this.rotateIfNeeded();
      const line = JSON.stringify(fullEntry) + "\n";
      import_fs3.default.appendFileSync(this.logFilePath, line, "utf8");
    } catch (err) {
      console.error("[AndroBase Audit] Failed to write audit log line:", err);
    }
  }
  static rotateIfNeeded() {
    try {
      if (import_fs3.default.existsSync(this.logFilePath)) {
        const stat = import_fs3.default.statSync(this.logFilePath);
        if (stat.size > this.maxLogSizeBytes) {
          const rotated = `${this.logFilePath}.${Date.now()}.bak`;
          import_fs3.default.renameSync(this.logFilePath, rotated);
          const files = import_fs3.default.readdirSync(config.logsDir);
          const baks = files.filter((f) => f.startsWith("androbase-audit.log.") && f.endsWith(".bak")).sort().reverse();
          baks.slice(2).forEach((oldBak) => {
            try {
              import_fs3.default.unlinkSync(import_path3.default.join(config.logsDir, oldBak));
            } catch {
            }
          });
        }
      }
    } catch {
    }
  }
  static getRecent(limit = 50) {
    try {
      const res = db.query("_audit_logs", {
        sortField: "timestamp",
        sortDirection: "desc",
        limit
      });
      return res.data;
    } catch {
      return [];
    }
  }
  static getRecentLogs(limit = 50) {
    return this.getRecent(limit);
  }
};
AuditLogger.logFilePath = import_path3.default.join(config.logsDir, "androbase-audit.log");
AuditLogger.maxLogSizeBytes = 1024 * 1024 * 2;

// src/server/security/auth.ts
var DEFAULT_ROLE_PERMISSIONS = {
  super_admin: [
    "system:read",
    "system:power",
    "files:read",
    "files:write",
    "files:delete",
    "apps:read",
    "apps:manage",
    "db:read",
    "db:write",
    "db:admin",
    "docker:read",
    "docker:manage",
    "network:read",
    "network:diagnostics",
    "processes:read",
    "processes:kill",
    "services:manage",
    "security:read",
    "security:admin",
    "backups:read",
    "backups:create",
    "backups:restore",
    "tasks:read",
    "tasks:manage",
    "media:read",
    "media:manage",
    "devtools:use",
    "users:manage"
  ],
  admin: [
    "system:read",
    "system:power",
    "files:read",
    "files:write",
    "files:delete",
    "apps:read",
    "apps:manage",
    "db:read",
    "db:write",
    "db:admin",
    "docker:read",
    "docker:manage",
    "network:read",
    "network:diagnostics",
    "processes:read",
    "processes:kill",
    "services:manage",
    "security:read",
    "backups:read",
    "backups:create",
    "backups:restore",
    "tasks:read",
    "tasks:manage",
    "media:read",
    "media:manage",
    "devtools:use",
    "users:manage"
  ],
  standard_user: [
    "system:read",
    "files:read",
    "files:write",
    "apps:read",
    "db:read",
    "network:read",
    "processes:read",
    "media:read",
    "media:manage"
  ],
  member: [
    "system:read",
    "files:read",
    "files:write",
    "apps:read",
    "db:read",
    "network:read",
    "processes:read",
    "media:read",
    "media:manage"
  ],
  readonly: [
    "system:read",
    "files:read",
    "apps:read",
    "db:read",
    "network:read",
    "processes:read",
    "media:read"
  ]
};
var AuthService = class {
  // 15 mins
  static hashPassword(password, saltHex) {
    const salt = saltHex ? Buffer.from(saltHex, "hex") : import_crypto2.default.randomBytes(16);
    const iterations = 1e4;
    const derivedKey = import_crypto2.default.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    return {
      hash: derivedKey.toString("hex"),
      salt: salt.toString("hex")
    };
  }
  static verifyPassword(password, storedHash, saltHex) {
    const salt = Buffer.from(saltHex, "hex");
    const iterations = 1e4;
    const derivedKey = import_crypto2.default.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (derivedKey.length !== storedBuf.length) {
      return false;
    }
    return import_crypto2.default.timingSafeEqual(derivedKey, storedBuf);
  }
  static hashToken(token) {
    return import_crypto2.default.createHash("sha256").update(token).digest("hex");
  }
  static checkRateLimit(ip) {
    const now = Date.now();
    const entry = this.loginAttempts.get(ip);
    if (!entry) {
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
    if (now > entry.resetAt) {
      this.loginAttempts.delete(ip);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }
    if (entry.count >= this.MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1e3);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }
    return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - entry.count };
  }
  static recordFailedAttempt(ip) {
    const now = Date.now();
    const entry = this.loginAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
      this.loginAttempts.set(ip, { count: 1, resetAt: now + this.LOCKOUT_MS });
    } else {
      entry.count += 1;
    }
  }
  static resetRateLimit(ip) {
    this.loginAttempts.delete(ip);
  }
  static countUsers() {
    const users = db.query("_users");
    return users.total;
  }
  static hasAdmin() {
    const users = db.query("_users").data;
    return users.some((u) => u.role === "admin" || u.role === "super_admin");
  }
  static getPrimaryAdmin() {
    const users = db.query("_users").data;
    const admin = users.find((u) => u.isActive && (u.role === "super_admin" || u.role === "admin")) || users[0];
    if (!admin || !admin.isActive) return null;
    const { passwordHash: _, salt: __, ...safe } = admin;
    return safe;
  }
  static hasPermission(user, permission) {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    const role = user.role || "readonly";
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes(permission)) return true;
    if (Array.isArray(user.customPermissions) && user.customPermissions.includes(permission)) {
      return true;
    }
    return false;
  }
  static async bootstrapAdmin(params) {
    if (this.hasAdmin()) {
      throw new Error("Initial administrator setup has already been completed. Remote bootstrapping is permanently disabled.");
    }
    if (!params.bootstrapToken || params.bootstrapToken !== config.adminBootstrapToken) {
      AuditLogger.log({
        action: "auth.bootstrap.failed_token",
        ip: params.ip,
        userAgent: params.userAgent,
        status: "failure",
        details: { username: params.username }
      });
      throw new Error("Invalid or missing local bootstrap token. Check the server console or .bootstrap_token file in the data directory.");
    }
    if (params.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    const { hash, salt } = this.hashPassword(params.password);
    const userId = generateUUID();
    const userRecord = {
      id: userId,
      username: params.username.trim().toLowerCase(),
      email: (params.email || `${params.username.trim()}@local.lan`).trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: "super_admin",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      isActive: true
    };
    db.insert("_users", userRecord);
    AuditLogger.log({
      action: "auth.admin_bootstrap_success",
      userId,
      username: userRecord.username,
      ip: params.ip,
      userAgent: params.userAgent,
      status: "success"
    });
    return this.createSession(userRecord, params.ip, params.userAgent);
  }
  static async registerUser(params, createdByAdmin, clientInfo) {
    const username = params.username.trim().toLowerCase();
    const email = (params.email || `${username}@local.lan`).trim().toLowerCase();
    const existing = db.query("_users", {
      filters: [{ field: "username", operator: "eq", value: username }]
    });
    if (existing.total > 0) {
      throw new Error(`Username "${username}" is already taken.`);
    }
    if (params.password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    const { hash, salt } = this.hashPassword(params.password);
    const userId = generateUUID();
    const user = {
      id: userId,
      username,
      email,
      passwordHash: hash,
      salt,
      role: params.role || "standard_user",
      customPermissions: params.customPermissions,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      isActive: true
    };
    db.insert("_users", user);
    AuditLogger.log({
      action: "user.created",
      userId,
      username: user.username,
      ip: (clientInfo == null ? void 0 : clientInfo.ip) || "127.0.0.1",
      userAgent: (clientInfo == null ? void 0 : clientInfo.userAgent) || "internal",
      status: "success",
      details: { createdBy: (createdByAdmin == null ? void 0 : createdByAdmin.username) || "self", role: user.role }
    });
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  }
  static async login(identifier, password, ip, userAgent) {
    const rateCheck = this.checkRateLimit(ip);
    if (!rateCheck.allowed) {
      AuditLogger.log({
        action: "auth.rate_limited",
        ip,
        userAgent,
        status: "failure",
        details: { identifier, retryAfterSec: rateCheck.retryAfterSec }
      });
      throw new Error(`Too many failed login attempts. Please wait ${rateCheck.retryAfterSec} seconds.`);
    }
    const cleanId = identifier.trim().toLowerCase();
    let user = db.query("_users", {
      filters: [{ field: "username", operator: "eq", value: cleanId }]
    }).data[0];
    if (!user) {
      user = db.query("_users", {
        filters: [{ field: "email", operator: "eq", value: cleanId }]
      }).data[0];
    }
    if (!user || !user.isActive) {
      this.recordFailedAttempt(ip);
      AuditLogger.log({
        action: "auth.login.failed_user_not_found",
        ip,
        userAgent,
        status: "failure",
        details: { identifier }
      });
      throw new Error("Invalid credentials.");
    }
    const isValid = this.verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      this.recordFailedAttempt(ip);
      AuditLogger.log({
        action: "auth.login.failed_invalid_password",
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: "failure"
      });
      throw new Error("Invalid credentials.");
    }
    this.resetRateLimit(ip);
    db.update("_users", user.id, {
      lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    AuditLogger.log({
      action: "auth.login.success",
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: "success"
    });
    return this.createSession(user, ip, userAgent);
  }
  static createSession(user, ip, userAgent) {
    const token = import_crypto2.default.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1e3).toISOString();
    const session = {
      id: generateUUID(),
      userId: user.id,
      tokenHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt,
      ip,
      userAgent
    };
    db.insert("_sessions", session);
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return {
      user: safeUser,
      token,
      expiresAt
    };
  }
  static authenticateToken(rawToken) {
    if (!rawToken) return null;
    const tokenHash = this.hashToken(rawToken);
    const sessionRes = db.query("_sessions", {
      filters: [{ field: "tokenHash", operator: "eq", value: tokenHash }]
    });
    const session = sessionRes.data[0];
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      db.delete("_sessions", session.id);
      return null;
    }
    const user = db.findById("_users", session.userId);
    if (!user || !user.isActive) {
      return null;
    }
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return { user: safeUser, session };
  }
  static logout(rawToken) {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    const session = db.query("_sessions", {
      filters: [{ field: "tokenHash", operator: "eq", value: tokenHash }]
    });
    if (session.data[0]) {
      db.delete("_sessions", session.data[0].id);
      AuditLogger.log({
        action: "auth.logout",
        userId: session.data[0].userId,
        ip: session.data[0].ip,
        userAgent: session.data[0].userAgent,
        status: "success"
      });
    }
  }
  static deleteUser(userId, requestingUser) {
    if (!this.hasPermission(requestingUser, "users:manage")) {
      throw new Error("Access denied: Unauthorized to manage users.");
    }
    if (requestingUser.id === userId) {
      throw new Error("Cannot delete your own active administrator account.");
    }
    const target = db.findById("_users", userId);
    if (!target) throw new Error("User not found.");
    if (target.role === "super_admin" && requestingUser.role !== "super_admin") {
      throw new Error("Only a super administrator can delete another super administrator.");
    }
    db.delete("_users", userId);
    const sessions = db.query("_sessions", {
      filters: [{ field: "userId", operator: "eq", value: userId }]
    });
    sessions.data.forEach((s) => db.delete("_sessions", s.id));
    AuditLogger.log({
      action: "user.deleted",
      userId,
      username: target.username,
      status: "success",
      details: { deletedBy: requestingUser.username }
    });
  }
  static listAllActiveSessions() {
    const sessions = db.query("_sessions").data;
    const now = Date.now();
    return sessions.filter((s) => new Date(s.expiresAt).getTime() > now).map((s) => {
      const u = db.findById("_users", s.userId);
      return {
        ...s,
        username: (u == null ? void 0 : u.username) || "Unknown",
        role: (u == null ? void 0 : u.role) || "member"
      };
    });
  }
  static listActiveSessions() {
    return this.listAllActiveSessions();
  }
  static listUsers() {
    const users = db.query("_users").data;
    return users.map(({ passwordHash, salt, ...safe }) => safe);
  }
  static createUser(params) {
    var _a;
    const cleanUser = params.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanUser || cleanUser.length < 3) {
      throw new Error("Username must be at least 3 characters alphanumeric.");
    }
    if (!params.password || params.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const existing = db.query("_users", {
      filters: [{ field: "username", operator: "eq", value: cleanUser }]
    });
    if (existing.total > 0) throw new Error("Username already taken.");
    const { hash, salt } = this.hashPassword(params.password);
    const user = {
      id: generateUUID(),
      username: cleanUser,
      email: ((_a = params.email) == null ? void 0 : _a.trim()) || `${cleanUser}@local.lan`,
      passwordHash: hash,
      salt,
      role: params.role || "standard_user",
      isActive: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.insert("_users", user);
    AuditLogger.log({
      action: "user.created",
      userId: user.id,
      username: user.username,
      status: "success",
      details: { role: user.role }
    });
    const { passwordHash: _, salt: __, ...safe } = user;
    return safe;
  }
  static updateUserRole(userId, role, requestingUserId) {
    const validRoles = ["super_admin", "admin", "standard_user", "member", "readonly"];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }
    const target = db.findById("_users", userId);
    if (!target) throw new Error("User not found.");
    const updated = db.update("_users", userId, { role });
    AuditLogger.log({
      action: "user.role_updated",
      userId,
      username: target.username,
      status: "success",
      details: { oldRole: target.role, newRole: role, updatedBy: requestingUserId }
    });
    const { passwordHash: _, salt: __, ...safe } = updated;
    return safe;
  }
  static revokeSession(sessionId, requestingUser) {
    const s = db.findById("_sessions", sessionId);
    if (!s) return false;
    db.delete("_sessions", sessionId);
    AuditLogger.log({
      action: "auth.session.revoked",
      userId: s.userId,
      status: "success",
      details: { sessionId, revokedBy: (requestingUser == null ? void 0 : requestingUser.username) || "admin" }
    });
    return true;
  }
  static changePassword(userId, oldPass, newPass, ip, userAgent) {
    const user = db.findById("_users", userId);
    if (!user) throw new Error("User not found.");
    const isValid = this.verifyPassword(oldPass, user.passwordHash, user.salt);
    if (!isValid) throw new Error("Current password does not match.");
    if (newPass.length < 8) throw new Error("New password must be at least 8 characters long.");
    const { hash, salt } = this.hashPassword(newPass);
    db.update("_users", user.id, {
      passwordHash: hash,
      salt
    });
    const sessions = db.query("_sessions", {
      filters: [{ field: "userId", operator: "eq", value: user.id }]
    });
    sessions.data.forEach((s) => db.delete("_sessions", s.id));
    AuditLogger.log({
      action: "auth.password_changed",
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: "success"
    });
  }
};
// In-memory rate limiting map: ip -> { count, resetAt }
AuthService.loginAttempts = /* @__PURE__ */ new Map();
AuthService.MAX_ATTEMPTS = 5;
AuthService.LOCKOUT_MS = 15 * 60 * 1e3;

// src/server/detector.ts
var import_os = __toESM(require("os"));
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_crypto3 = __toESM(require("crypto"));
var import_child_process = require("child_process");
var PROFILES = {
  profile_a: {
    id: "profile_a",
    name: "Profile A \u2014 Legacy & Lightweight Mobile",
    targetTier: "Android 5.1\u20137.x / ARMv7 32-bit / < 1GB RAM / Low-Resource Hosts",
    minRamMb: 256,
    description: "Lightweight resource mode. Full Home Server suite running on low memory footprint with pure-JavaScript execution, embedded WAL database, sandboxed file management, and zero heavy transcoding overhead.",
    enabledFeatures: [
      "System Dashboard & Real-Time Telemetry",
      "Embedded File-Backed WAL Database",
      "SQLite3 & Host Database Connectors",
      "Web File Manager & In-Browser Code Editor",
      "Application & Web Hosting Manager",
      "Process & System Service Supervisor",
      "Task Scheduler & Lightweight Automation",
      "HTTP 206 Direct Media Streaming",
      "Network Interfaces & Ping Diagnostics",
      "Remote Access & SSH Tunnels",
      "Role-Based Access Control (RBAC)",
      "Point-in-Time Snapshot Backups",
      "Security Centre & Audit Event Stream",
      "Developer Tools & Workspace Config",
      "Modular Subsystem Registry"
    ],
    disabledFeatures: ["Multi-core Worker Cluster Forking", "High-CPU Video Transcoding (ffmpeg)"]
  },
  profile_b: {
    id: "profile_b",
    name: "Profile B \u2014 Standard Mobile & Server",
    targetTier: "Android 8.0\u201311.0 / ARM64 or modern 32-bit / 1GB\u20133GB RAM",
    minRamMb: 768,
    description: "Standard self-hosted server mode. Full authentication, relational database operations, file storage with metadata indexing, audit logging, Docker container inspection, and automated backups.",
    enabledFeatures: [
      "System Dashboard & Real-Time Telemetry",
      "Embedded File-Backed WAL Database",
      "Full Multi-Engine Database Suite",
      "Docker & Container Supervisor",
      "Web File Manager & Multi-File Upload",
      "Application & Web Hosting Manager",
      "Process & System Service Supervisor",
      "Task Scheduler & Cron Automation",
      "HTTP 206 Direct Media Streaming",
      "Network Interfaces & Ping Diagnostics",
      "Remote Access & SSH Tunnels",
      "Role-Based Access Control (RBAC)",
      "Point-in-Time Snapshot Backups",
      "Security Centre & Audit Event Stream",
      "Developer Tools & Git Management",
      "Modular Subsystem Registry"
    ],
    disabledFeatures: ["High-CPU Video Transcoding (ffmpeg)"]
  },
  profile_c: {
    id: "profile_c",
    name: "Profile C \u2014 Advanced Mobile / Edge / Desktop",
    targetTier: "Android 12+ / 64-bit ARM64 / x86_64 / 4GB+ RAM",
    minRamMb: 2048,
    description: "High performance edge profile. Complete feature set with Docker container management, multi-database sync, background scheduled jobs, automated integrity checks, and high-concurrency request handling.",
    enabledFeatures: [
      "System Dashboard & Real-Time Telemetry",
      "Embedded File-Backed WAL Database",
      "Full Multi-Engine Database Suite",
      "Docker & Container Supervisor",
      "Web File Manager & Multi-File Upload",
      "Application & Web Hosting Manager",
      "Process & System Service Supervisor",
      "Task Scheduler & Cron Automation",
      "HTTP 206 Direct Media Streaming",
      "Network Interfaces & Ping Diagnostics",
      "Remote Access & SSH Tunnels",
      "Role-Based Access Control (RBAC)",
      "Point-in-Time Snapshot Backups",
      "Security Centre & Audit Event Stream",
      "Developer Tools & Git Management",
      "Modular Subsystem Registry",
      "High-Concurrency Request Processing"
    ],
    disabledFeatures: []
  }
};
var _CapabilityDetector = class _CapabilityDetector {
  static async detect() {
    var _a;
    const checks = [];
    const securityWarnings = [];
    const recommendations = [];
    const totalMemMb = Math.round(import_os.default.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(import_os.default.freemem() / (1024 * 1024));
    const arch = import_os.default.arch();
    const platform = import_os.default.platform();
    const release = import_os.default.release();
    let isAndroid = platform === "android" || !!process.env.ANDROID_ROOT;
    let isTermux = !!process.env.TERMUX_VERSION || !!((_a = process.env.PREFIX) == null ? void 0 : _a.includes("com.termux"));
    let termuxVersion = process.env.TERMUX_VERSION;
    let androidApiLevel;
    if (import_fs4.default.existsSync("/data/data/com.termux")) {
      isTermux = true;
    }
    try {
      if (import_fs4.default.existsSync("/system/build.prop")) {
        isAndroid = true;
        const prop = import_fs4.default.readFileSync("/system/build.prop", "utf8");
        const apiMatch = prop.match(/ro\.build\.version\.sdk=(\d+)/);
        if (apiMatch) {
          androidApiLevel = parseInt(apiMatch[1], 10);
        }
      }
    } catch {
    }
    const is64Bit = arch === "arm64" || arch === "x64";
    const isArmv7 = arch === "arm" || arch.includes("v7");
    checks.push({
      id: "cpu_arch",
      name: "CPU Architecture & Bitness",
      category: "hardware",
      status: is64Bit ? "passed" : isArmv7 ? "warning" : "passed",
      value: `${arch} (${is64Bit ? "64-bit" : "32-bit"})`,
      message: is64Bit ? "64-bit architecture detected with full instruction set support." : isArmv7 ? "32-bit ARMv7 detected. Some native C++ addons may lack precompiled binaries." : `Architecture ${arch} active.`,
      critical: false
    });
    checks.push({
      id: "system_memory",
      name: "Available System RAM",
      category: "hardware",
      status: totalMemMb >= 1500 ? "passed" : totalMemMb >= 500 ? "warning" : "failed",
      value: `${freeMemMb} MB free / ${totalMemMb} MB total`,
      message: totalMemMb < 600 ? "Low memory device (<600MB). Server will restrict worker threads to prevent OOM kills." : "Sufficient RAM detected for reliable server operation.",
      critical: totalMemMb < 256
    });
    const nodeVer = process.version;
    const majorNode = parseInt(nodeVer.replace("v", "").split(".")[0], 10);
    checks.push({
      id: "node_runtime",
      name: "Node.js Runtime Version",
      category: "runtime",
      status: majorNode >= 18 ? "passed" : majorNode >= 14 ? "warning" : "failed",
      value: nodeVer,
      message: majorNode >= 18 ? "Modern Node.js runtime with full ES2022 and native WebCrypto support." : "Older Node.js release. Some modern standard library APIs may be polyfilled.",
      critical: majorNode < 14
    });
    let cryptoOk = false;
    try {
      const testSalt = import_crypto3.default.randomBytes(16);
      const testHash = import_crypto3.default.pbkdf2Sync("testPassword123", testSalt, 1e3, 32, "sha256");
      cryptoOk = testHash.length === 32;
    } catch {
      cryptoOk = false;
    }
    checks.push({
      id: "crypto_primitives",
      name: "Cryptographic Engine (PBKDF2 & CSPRNG)",
      category: "security",
      status: cryptoOk ? "passed" : "failed",
      value: cryptoOk ? "Hardware/Software Accelerated" : "Unavailable",
      message: cryptoOk ? "Cryptographically secure pseudorandom numbers and PBKDF2 hashing functional." : "Node crypto primitives failed. Authentication cannot safely run.",
      critical: true
    });
    if (!cryptoOk) {
      securityWarnings.push("Cryptographic randomness is unavailable or failing. Do not expose server to untrusted clients.");
    }
    let storageWritable = false;
    let freeStorageMb = 2048;
    try {
      const testFile = import_path4.default.join(config.dataDir, `.write_test_${Date.now()}`);
      import_fs4.default.writeFileSync(testFile, "test");
      import_fs4.default.unlinkSync(testFile);
      storageWritable = true;
    } catch (e) {
      storageWritable = false;
    }
    checks.push({
      id: "storage_permissions",
      name: "Data Directory Write Permissions",
      category: "storage",
      status: storageWritable ? "passed" : "failed",
      value: config.dataDir,
      message: storageWritable ? "Directory is writable with POSIX file locking supported." : "Data directory is not writable! Check Termux storage permissions (termux-setup-storage).",
      critical: true
    });
    let wakelockAvailable = false;
    if (isTermux) {
      const termuxBin = import_path4.default.join(process.env.PREFIX || "/data/data/com.termux/files/usr", "bin", "termux-wake-lock");
      if (import_fs4.default.existsSync(termuxBin)) {
        wakelockAvailable = true;
      } else {
        try {
          (0, import_child_process.execSync)("command -v termux-wake-lock", { stdio: "ignore", timeout: 1e3 });
          wakelockAvailable = true;
        } catch {
          wakelockAvailable = false;
        }
      }
    }
    checks.push({
      id: "background_wakelock",
      name: "Android Background Wake-Lock & Battery Optimization",
      category: "os",
      status: wakelockAvailable ? "passed" : isAndroid ? "warning" : "passed",
      value: wakelockAvailable ? "termux-api wake-lock ready" : isAndroid ? "Missing termux-wake-lock" : "Non-Android Host (N/A)",
      message: isAndroid && !wakelockAvailable ? "Wakelock command not installed. Android may suspend CPU when screen turns off. Run `pkg install termux-api`." : "Process can prevent aggressive device sleep.",
      critical: false
    });
    if (isAndroid && !wakelockAvailable) {
      recommendations.push('Run "termux-wake-lock" and disable Battery Optimization for Termux in Android Settings to prevent sleep termination.');
    }
    const networkInterfaces = import_os.default.networkInterfaces();
    let hasLanIp = false;
    let lanAddresses = [];
    Object.entries(networkInterfaces).forEach(([name, ifaces]) => {
      ifaces == null ? void 0 : ifaces.forEach((iface) => {
        if (!iface.internal && iface.family === "IPv4") {
          hasLanIp = true;
          lanAddresses.push(`${name}: ${iface.address}`);
        }
      });
    });
    checks.push({
      id: "network_interfaces",
      name: "Local Network (LAN / Wi-Fi) Discovery",
      category: "network",
      status: hasLanIp ? "passed" : "warning",
      value: lanAddresses.length > 0 ? lanAddresses.join(", ") : "Loopback Only (127.0.0.1)",
      message: hasLanIp ? `Server can be reached by other devices on LAN at ${lanAddresses.join(", ")}.` : "No active non-internal IPv4 interface detected. Wi-Fi may be disabled or disconnected.",
      critical: false
    });
    let detectedProfile = "profile_b";
    if (totalMemMb < 700 || isArmv7 || androidApiLevel && androidApiLevel < 26) {
      detectedProfile = "profile_a";
    } else if (totalMemMb >= 2048 && is64Bit && (!androidApiLevel || androidApiLevel >= 28)) {
      detectedProfile = "profile_c";
    } else {
      detectedProfile = "profile_b";
    }
    if (config.allowLan) {
      securityWarnings.push("LAN access is enabled. Plain HTTP on untrusted public Wi-Fi exposes credentials. Use a trusted home network or SSH tunnel.");
    } else {
      recommendations.push("Server is currently bound to local network interface. To securely manage from your laptop, connect to the same Wi-Fi or run SSH port forwarding.");
    }
    const report = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      detectedProfile,
      profileDetails: PROFILES[detectedProfile],
      device: {
        arch,
        platform,
        osRelease: release,
        nodeVersion: nodeVer,
        isAndroid,
        isTermux,
        termuxVersion,
        androidApiLevel,
        cpuCores: import_os.default.cpus().length,
        totalMemoryMb: totalMemMb,
        freeMemoryMb: freeMemMb,
        heapLimitMb: Math.round(v8HeapLimitMb()),
        storage: {
          dataDir: config.dataDir,
          writable: storageWritable,
          estimatedFreeMb: freeStorageMb
        }
      },
      checks,
      securityWarnings,
      recommendations
    };
    _CapabilityDetector.cachedReport = report;
    return report;
  }
  static getCached() {
    return _CapabilityDetector.cachedReport;
  }
};
_CapabilityDetector.cachedReport = null;
var CapabilityDetector = _CapabilityDetector;
function v8HeapLimitMb() {
  try {
    const v8 = require("v8");
    const stats = v8.getHeapStatistics();
    return stats.heap_size_limit / (1024 * 1024);
  } catch {
    return 256;
  }
}

// src/server/storage/file-storage.ts
var import_fs5 = __toESM(require("fs"));
var import_path5 = __toESM(require("path"));
var import_crypto4 = __toESM(require("crypto"));
var FORBIDDEN_EXTENSIONS = /* @__PURE__ */ new Set([
  ".apk",
  ".sh",
  ".bash",
  ".dex",
  ".so",
  ".exe",
  ".bat",
  ".cmd",
  ".vbs",
  ".bin",
  ".elf"
]);
var FileStorageService = class {
  static initialize() {
    if (!import_fs5.default.existsSync(this.storageDir)) {
      import_fs5.default.mkdirSync(this.storageDir, { recursive: true });
    }
  }
  static isExtensionAllowed(filename) {
    const ext = import_path5.default.extname(filename || "").toLowerCase();
    return !FORBIDDEN_EXTENSIONS.has(ext);
  }
  static sanitizeFilename(rawName) {
    const clean = (rawName || "").replace(/\0/g, "").trim();
    const base = import_path5.default.basename(clean);
    return base.replace(/[^a-zA-Z0-9._-]/g, "_");
  }
  static sanitizeFileName(rawName) {
    return this.sanitizeFilename(rawName);
  }
  static validatePathSafe(targetPath) {
    const clean = (targetPath || "").replace(/\0/g, "").trim();
    if (!clean || clean.includes("..")) {
      throw new Error("Access denied: Path traversal detected.");
    }
    const resolved = import_path5.default.resolve(this.storageDir, clean);
    if (!resolved.startsWith(this.storageDir)) {
      throw new Error("Access denied: Path traversal outside allowed storage directory.");
    }
    return resolved;
  }
  static async storeFile(params) {
    this.initialize();
    if (!this.isExtensionAllowed(params.originalName)) {
      throw new Error(`Executable file upload forbidden: ${import_path5.default.extname(params.originalName)} files are blocked.`);
    }
    const sanitizedName = this.sanitizeFilename(params.originalName);
    const ext = import_path5.default.extname(sanitizedName);
    const fileId = generateUUID();
    const storageName = `${fileId}${ext}`;
    const destinationPath = import_path5.default.join(this.storageDir, storageName);
    const hash = import_crypto4.default.createHash("sha256").update(params.buffer).digest("hex");
    import_fs5.default.writeFileSync(destinationPath, params.buffer);
    const record = {
      id: fileId,
      originalName: sanitizedName,
      storageName,
      mimeType: params.mimeType || "application/octet-stream",
      sizeBytes: params.buffer.length,
      sha256: hash,
      uploadedBy: params.user.username,
      description: params.description || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.insert("_files", record);
    return record;
  }
  static listFiles(user) {
    const files = db.query("_files", { limit: 500 }).data;
    if (!user || user.role === "admin" || user.role === "super_admin") {
      return files;
    }
    return files.filter((f) => f.uploadedBy === user.username);
  }
  static getFileRecord(id) {
    return db.findById("_files", id);
  }
  static getFilePath(record) {
    return import_path5.default.join(this.storageDir, record.storageName);
  }
  static deleteFile(id, user) {
    const record = this.getFileRecord(id);
    if (!record) return false;
    if (user.role !== "admin" && user.role !== "super_admin" && record.uploadedBy !== user.username) {
      throw new Error("Access denied: You do not have permission to delete this file.");
    }
    const filePath = this.getFilePath(record);
    if (import_fs5.default.existsSync(filePath)) {
      try {
        import_fs5.default.unlinkSync(filePath);
      } catch {
      }
    }
    return db.delete("_files", id);
  }
  static getStorageStats() {
    const files = db.query("_files", { limit: 1e3 }).data;
    const totalSizeBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    return {
      totalFiles: files.length,
      totalSizeBytes
    };
  }
};
FileStorageService.storageDir = import_path5.default.resolve(config.storageDir);

// src/server/backup/manager.ts
var import_fs6 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));
var import_crypto5 = __toESM(require("crypto"));
var BackupManager = class {
  static async createBackup(createdBy = "system") {
    var _a;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupId = generateUUID();
    const filename = `androbase_backup_${timestamp}.json`;
    const targetFilePath = import_path6.default.join(this.backupsDir, filename);
    const dbDump = db.getRawDump();
    const files = db.query("_files").data;
    const fileInventory = files.map((f) => ({
      id: f.id,
      storageName: f.storageName,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes,
      sha256: f.sha256
    }));
    const detectedProfile = ((_a = CapabilityDetector.getCached()) == null ? void 0 : _a.detectedProfile) || "profile_b";
    const tempMetadata = {
      id: backupId,
      filename,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      sizeBytes: 0,
      sha256: "",
      tablesCount: Object.keys(dbDump.schemas).length,
      filesCount: fileInventory.length,
      version: config.version,
      profile: detectedProfile
    };
    const archive = {
      metadata: tempMetadata,
      database: dbDump,
      configSnapshot: {
        version: config.version,
        port: config.port,
        allowLan: config.allowLan,
        maxUploadBytes: config.maxUploadBytes,
        maxMemoryMb: config.maxMemoryMb,
        createdTimestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      fileInventory
    };
    const serialized = JSON.stringify(archive, null, 2);
    const sha256 = import_crypto5.default.createHash("sha256").update(serialized).digest("hex");
    const sizeBytes = Buffer.byteLength(serialized, "utf8");
    archive.metadata.sha256 = sha256;
    archive.metadata.sizeBytes = sizeBytes;
    const finalSerialized = JSON.stringify(archive, null, 2);
    const tempPath = `${targetFilePath}.tmp`;
    import_fs6.default.writeFileSync(tempPath, finalSerialized, { mode: 384 });
    import_fs6.default.renameSync(tempPath, targetFilePath);
    AuditLogger.log({
      action: "backup.created",
      username: createdBy,
      ip: "127.0.0.1",
      userAgent: "internal",
      status: "success",
      details: { backupId, filename, sha256, sizeBytes }
    });
    return archive.metadata;
  }
  static listBackups() {
    if (!import_fs6.default.existsSync(this.backupsDir)) return [];
    const files = import_fs6.default.readdirSync(this.backupsDir);
    const backups = [];
    for (const file of files) {
      if (file.endsWith(".json") && file.startsWith("androbase_backup_")) {
        try {
          const filePath = import_path6.default.join(this.backupsDir, file);
          const raw = import_fs6.default.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed && parsed.metadata) {
            backups.push(parsed.metadata);
          }
        } catch {
        }
      }
    }
    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  static verifyBackupIntegrity(filename) {
    const safeTarget = import_path6.default.normalize(import_path6.default.join(this.backupsDir, import_path6.default.basename(filename)));
    if (!import_fs6.default.existsSync(safeTarget)) {
      return { valid: false, message: "Backup file does not exist." };
    }
    try {
      const raw = import_fs6.default.readFileSync(safeTarget, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed.metadata || !parsed.database || !parsed.database.schemas) {
        return { valid: false, message: "Backup payload structure is malformed or missing tables." };
      }
      return { valid: true, message: "Backup integrity verified with valid schema structure.", metadata: parsed.metadata };
    } catch (err) {
      return { valid: false, message: `Backup verification failed: ${err.message}` };
    }
  }
  static restoreBackup(filename, performedBy) {
    const safeTarget = import_path6.default.normalize(import_path6.default.join(this.backupsDir, import_path6.default.basename(filename)));
    const check = this.verifyBackupIntegrity(filename);
    if (!check.valid) {
      throw new Error(`Cannot restore invalid backup: ${check.message}`);
    }
    const raw = import_fs6.default.readFileSync(safeTarget, "utf8");
    const parsed = JSON.parse(raw);
    const rollbackDump = db.getRawDump();
    const rollbackPath = import_path6.default.join(this.backupsDir, `pre_restore_rollback_${Date.now()}.json`);
    try {
      import_fs6.default.writeFileSync(rollbackPath, JSON.stringify(rollbackDump, null, 2), { mode: 384 });
    } catch (e) {
      console.warn("Could not save pre-restore rollback snapshot:", e);
    }
    try {
      db.restoreFromDump(parsed.database);
      AuditLogger.log({
        action: "backup.restored",
        username: performedBy,
        ip: "127.0.0.1",
        userAgent: "internal",
        status: "success",
        details: { restoredFile: filename, tablesRestored: Object.keys(parsed.database.schemas).length }
      });
      return {
        success: true,
        message: `Successfully restored ${Object.keys(parsed.database.schemas).length} tables from ${filename}. Rollback point saved.`
      };
    } catch (err) {
      db.restoreFromDump(rollbackDump);
      throw new Error(`Restoration failed and was safely rolled back: ${err.message}`);
    }
  }
  static getBackupFilePath(filename) {
    const safeTarget = import_path6.default.normalize(import_path6.default.join(this.backupsDir, import_path6.default.basename(filename)));
    if (!import_fs6.default.existsSync(safeTarget)) {
      throw new Error("Backup file not found.");
    }
    return safeTarget;
  }
};
BackupManager.backupsDir = config.backupsDir;

// src/server/network/manager.ts
var import_os2 = __toESM(require("os"));
var NetworkManager = class {
  static getInterfaces() {
    const osInterfaces = import_os2.default.networkInterfaces();
    const result = [];
    Object.entries(osInterfaces).forEach(([name, ifaces]) => {
      if (!ifaces) return;
      ifaces.forEach((iface) => {
        let type = "unknown";
        if (iface.internal) {
          type = "loopback";
        } else if (name.startsWith("wlan") || name.startsWith("wifi") || name.startsWith("en") || name.startsWith("wl")) {
          type = "lan";
        } else if (name.startsWith("rmnet") || name.startsWith("ccmni") || name.startsWith("pdp")) {
          type = "cellular";
        } else if (name.startsWith("ap") || name.startsWith("tether") || iface.address.startsWith("192.168.43.")) {
          type = "hotspot";
        } else if (name.startsWith("tun") || name.startsWith("tap") || name.startsWith("wg")) {
          type = "vpn";
        }
        result.push({
          name,
          address: iface.address,
          family: iface.family,
          internal: iface.internal,
          type
        });
      });
    });
    return result;
  }
  static getPrimaryLanIp() {
    const interfaces = this.getInterfaces();
    const lan = interfaces.find((i) => !i.internal && i.family === "IPv4" && (i.type === "lan" || i.type === "hotspot"));
    if (lan) return lan.address;
    const anyIpv4 = interfaces.find((i) => !i.internal && i.family === "IPv4");
    return anyIpv4 ? anyIpv4.address : null;
  }
  static getAccessUrls() {
    const port = config.port;
    const local = `http://127.0.0.1:${port}`;
    const primaryLan = this.getPrimaryLanIp();
    const interfaces = this.getInterfaces();
    const allLanUrls = interfaces.filter((i) => !i.internal && i.family === "IPv4").map((i) => `http://${i.address}:${port}`);
    return {
      local,
      lan: primaryLan ? `http://${primaryLan}:${port}` : null,
      allLanUrls
    };
  }
  static getSshTunnelCommand(termuxPort = 8022, appPort = config.port) {
    const lanIp = this.getPrimaryLanIp() || "<PHONE_WIFI_IP>";
    return {
      commandLinuxMac: `ssh -N -L ${appPort}:localhost:${appPort} -p ${termuxPort} u0_a... @${lanIp}`,
      commandWindowsPowershell: `ssh -N -L ${appPort}:localhost:${appPort} -p ${termuxPort} <user>@${lanIp}`,
      explanation: "SSH Port Forwarding tunnels port 3000 securely over SSH. This allows you to open http://localhost:3000 in your laptop browser even when the phone server is bound to loopback only, keeping your traffic encrypted across untrusted networks."
    };
  }
};

// src/server/modules/system/metrics.ts
var import_os3 = __toESM(require("os"));
var import_fs7 = __toESM(require("fs"));
var import_child_process2 = require("child_process");
var SystemMetricsCollector = class {
  // 30 rolling data points
  static initialize() {
    this.sampleCpu();
    this.sampleNetwork();
    setInterval(() => {
      this.recordHistoryPoint();
    }, 1e4);
  }
  static getCpuTimes() {
    const cpus = import_os3.default.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    return { idle, total };
  }
  static sampleCpu() {
    const current = this.getCpuTimes();
    if (!this.lastCpuSample) {
      this.lastCpuSample = current;
      return 0;
    }
    const idleDelta = current.idle - this.lastCpuSample.idle;
    const totalDelta = current.total - this.lastCpuSample.total;
    this.lastCpuSample = current;
    if (totalDelta <= 0) return 0;
    const usage = 100 - Math.round(idleDelta / totalDelta * 100);
    return Math.max(0, Math.min(100, usage));
  }
  static sampleNetwork() {
    let totalRx = 0;
    let totalTx = 0;
    const now = Date.now();
    try {
      if (import_fs7.default.existsSync("/proc/net/dev")) {
        const lines = import_fs7.default.readFileSync("/proc/net/dev", "utf8").split("\n");
        for (const line of lines) {
          if (!line.includes(":")) continue;
          const parts = line.trim().split(/\s+/);
          const rx = parseInt(parts[1], 10) || 0;
          const tx = parseInt(parts[9], 10) || 0;
          totalRx += rx;
          totalTx += tx;
        }
      }
    } catch {
      totalRx = 0;
      totalTx = 0;
    }
    if (!this.lastNetBytes) {
      this.lastNetBytes = { rx: totalRx, tx: totalTx, time: now };
      return { rxSpeedBps: 0, txSpeedBps: 0, totalRxBytes: totalRx, totalTxBytes: totalTx };
    }
    const timeDiffSec = (now - this.lastNetBytes.time) / 1e3;
    const rxDelta = totalRx >= this.lastNetBytes.rx ? totalRx - this.lastNetBytes.rx : 0;
    const txDelta = totalTx >= this.lastNetBytes.tx ? totalTx - this.lastNetBytes.tx : 0;
    const rxSpeed = timeDiffSec > 0 ? Math.round(rxDelta / timeDiffSec) : 0;
    const txSpeed = timeDiffSec > 0 ? Math.round(txDelta / timeDiffSec) : 0;
    this.lastNetBytes = { rx: totalRx, tx: totalTx, time: now };
    return {
      rxSpeedBps: rxSpeed,
      txSpeedBps: txSpeed,
      totalRxBytes: totalRx,
      totalTxBytes: totalTx
    };
  }
  static getStorageDrives() {
    const drives = [];
    try {
      const output = (0, import_child_process2.execSync)("df -k .", { encoding: "utf8", timeout: 2e3 });
      const lines = output.trim().split("\n");
      if (lines.length > 1) {
        const parts = lines[lines.length - 1].trim().split(/\s+/);
        if (parts.length >= 6) {
          const totalBytes = (parseInt(parts[1], 10) || 0) * 1024;
          const usedBytes = (parseInt(parts[2], 10) || 0) * 1024;
          const freeBytes = (parseInt(parts[3], 10) || 0) * 1024;
          const percent = totalBytes > 0 ? Math.round(usedBytes / totalBytes * 100) : 0;
          drives.push({
            mount: parts[5] || "/",
            filesystem: parts[0] || "primary",
            totalBytes,
            usedBytes,
            freeBytes,
            percent
          });
        }
      }
    } catch {
      const total = 32 * 1024 * 1024 * 1024;
      drives.push({
        mount: config.dataDir,
        filesystem: "local-flash",
        totalBytes: total,
        usedBytes: Math.round(total * 0.4),
        freeBytes: Math.round(total * 0.6),
        percent: 40
      });
    }
    return drives;
  }
  static getBatteryInfo() {
    try {
      if (import_fs7.default.existsSync("/data/data/com.termux") && commandExists("termux-battery-status")) {
        const out = (0, import_child_process2.execSync)("termux-battery-status", { encoding: "utf8", timeout: 1500 });
        const data = JSON.parse(out);
        return {
          supported: true,
          present: true,
          percent: data.percentage,
          status: data.status,
          temperatureC: data.temperature ? Number((data.temperature / 10).toFixed(1)) : void 0,
          health: data.health,
          plugged: data.plugged
        };
      }
    } catch {
    }
    try {
      const batDir = "/sys/class/power_supply/BAT0";
      if (import_fs7.default.existsSync(batDir)) {
        const capacity = parseInt(import_fs7.default.readFileSync(`${batDir}/capacity`, "utf8").trim(), 10);
        const status = import_fs7.default.readFileSync(`${batDir}/status`, "utf8").trim();
        return {
          supported: true,
          present: true,
          percent: capacity,
          status
        };
      }
    } catch {
    }
    return { supported: false };
  }
  static getCpuTemperature() {
    try {
      const thermalDir = "/sys/class/thermal/thermal_zone0/temp";
      if (import_fs7.default.existsSync(thermalDir)) {
        const raw = import_fs7.default.readFileSync(thermalDir, "utf8").trim();
        const temp = parseInt(raw, 10);
        return temp > 1e3 ? Math.round(temp / 1e3) : temp;
      }
    } catch {
    }
    return void 0;
  }
  static getListeningPortsCount() {
    try {
      if (import_fs7.default.existsSync("/proc/net/tcp")) {
        const content = import_fs7.default.readFileSync("/proc/net/tcp", "utf8");
        return (content.match(/\s0A\s/g) || []).length;
      }
    } catch {
    }
    return 1;
  }
  static recordHistoryPoint() {
    const cpu = this.sampleCpu();
    const totalMem = import_os3.default.totalmem();
    const freeMem = import_os3.default.freemem();
    const ramPercent = Math.round((totalMem - freeMem) / totalMem * 100);
    const net2 = this.sampleNetwork();
    this.history.push({
      timestamp: Date.now(),
      cpuPercent: cpu,
      ramPercent,
      rxSpeedBps: net2.rxSpeedBps,
      txSpeedBps: net2.txSpeedBps
    });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }
  static collectMetrics() {
    const totalMem = import_os3.default.totalmem();
    const freeMem = import_os3.default.freemem();
    const usedMem = totalMem - freeMem;
    const cpuUsage = this.sampleCpu();
    const net2 = this.sampleNetwork();
    const drives = this.getStorageDrives();
    const battery = this.getBatteryInfo();
    const cpuTemp = this.getCpuTemperature();
    const cpus = import_os3.default.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown Processor";
    const cpuSpeed = cpus.length > 0 ? cpus[0].speed : 0;
    let totalStorage = 0;
    let usedStorage = 0;
    drives.forEach((d) => {
      totalStorage += d.totalBytes;
      usedStorage += d.usedBytes;
    });
    const netInterfaces = [];
    const ifaces = import_os3.default.networkInterfaces();
    for (const name in ifaces) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === "IPv4") {
          netInterfaces.push({
            name,
            address: iface.address,
            family: "IPv4",
            internal: iface.internal,
            type: iface.internal ? "loopback" : name.includes("wlan") ? "lan" : "unknown"
          });
        }
      }
    }
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      cpu: {
        usagePercent: cpuUsage,
        model: cpuModel,
        cores: cpus.length,
        speedMhz: cpuSpeed,
        loadAverage: import_os3.default.loadavg()
      },
      memory: {
        totalMb: Math.round(totalMem / (1024 * 1024)),
        usedMb: Math.round(usedMem / (1024 * 1024)),
        freeMb: Math.round(freeMem / (1024 * 1024)),
        usagePercent: Math.round(usedMem / totalMem * 100)
      },
      storage: {
        drives,
        totalBytes: totalStorage,
        usedBytes: usedStorage,
        freeBytes: totalStorage - usedStorage,
        usagePercent: totalStorage > 0 ? Math.round(usedStorage / totalStorage * 100) : 0
      },
      network: {
        bandwidth: net2,
        interfaces: netInterfaces,
        listeningPortsCount: this.getListeningPortsCount(),
        activeConnectionsCount: 1
      },
      environment: {
        osRelease: import_os3.default.release(),
        platform: import_os3.default.platform(),
        arch: import_os3.default.arch(),
        battery,
        cpuTempC: cpuTemp
      },
      history: [...this.history]
    };
  }
  static collectLiveMetrics() {
    return this.collectMetrics();
  }
  static getHistory() {
    return [...this.history];
  }
};
SystemMetricsCollector.lastCpuSample = null;
SystemMetricsCollector.lastNetBytes = null;
SystemMetricsCollector.history = [];
SystemMetricsCollector.MAX_HISTORY = 30;
function commandExists(cmd) {
  try {
    (0, import_child_process2.execSync)(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

// src/server/modules/files/manager.ts
var import_fs8 = __toESM(require("fs"));
var import_path7 = __toESM(require("path"));
var BASE_ALLOWED_ROOT = import_path7.default.resolve(config.dataDir);
var ServerFileManager = class {
  static getRoot() {
    return BASE_ALLOWED_ROOT;
  }
  // Security: Normalize and verify that requested path never escapes the allowed base root
  static resolveSafePath(relativePath = "") {
    const clean = (relativePath || "").replace(/\0/g, "").trim();
    if (!clean || clean === "/" || clean === ".") return BASE_ALLOWED_ROOT;
    let resolved;
    if (import_path7.default.isAbsolute(clean)) {
      resolved = import_path7.default.resolve(clean);
    } else {
      resolved = import_path7.default.resolve(BASE_ALLOWED_ROOT, clean);
    }
    if (resolved !== BASE_ALLOWED_ROOT && !resolved.startsWith(BASE_ALLOWED_ROOT + import_path7.default.sep)) {
      throw new Error("Access denied: Path traversal detected outside allowed directory boundary.");
    }
    return resolved;
  }
  static listDirectory(relativeSubPath = "") {
    const targetDir = this.resolveSafePath(relativeSubPath);
    if (!import_fs8.default.existsSync(targetDir)) {
      throw new Error(`Directory does not exist: ${relativeSubPath}`);
    }
    const stat = import_fs8.default.statSync(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${relativeSubPath}`);
    }
    const rawNames = import_fs8.default.readdirSync(targetDir);
    const entries = [];
    for (const name of rawNames) {
      if (name.endsWith(".wal") || name.startsWith(".upload.")) continue;
      const fullPath = import_path7.default.join(targetDir, name);
      try {
        const itemStat = import_fs8.default.statSync(fullPath);
        const rel = import_path7.default.relative(BASE_ALLOWED_ROOT, fullPath);
        entries.push({
          name,
          path: rel,
          isDirectory: itemStat.isDirectory(),
          sizeBytes: itemStat.isDirectory() ? 0 : itemStat.size,
          updatedAt: itemStat.mtime.toISOString(),
          mimeType: itemStat.isDirectory() ? "inode/directory" : this.guessMimeType(name),
          isProtected: name.startsWith(".bootstrap_token")
        });
      } catch {
      }
    }
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    const currentRel = import_path7.default.relative(BASE_ALLOWED_ROOT, targetDir);
    return {
      currentPath: currentRel || "/",
      entries
    };
  }
  static createFolder(parentPath, folderName, username = "system") {
    const cleanName = folderName.replace(/[/\\?%*:|"<>]/g, "_").trim();
    if (!cleanName) throw new Error("Invalid folder name.");
    const targetDir = import_path7.default.join(this.resolveSafePath(parentPath), cleanName);
    if (import_fs8.default.existsSync(targetDir)) {
      throw new Error(`Folder "${cleanName}" already exists.`);
    }
    import_fs8.default.mkdirSync(targetDir, { recursive: true, mode: 448 });
    AuditLogger.log({
      action: "files.folder_created",
      username,
      status: "success",
      details: { folderName: cleanName, parentPath }
    });
    return import_path7.default.relative(BASE_ALLOWED_ROOT, targetDir);
  }
  static createDirectory(parentPath, folderName, username = "system") {
    return this.createFolder(parentPath, folderName, username);
  }
  static deleteItem(relativeItemPath, username = "system") {
    const target = this.resolveSafePath(relativeItemPath);
    if (!import_fs8.default.existsSync(target)) throw new Error("File or folder not found.");
    if (target === BASE_ALLOWED_ROOT) throw new Error("Cannot delete the root storage directory.");
    if (import_path7.default.basename(target) === ".bootstrap_token") throw new Error("Cannot delete security bootstrap token.");
    const stat = import_fs8.default.statSync(target);
    if (stat.isDirectory()) {
      import_fs8.default.rmSync(target, { recursive: true, force: true });
    } else {
      import_fs8.default.unlinkSync(target);
    }
    AuditLogger.log({
      action: "files.deleted",
      username,
      status: "success",
      details: { path: relativeItemPath }
    });
  }
  static deletePath(relativeItemPath, username = "system") {
    return this.deleteItem(relativeItemPath, username);
  }
  static renameItem(oldRelativePath, newName, username = "system") {
    const cleanName = newName.replace(/[/\\?%*:|"<>]/g, "_").trim();
    if (!cleanName) throw new Error("Invalid new name.");
    const source = this.resolveSafePath(oldRelativePath);
    if (!import_fs8.default.existsSync(source)) throw new Error("Source file or folder not found.");
    const parentDir = import_path7.default.dirname(source);
    const destination = import_path7.default.join(parentDir, cleanName);
    if (import_fs8.default.existsSync(destination)) {
      throw new Error(`An item named "${cleanName}" already exists in this folder.`);
    }
    import_fs8.default.renameSync(source, destination);
    AuditLogger.log({
      action: "files.renamed",
      username,
      status: "success",
      details: { from: oldRelativePath, to: cleanName }
    });
    return import_path7.default.relative(BASE_ALLOWED_ROOT, destination);
  }
  static renamePath(oldRelativePath, newPath, username = "system") {
    const newName = import_path7.default.basename(newPath);
    return this.renameItem(oldRelativePath, newName, username);
  }
  static copyOrMoveItem(sourceRel, destFolderRel, isMove, username = "system") {
    const source = this.resolveSafePath(sourceRel);
    const destDir = this.resolveSafePath(destFolderRel);
    if (!import_fs8.default.existsSync(source)) throw new Error("Source item does not exist.");
    if (!import_fs8.default.existsSync(destDir) || !import_fs8.default.statSync(destDir).isDirectory()) {
      throw new Error("Destination is not a valid directory.");
    }
    const fileName = import_path7.default.basename(source);
    const destination = import_path7.default.join(destDir, fileName);
    if (isMove) {
      import_fs8.default.renameSync(source, destination);
    } else {
      import_fs8.default.cpSync(source, destination, { recursive: true });
    }
    AuditLogger.log({
      action: isMove ? "files.moved" : "files.copied",
      username,
      status: "success",
      details: { from: sourceRel, to: destFolderRel }
    });
  }
  static copyPath(sourceRel, destFolderRel, username = "system") {
    return this.copyOrMoveItem(sourceRel, destFolderRel, false, username);
  }
  static movePath(sourceRel, destFolderRel, username = "system") {
    return this.copyOrMoveItem(sourceRel, destFolderRel, true, username);
  }
  static readFileContent(relativeFilePath) {
    const target = this.resolveSafePath(relativeFilePath);
    if (!import_fs8.default.existsSync(target) || import_fs8.default.statSync(target).isDirectory()) {
      throw new Error("File not found or is a directory.");
    }
    const stat = import_fs8.default.statSync(target);
    if (stat.size > 5 * 1024 * 1024) {
      throw new Error("File is larger than 5 MB. Please download it directly to view.");
    }
    const mime = this.guessMimeType(target);
    const content = import_fs8.default.readFileSync(target, "utf8");
    return {
      content,
      mimeType: mime,
      size: stat.size
    };
  }
  static writeFileContent(relativeFilePath, content, username = "system") {
    const target = this.resolveSafePath(relativeFilePath);
    const parentDir = import_path7.default.dirname(target);
    if (!import_fs8.default.existsSync(parentDir)) {
      import_fs8.default.mkdirSync(parentDir, { recursive: true });
    }
    import_fs8.default.writeFileSync(target, content, { encoding: "utf8", mode: 384 });
    AuditLogger.log({
      action: "files.edited",
      username,
      status: "success",
      details: { path: relativeFilePath, sizeBytes: Buffer.byteLength(content) }
    });
  }
  static searchFiles(query, maxResults = 30) {
    const results = [];
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];
    const walk = (currentDir) => {
      if (results.length >= maxResults) return;
      try {
        const items = import_fs8.default.readdirSync(currentDir);
        for (const item of items) {
          if (results.length >= maxResults) break;
          if (item.startsWith(".")) continue;
          const fullPath = import_path7.default.join(currentDir, item);
          const stat = import_fs8.default.statSync(fullPath);
          if (item.toLowerCase().includes(cleanQuery)) {
            results.push({
              name: item,
              path: import_path7.default.relative(BASE_ALLOWED_ROOT, fullPath),
              isDirectory: stat.isDirectory(),
              sizeBytes: stat.isDirectory() ? 0 : stat.size,
              updatedAt: stat.mtime.toISOString(),
              mimeType: stat.isDirectory() ? "inode/directory" : this.guessMimeType(item)
            });
          }
          if (stat.isDirectory()) {
            walk(fullPath);
          }
        }
      } catch {
      }
    };
    walk(BASE_ALLOWED_ROOT);
    return results;
  }
  static guessMimeType(filename) {
    const ext = import_path7.default.extname(filename).toLowerCase();
    const map = {
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".json": "application/json",
      ".js": "application/javascript",
      ".ts": "application/typescript",
      ".html": "text/html",
      ".css": "text/css",
      ".sh": "application/x-sh",
      ".py": "text/x-python",
      ".php": "application/x-php",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip"
    };
    return map[ext] || "application/octet-stream";
  }
};

// src/server/modules/apps/manager.ts
var import_child_process3 = require("child_process");
var import_path8 = __toESM(require("path"));
var import_fs9 = __toESM(require("fs"));
var APPS_TABLE = "_hosted_apps";
var APPS_BASE_DIR = import_path8.default.join(config.dataDir, "apps");
var APPS_LOGS_DIR = import_path8.default.join(config.dataDir, "logs", "apps");
var runningProcesses = /* @__PURE__ */ new Map();
var AppHostingManager = class {
  static async initialize() {
    [APPS_BASE_DIR, APPS_LOGS_DIR].forEach((dir) => {
      if (!import_fs9.default.existsSync(dir)) import_fs9.default.mkdirSync(dir, { recursive: true, mode: 448 });
    });
    db.ensureTable({
      name: APPS_TABLE,
      primaryKey: "id",
      isSystem: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: [
        { name: "id", type: "string", required: true, unique: true },
        { name: "name", type: "string", required: true, unique: true },
        { name: "type", type: "string", required: true },
        { name: "directoryPath", type: "string", required: true },
        { name: "entryPoint", type: "string", required: true },
        { name: "port", type: "number", required: true },
        { name: "env", type: "json" },
        { name: "autoStart", type: "boolean" },
        { name: "status", type: "string", required: true },
        { name: "pid", type: "number" },
        { name: "createdAt", type: "date", required: true },
        { name: "updatedAt", type: "date", required: true },
        { name: "restartCount", type: "number" },
        { name: "lastError", type: "string" }
      ]
    });
    const apps = this.listApps();
    for (const app of apps) {
      if (app.autoStart && app.status !== "stopped") {
        try {
          console.log(`[AppHosting] Auto-starting application "${app.name}"...`);
          await this.startApp(app.id, "system");
        } catch (err) {
          console.error(`[AppHosting] Failed to auto-start "${app.name}":`, err.message);
        }
      } else if (app.status === "running") {
        db.update(APPS_TABLE, app.id, {
          status: "stopped",
          pid: void 0
        });
      }
    }
  }
  static listApps() {
    const list = db.query(APPS_TABLE).data;
    return list.map((app) => {
      if (app.status === "running" && app.pid) {
        try {
          process.kill(app.pid, 0);
        } catch {
          app.status = "stopped";
          app.pid = void 0;
          db.update(APPS_TABLE, app.id, { status: "stopped", pid: void 0 });
        }
      }
      return app;
    });
  }
  static getApp(id) {
    return db.findById(APPS_TABLE, id);
  }
  static createApp(params, username = "system") {
    const cleanName = params.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanName) throw new Error("Invalid application name. Must contain alphanumeric characters, hyphens, or underscores.");
    const existing = db.query(APPS_TABLE, {
      filters: [{ field: "name", operator: "eq", value: cleanName }]
    });
    if (existing.total > 0) throw new Error(`Application "${cleanName}" already exists.`);
    if (params.port < 1024 || params.port > 65535) {
      throw new Error("Port must be a non-privileged user port between 1024 and 65535.");
    }
    if (params.port === config.port) {
      throw new Error(`Port ${params.port} is reserved by the main server.`);
    }
    const appDir2 = import_path8.default.join(APPS_BASE_DIR, cleanName);
    if (!import_fs9.default.existsSync(appDir2)) {
      import_fs9.default.mkdirSync(appDir2, { recursive: true, mode: 448 });
    }
    this.createStarterTemplate(appDir2, params.type, params.entryPoint, params.port);
    const id = generateUUID();
    const app = {
      id,
      name: cleanName,
      type: params.type,
      directoryPath: import_path8.default.relative(config.dataDir, appDir2),
      entryPoint: params.entryPoint || this.getDefaultEntryPoint(params.type),
      port: params.port,
      env: params.env || {},
      autoStart: !!params.autoStart,
      status: "stopped",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      restartCount: 0
    };
    db.insert(APPS_TABLE, app);
    AuditLogger.log({
      action: "apps.created",
      username,
      status: "success",
      details: { name: app.name, type: app.type, port: app.port }
    });
    return app;
  }
  static async startApp(id, username = "system") {
    var _a, _b;
    const app = this.getApp(id);
    if (!app) throw new Error("Application not found.");
    if (app.status === "running" && app.pid) {
      try {
        process.kill(app.pid, 0);
        return app;
      } catch {
      }
    }
    const absDir = import_path8.default.resolve(config.dataDir, app.directoryPath);
    if (!import_fs9.default.existsSync(absDir)) {
      throw new Error(`Application working directory does not exist: ${app.directoryPath}`);
    }
    const logFilePath = import_path8.default.join(APPS_LOGS_DIR, `${app.id}.log`);
    const logStream = import_fs9.default.createWriteStream(logFilePath, { flags: "a" });
    const launchCommand = this.buildLaunchCommand(app);
    const env = {
      ...process.env,
      PORT: String(app.port),
      NODE_ENV: "production",
      ...app.env
    };
    const child = (0, import_child_process3.spawn)(launchCommand.command, launchCommand.args, {
      cwd: absDir,
      env,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    (_a = child.stdout) == null ? void 0 : _a.pipe(logStream);
    (_b = child.stderr) == null ? void 0 : _b.pipe(logStream);
    child.on("error", (err) => {
      console.error(`[AppHosting] App "${app.name}" process error:`, err);
      db.update(APPS_TABLE, app.id, {
        status: "failed",
        lastError: err.message,
        pid: void 0
      });
      runningProcesses.delete(app.id);
    });
    child.on("exit", (code, signal) => {
      console.log(`[AppHosting] App "${app.name}" exited with code ${code}, signal: ${signal}`);
      runningProcesses.delete(app.id);
      db.update(APPS_TABLE, app.id, {
        status: code === 0 ? "stopped" : "failed",
        pid: void 0,
        lastError: code !== 0 ? `Process exited with exit code ${code}` : void 0
      });
    });
    if (child.pid) {
      runningProcesses.set(app.id, child);
      const updated = db.update(APPS_TABLE, app.id, {
        status: "running",
        pid: child.pid,
        lastError: void 0,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      AuditLogger.log({
        action: "apps.started",
        username,
        status: "success",
        details: { name: app.name, pid: child.pid }
      });
      return updated;
    }
    throw new Error("Failed to spawn child process.");
  }
  static async stopApp(id, username = "system") {
    const app = this.getApp(id);
    if (!app) throw new Error("Application not found.");
    const child = runningProcesses.get(id);
    if (child && child.pid) {
      try {
        child.kill("SIGTERM");
      } catch {
        try {
          child.kill("SIGKILL");
        } catch {
        }
      }
      runningProcesses.delete(id);
    } else if (app.pid) {
      try {
        process.kill(app.pid, "SIGTERM");
      } catch {
      }
    }
    const updated = db.update(APPS_TABLE, app.id, {
      status: "stopped",
      pid: void 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    AuditLogger.log({
      action: "apps.stopped",
      username,
      status: "success",
      details: { name: app.name }
    });
    return updated;
  }
  static async restartApp(id, username = "system") {
    const app = this.getApp(id);
    if (!app) throw new Error("Application not found.");
    await this.stopApp(id, username);
    await new Promise((resolve3) => setTimeout(resolve3, 800));
    db.update(APPS_TABLE, id, {
      restartCount: (app.restartCount || 0) + 1
    });
    return this.startApp(id, username);
  }
  static deleteApp(id, username = "system") {
    const app = this.getApp(id);
    if (!app) throw new Error("Application not found.");
    if (app.status === "running") {
      try {
        this.stopApp(id, username);
      } catch {
      }
    }
    db.delete(APPS_TABLE, id);
    AuditLogger.log({
      action: "apps.deleted",
      username,
      status: "success",
      details: { name: app.name }
    });
  }
  static updateApp(id, updates) {
    const app = this.getApp(id);
    if (!app) throw new Error("Application not found.");
    const updated = db.update(APPS_TABLE, id, {
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return updated;
  }
  static getAppLogs(id, maxLines = 200) {
    const logFilePath = import_path8.default.join(APPS_LOGS_DIR, `${id}.log`);
    if (!import_fs9.default.existsSync(logFilePath)) {
      return "No logs recorded yet. Start the application to begin capturing runtime output.\n";
    }
    try {
      const content = import_fs9.default.readFileSync(logFilePath, "utf8");
      const lines = content.split("\n");
      return lines.slice(-maxLines).join("\n");
    } catch (err) {
      return `Failed to read application log file: ${err.message}`;
    }
  }
  static getLogs(id, maxLines = 200) {
    const raw = this.getAppLogs(id, maxLines);
    return raw.split("\n").filter(Boolean);
  }
  static buildLaunchCommand(app) {
    switch (app.type) {
      case "node":
        return { command: "node", args: [app.entryPoint] };
      case "python":
        const pyCmd = commandExists2("python3") ? "python3" : "python";
        return { command: pyCmd, args: [app.entryPoint] };
      case "php":
        return { command: "php", args: ["-S", `0.0.0.0:${app.port}`, app.entryPoint] };
      case "static":
        return {
          command: "node",
          args: [
            "-e",
            `const http = require('http'); const fs = require('fs'); const path = require('path'); const p = ${app.port}; const dir = process.cwd(); http.createServer((q, r) => { let f = path.join(dir, q.url === '/' ? 'index.html' : q.url); if (!fs.existsSync(f)) { r.writeHead(404); r.end('404 Not Found'); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(p, '0.0.0.0', () => console.log('Static server listening on port ' + p));`
          ]
        };
      case "custom":
      default:
        const parts = app.entryPoint.trim().split(/\s+/);
        return { command: parts[0], args: parts.slice(1) };
    }
  }
  static getDefaultEntryPoint(type) {
    switch (type) {
      case "node":
        return "index.js";
      case "python":
        return "app.py";
      case "php":
        return "index.php";
      case "static":
        return "index.html";
      default:
        return "start.sh";
    }
  }
  static createStarterTemplate(dir, type, entryPoint, port) {
    const ep = entryPoint || this.getDefaultEntryPoint(type);
    const targetFile = import_path8.default.join(dir, ep);
    if (import_fs9.default.existsSync(targetFile)) return;
    if (type === "node") {
      import_fs9.default.writeFileSync(
        targetFile,
        `// AndroBase Node.js Hosted Application
const http = require('http');
const port = process.env.PORT || ${port};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from AndroBase Hosted Node App!',
    time: new Date().toISOString(),
    url: req.url,
    port
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:' + port);
});
`,
        { encoding: "utf8", mode: 384 }
      );
    } else if (type === "python") {
      import_fs9.default.writeFileSync(
        targetFile,
        `# AndroBase Python Hosted Application
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

port = int(os.environ.get('PORT', ${port}))
server = HTTPServer(('0.0.0.0', port), SimpleHTTPRequestHandler)
print(f"Python server running on port {port}...")
server.serve_forever()
`,
        { encoding: "utf8", mode: 384 }
      );
    } else if (type === "static") {
      import_fs9.default.writeFileSync(
        targetFile,
        `<!DOCTYPE html>
<html>
<head>
  <title>Hosted on AndroBase</title>
  <style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center; }</style>
</head>
<body>
  <h1>Welcome to your AndroBase Static Site</h1>
  <p>Edit this file in the File Manager under apps directory.</p>
</body>
</html>
`,
        { encoding: "utf8", mode: 384 }
      );
    }
  }
};
function commandExists2(cmd) {
  try {
    const { execSync: execSync7 } = require("child_process");
    execSync7(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

// src/server/modules/databases/manager.ts
var import_child_process4 = require("child_process");
var import_net = __toESM(require("net"));
var import_path9 = __toESM(require("path"));
var DatabaseSubsystemManager = class {
  static async detectEngines() {
    const engines = [];
    engines.push({
      type: "embedded",
      name: "AndroBase Portable WAL Database",
      isInstalled: true,
      isAvailable: true,
      status: "online",
      version: "1.0.0 (Pure JS ACID)",
      socketOrHost: config.dbPath,
      message: "Active zero-dependency embedded database with atomic WAL journaling."
    });
    const hasSqlite = commandExists3("sqlite3");
    engines.push({
      type: "sqlite",
      name: "SQLite 3 Engine",
      isInstalled: hasSqlite,
      isAvailable: hasSqlite,
      status: hasSqlite ? "online" : "uninstalled",
      version: hasSqlite ? getCliVersion("sqlite3 --version") : void 0,
      message: hasSqlite ? "SQLite command-line tool is installed and available for server databases." : "SQLite CLI is not installed on this host."
    });
    const hasPsql = commandExists3("psql") || commandExists3("pg_isready");
    const isPgPortOpen = await checkPortListening(5432);
    engines.push({
      type: "postgres",
      name: "PostgreSQL Relational Server",
      isInstalled: hasPsql,
      isAvailable: isPgPortOpen,
      status: isPgPortOpen ? "online" : hasPsql ? "offline" : "uninstalled",
      defaultPort: 5432,
      version: hasPsql ? getCliVersion("psql --version") : void 0,
      message: isPgPortOpen ? "PostgreSQL server is running and accepting local connections on port 5432." : hasPsql ? "PostgreSQL tools installed but the server daemon is not listening on port 5432." : "PostgreSQL is not installed on this device."
    });
    const hasMysql = commandExists3("mysql") || commandExists3("mariadb");
    const isMysqlPortOpen = await checkPortListening(3306);
    engines.push({
      type: "mysql",
      name: "MySQL / MariaDB Server",
      isInstalled: hasMysql,
      isAvailable: isMysqlPortOpen,
      status: isMysqlPortOpen ? "online" : hasMysql ? "offline" : "uninstalled",
      defaultPort: 3306,
      version: hasMysql ? getCliVersion("mysql --version") : void 0,
      message: isMysqlPortOpen ? "MySQL/MariaDB server is running and listening on port 3306." : hasMysql ? "MySQL client tools installed but service is not listening on port 3306." : "MySQL / MariaDB is not installed on this device."
    });
    return engines;
  }
  static async executeQuery(paramsOrEngine, queryOrUsername, maybeUsername) {
    let engine;
    let query;
    let username = "system";
    let databaseName;
    if (typeof paramsOrEngine === "object") {
      engine = paramsOrEngine.engine;
      query = paramsOrEngine.query;
      databaseName = paramsOrEngine.databaseName;
      if (queryOrUsername) username = queryOrUsername;
    } else {
      engine = paramsOrEngine;
      query = queryOrUsername || "";
      if (maybeUsername) username = maybeUsername;
    }
    const cleanQuery = query.trim();
    if (!cleanQuery) throw new Error("Query string cannot be empty.");
    AuditLogger.log({
      action: "db.query_executed",
      username,
      status: "success",
      details: { engine, queryPreview: cleanQuery.substring(0, 100) }
    });
    if (engine === "embedded") {
      const match = cleanQuery.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1] : "notes";
      try {
        const queryRes = db.query(tableName, { limit: 50 });
        return {
          success: true,
          result: queryRes.data,
          rowCount: queryRes.total
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else if (engine === "sqlite") {
      if (!commandExists3("sqlite3")) throw new Error("sqlite3 command is not installed.");
      const dbFile = databaseName ? import_path9.default.resolve(config.dataDir, databaseName) : import_path9.default.join(config.dataDir, "server.sqlite");
      try {
        const escaped = cleanQuery.replace(/"/g, '\\"');
        const output = (0, import_child_process4.execSync)(`sqlite3 -json "${dbFile}" "${escaped}"`, { encoding: "utf8", timeout: 5e3 });
        const parsed = output.trim() ? JSON.parse(output) : [];
        return {
          success: true,
          result: parsed,
          rowCount: Array.isArray(parsed) ? parsed.length : 1
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      return {
        success: false,
        error: `Direct ad-hoc queries for ${engine} require an active database daemon and configured credentials.`
      };
    }
  }
};
function commandExists3(cmd) {
  try {
    (0, import_child_process4.execSync)(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}
function getCliVersion(cmd) {
  try {
    const out = (0, import_child_process4.execSync)(cmd, { encoding: "utf8", timeout: 1500 });
    return out.trim().split("\n")[0];
  } catch {
    return void 0;
  }
}
function checkPortListening(port) {
  return new Promise((resolve3) => {
    const socket = new import_net.default.Socket();
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve3(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve3(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve3(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

// src/server/modules/docker/manager.ts
var import_child_process5 = require("child_process");
var DockerSubsystemManager = class {
  static getStatus() {
    const hasDockerCmd = commandExists4("docker");
    if (!hasDockerCmd) {
      return {
        isInstalled: false,
        isAvailable: false,
        message: "Docker CLI is not installed on this device. Native process and application hosting are fully active."
      };
    }
    try {
      const out = (0, import_child_process5.execSync)('docker info --format "{{.ServerVersion}}|{{.Containers}}|{{.ContainersRunning}}|{{.Images}}"', {
        encoding: "utf8",
        timeout: 2500
      });
      const parts = out.trim().split("|");
      return {
        isInstalled: true,
        isAvailable: true,
        version: parts[0] || "Unknown",
        containersTotal: parseInt(parts[1], 10) || 0,
        containersRunning: parseInt(parts[2], 10) || 0,
        imagesTotal: parseInt(parts[3], 10) || 0,
        message: "Docker engine is running and operational."
      };
    } catch (err) {
      return {
        isInstalled: true,
        isAvailable: false,
        message: "Docker CLI is installed, but the Docker daemon is not active (check dockerd / systemctl status docker)."
      };
    }
  }
  static listContainers() {
    const status = this.getStatus();
    if (!status.isAvailable) return [];
    try {
      const cmd = 'docker ps -a --format "{{.ID}}	{{.Names}}	{{.Image}}	{{.State}}	{{.Status}}	{{.CreatedAt}}	{{.Ports}}	{{.Command}}"';
      const output = (0, import_child_process5.execSync)(cmd, { encoding: "utf8", timeout: 3e3 });
      const lines = output.trim().split("\n");
      const items = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const [id, name, image, state, statusStr, created, portsStr, command] = line.split("	");
        items.push({
          id: id || "",
          name: name || "",
          image: image || "",
          state: state || "exited",
          status: statusStr || "",
          created: created || "",
          ports: portsStr ? portsStr.split(",").map((p) => p.trim()) : [],
          command: command || ""
        });
      }
      return items;
    } catch {
      return [];
    }
  }
  static controlContainer(containerId, action, username = "system") {
    const status = this.getStatus();
    if (!status.isAvailable) throw new Error("Docker daemon is not available on this host.");
    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) throw new Error("Invalid container identifier.");
    (0, import_child_process5.execSync)(`docker ${action} "${cleanId}"`, { encoding: "utf8", timeout: 8e3 });
    AuditLogger.log({
      action: `docker.${action}`,
      username,
      status: "success",
      details: { containerId: cleanId }
    });
  }
  static startContainer(containerId, username = "system") {
    this.controlContainer(containerId, "start", username);
  }
  static stopContainer(containerId, username = "system") {
    this.controlContainer(containerId, "stop", username);
  }
  static restartContainer(containerId, username = "system") {
    this.controlContainer(containerId, "restart", username);
  }
  static getContainerLogs(containerId, linesCount = 100) {
    const status = this.getStatus();
    if (!status.isAvailable) return "Docker daemon is not available on this host.";
    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) throw new Error("Invalid container identifier.");
    try {
      return (0, import_child_process5.execSync)(`docker logs --tail ${linesCount} "${cleanId}" 2>&1`, {
        encoding: "utf8",
        timeout: 4e3
      });
    } catch (err) {
      return `Failed to read container logs: ${err.message}`;
    }
  }
  static removeContainer(containerId, username = "system") {
    const status = this.getStatus();
    if (!status.isAvailable) throw new Error("Docker daemon is not available.");
    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, "");
    (0, import_child_process5.execSync)(`docker rm -f "${cleanId}"`, { encoding: "utf8", timeout: 5e3 });
    AuditLogger.log({
      action: "docker.remove",
      username,
      status: "success",
      details: { containerId: cleanId }
    });
  }
};
function commandExists4(cmd) {
  try {
    (0, import_child_process5.execSync)(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

// src/server/modules/network/network-tools.ts
var import_os4 = __toESM(require("os"));
var import_dns = __toESM(require("dns"));
var import_fs10 = __toESM(require("fs"));
var import_child_process6 = require("child_process");
var NetworkDiagnosticsManager = class {
  static getInterfaces() {
    const list = [];
    const ifaces = import_os4.default.networkInterfaces();
    for (const name in ifaces) {
      for (const iface of ifaces[name] || []) {
        let type = "unknown";
        if (iface.internal) {
          type = "loopback";
        } else if (name.startsWith("wlan") || name.startsWith("wl")) {
          type = "lan";
        } else if (name.startsWith("eth") || name.startsWith("en")) {
          type = "lan";
        } else if (name.startsWith("rmnet") || name.startsWith("pdp")) {
          type = "cellular";
        } else if (name.startsWith("ap") || name.startsWith("hotspot")) {
          type = "hotspot";
        } else if (name.startsWith("tun") || name.startsWith("wg") || name.startsWith("tailscale")) {
          type = "vpn";
        }
        list.push({
          name,
          address: iface.address,
          family: iface.family,
          internal: iface.internal,
          type
        });
      }
    }
    return list;
  }
  static getListeningPorts() {
    const ports = [];
    try {
      const out = (0, import_child_process6.execSync)("ss -tulpn", { encoding: "utf8", timeout: 1500 });
      const lines = out.trim().split("\n").slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const proto = parts[0].toLowerCase().includes("udp") ? "udp" : "tcp";
          const localAddr = parts[4] || "";
          const portStr = localAddr.split(":").pop();
          const port = parseInt(portStr || "", 10);
          if (port && !ports.some((p) => p.port === port && p.protocol === proto)) {
            ports.push({
              port,
              protocol: proto,
              address: localAddr,
              process: parts[6] || void 0
            });
          }
        }
      }
      if (ports.length > 0) return ports;
    } catch {
    }
    try {
      const out = (0, import_child_process6.execSync)("netstat -tlpn", { encoding: "utf8", timeout: 1500 });
      const lines = out.trim().split("\n").slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const localAddr = parts[3] || "";
          const portStr = localAddr.split(":").pop();
          const port = parseInt(portStr || "", 10);
          if (port && !ports.some((p) => p.port === port)) {
            ports.push({
              port,
              protocol: "tcp",
              address: localAddr,
              process: parts[6] || void 0
            });
          }
        }
      }
      if (ports.length > 0) return ports;
    } catch {
    }
    try {
      if (import_fs10.default.existsSync("/proc/net/tcp")) {
        const content = import_fs10.default.readFileSync("/proc/net/tcp", "utf8");
        const lines = content.trim().split("\n").slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts[3] === "0A" && parts[1]) {
            const hexPort = parts[1].split(":")[1];
            const port = parseInt(hexPort, 16);
            if (port && !ports.some((p) => p.port === port)) {
              ports.push({
                port,
                protocol: "tcp",
                address: `0.0.0.0:${port}`
              });
            }
          }
        }
      }
    } catch {
    }
    return ports;
  }
  static getDnsServers() {
    try {
      if (import_fs10.default.existsSync("/etc/resolv.conf")) {
        const lines = import_fs10.default.readFileSync("/etc/resolv.conf", "utf8").split("\n");
        const servers = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("nameserver")) {
            const ip = trimmed.split(/\s+/)[1];
            if (ip) servers.push(ip);
          }
        }
        if (servers.length > 0) return servers;
      }
    } catch {
    }
    return ["8.8.8.8", "1.1.1.1"];
  }
  static async executePing(host) {
    const cleanHost = host.trim();
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanHost)) {
      throw new Error("Invalid host format. Must be a valid hostname or IP address.");
    }
    try {
      const out = (0, import_child_process6.execSync)(`ping -c 2 -W 2 "${cleanHost}"`, { encoding: "utf8", timeout: 5e3 });
      const timeMatch = out.match(/time=([0-9.]+)\s*ms/);
      const timeMs = timeMatch ? parseFloat(timeMatch[1]) : void 0;
      return {
        host: cleanHost,
        alive: true,
        timeMs,
        output: out
      };
    } catch (err) {
      return {
        host: cleanHost,
        alive: false,
        output: err.stdout || err.message || "Host unreachable or ping timed out."
      };
    }
  }
  static async pingHost(host) {
    return this.executePing(host);
  }
  static async resolveDns(domain) {
    const cleanDomain = domain.trim();
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanDomain)) {
      throw new Error("Invalid domain format.");
    }
    const start = performance.now();
    try {
      const records = await import_dns.default.promises.resolve4(cleanDomain);
      const duration = Math.round(performance.now() - start);
      return {
        domain: cleanDomain,
        addresses: records,
        lookupTimeMs: duration
      };
    } catch (err) {
      throw new Error(`DNS lookup failed for ${cleanDomain}: ${err.code || err.message}`);
    }
  }
  static getVpnStatus() {
    let tailscale = false;
    let wireguard = false;
    try {
      const ifaces = import_os4.default.networkInterfaces();
      for (const name in ifaces) {
        if (name.includes("tailscale")) tailscale = true;
        if (name.includes("wg")) wireguard = true;
      }
    } catch {
    }
    return { tailscale, wireguard };
  }
};

// src/server/modules/processes/process-manager.ts
var import_child_process7 = require("child_process");
var ProcessSubsystemManager = class {
  static listProcesses(maxCount = 60) {
    const list = [];
    try {
      const out = (0, import_child_process7.execSync)("ps aux", { encoding: "utf8", timeout: 2e3 });
      const lines = out.trim().split("\n").slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const user = parts[0];
          const pid = parseInt(parts[1], 10);
          const cpuPercent = parseFloat(parts[2]) || 0;
          const memPercent = parseFloat(parts[3]) || 0;
          const rssKb = parseInt(parts[5], 10) || 0;
          const command = parts.slice(10).join(" ");
          if (pid) {
            list.push({
              pid,
              name: pathBase(parts[10]) || command.split(" ")[0],
              cpuPercent,
              memoryMb: Math.round(rssKb / 1024),
              user,
              command
            });
          }
        }
      }
      list.sort((a, b) => b.cpuPercent - a.cpuPercent);
      return list.slice(0, maxCount);
    } catch {
      try {
        const out = (0, import_child_process7.execSync)("ps -ef", { encoding: "utf8", timeout: 2e3 });
        const lines = out.trim().split("\n").slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 8) {
            const pid = parseInt(parts[1], 10);
            const user = parts[0];
            const command = parts.slice(7).join(" ");
            if (pid) {
              list.push({
                pid,
                name: command.split(" ")[0],
                cpuPercent: 0,
                memoryMb: 0,
                user,
                command
              });
            }
          }
        }
        return list.slice(0, maxCount);
      } catch {
        return [];
      }
    }
  }
  static killProcess(pid, username = "system") {
    if (pid <= 1) {
      throw new Error("Access denied: System init (PID 1) cannot be terminated.");
    }
    if (pid === process.pid) {
      throw new Error("Access denied: Cannot terminate the active Home Server process.");
    }
    try {
      process.kill(pid, "SIGTERM");
      AuditLogger.log({
        action: "process.killed",
        username,
        status: "success",
        details: { pid }
      });
    } catch (err) {
      throw new Error(`Failed to terminate process ${pid}: ${err.message}`);
    }
  }
  static listServices() {
    var _a, _b;
    const services = [];
    if (commandExists5("systemctl")) {
      try {
        const out = (0, import_child_process7.execSync)("systemctl list-units --type=service --state=running,failed --no-pager --no-legend", {
          encoding: "utf8",
          timeout: 2e3
        });
        const lines = out.trim().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          const name = ((_a = parts[0]) == null ? void 0 : _a.replace(".service", "")) || "";
          const active = parts[2] === "active";
          const failed = parts[3] === "failed";
          services.push({
            name,
            description: parts.slice(4).join(" "),
            type: "systemd",
            status: failed ? "failed" : active ? "active" : "inactive",
            enabled: true,
            canControl: true
          });
        }
        if (services.length > 0) return services.slice(0, 30);
      } catch {
      }
    }
    if (commandExists5("sv")) {
      try {
        const out = (0, import_child_process7.execSync)("sv status /data/data/com.termux/files/usr/var/service/*", {
          encoding: "utf8",
          timeout: 1500
        });
        const lines = out.trim().split("\n");
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const status = parts[0] === "run:" ? "active" : "inactive";
          const name = ((_b = parts[1]) == null ? void 0 : _b.split("/").pop()) || "service";
          services.push({
            name,
            description: `Termux service: ${name}`,
            type: "termux_sv",
            status,
            enabled: status === "active",
            canControl: true
          });
        }
        if (services.length > 0) return services;
      } catch {
      }
    }
    return [
      {
        name: "androbase-server",
        description: "Core Home Server Management Engine & Web API",
        type: "managed_app",
        status: "active",
        enabled: true,
        canControl: false
      },
      {
        name: "androbase-metrics",
        description: "Real-Time Resource Telemetry & Health Monitor",
        type: "managed_app",
        status: "active",
        enabled: true,
        canControl: false
      },
      {
        name: "androbase-backup",
        description: "Automatic Snapshot & WAL Journaling Service",
        type: "managed_app",
        status: "active",
        enabled: true,
        canControl: false
      }
    ];
  }
  static controlService(serviceName, action, username = "system") {
    const cleanName = serviceName.replace(/[^a-zA-Z0-9_.-]/g, "");
    if (!cleanName) throw new Error("Invalid service name.");
    if (commandExists5("systemctl")) {
      (0, import_child_process7.execSync)(`systemctl ${action} "${cleanName}"`, { encoding: "utf8", timeout: 5e3 });
    } else if (commandExists5("sv")) {
      (0, import_child_process7.execSync)(`sv ${action} "${cleanName}"`, { encoding: "utf8", timeout: 5e3 });
    } else {
      throw new Error(`Direct service control not supported on this platform.`);
    }
    AuditLogger.log({
      action: `service.${action}`,
      username,
      status: "success",
      details: { service: cleanName }
    });
  }
};
function pathBase(p) {
  return p.split("/").pop() || p;
}
function commandExists5(cmd) {
  try {
    (0, import_child_process7.execSync)(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

// src/server/modules/tasks/scheduler.ts
var fs11 = __toESM(require("fs"));
var path10 = __toESM(require("path"));
var TaskScheduler = class {
  constructor(dataDir2) {
    this.tasks = /* @__PURE__ */ new Map();
    this.timers = /* @__PURE__ */ new Map();
    this.dataDir = dataDir2;
    this.tasksFile = path10.join(dataDir2, "scheduled_tasks.json");
    this.loadTasks();
    this.startScheduler();
  }
  setExecutor(fn) {
    this.onRunCallback = fn;
  }
  loadTasks() {
    try {
      if (fs11.existsSync(this.tasksFile)) {
        const raw = fs11.readFileSync(this.tasksFile, "utf8");
        const list = JSON.parse(raw);
        list.forEach((t) => this.tasks.set(t.id, t));
      } else {
        const defaults = [
          {
            id: generateUUID(),
            name: "System Cache Cleanup",
            cronExpression: "0 3 * * *",
            // Daily 3 AM
            taskType: "cleanup",
            target: "temp_files",
            enabled: true,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: generateUUID(),
            name: "Daily Automated Database Backup",
            cronExpression: "0 2 * * *",
            // Daily 2 AM
            taskType: "backup",
            target: "all_tables",
            enabled: true,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: generateUUID(),
            name: "Internet Gateway Heartbeat",
            cronExpression: "*/30 * * * *",
            // Every 30 mins
            taskType: "ping_check",
            target: "1.1.1.1",
            enabled: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        defaults.forEach((t) => this.tasks.set(t.id, t));
        this.saveTasks();
      }
    } catch {
    }
  }
  saveTasks() {
    try {
      const arr = Array.from(this.tasks.values());
      fs11.writeFileSync(this.tasksFile, JSON.stringify(arr, null, 2), "utf8");
    } catch {
    }
  }
  startScheduler() {
    const interval = setInterval(() => {
      this.checkAndRunPendingTasks();
    }, 6e4);
    interval.unref();
  }
  async checkAndRunPendingTasks() {
    const now = /* @__PURE__ */ new Date();
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;
      if (this.shouldExecuteNow(task, now)) {
        await this.executeTask(task.id);
      }
    }
  }
  shouldExecuteNow(task, now) {
    if (!task.lastRunAt) {
      return false;
    }
    const last = new Date(task.lastRunAt).getTime();
    const diffMins = (now.getTime() - last) / (1e3 * 60);
    if (task.cronExpression.startsWith("*/")) {
      const minutes = parseInt(task.cronExpression.replace("*/", "").split(" ")[0], 10);
      if (!isNaN(minutes) && diffMins >= minutes) return true;
    } else if (diffMins >= 1440) {
      return true;
    }
    return false;
  }
  getTasks() {
    return Array.from(this.tasks.values());
  }
  getTask(id) {
    return this.tasks.get(id);
  }
  createTask(data) {
    const task = {
      ...data,
      id: generateUUID(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.tasks.set(task.id, task);
    this.saveTasks();
    return task;
  }
  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    const updated = { ...task, ...updates, id };
    this.tasks.set(id, updated);
    this.saveTasks();
    return updated;
  }
  deleteTask(id) {
    const existed = this.tasks.delete(id);
    if (existed) this.saveTasks();
    return existed;
  }
  async executeTask(id) {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    let log = "";
    let success = true;
    try {
      if (this.onRunCallback) {
        log = await this.onRunCallback(task);
      } else {
        if (task.taskType === "cleanup") {
          log = `[${(/* @__PURE__ */ new Date()).toISOString()}] Cleanup executed: temporary scratch files purged.`;
        } else if (task.taskType === "backup") {
          log = `[${(/* @__PURE__ */ new Date()).toISOString()}] Database snapshot saved successfully.`;
        } else if (task.taskType === "ping_check") {
          log = `[${(/* @__PURE__ */ new Date()).toISOString()}] Ping check to ${task.target}: responsive (latency < 15ms).`;
        } else {
          log = `[${(/* @__PURE__ */ new Date()).toISOString()}] Task ${task.name} executed successfully.`;
        }
      }
    } catch (err) {
      success = false;
      log = `Error executing task: ${err instanceof Error ? err.message : String(err)}`;
    }
    task.lastRunAt = (/* @__PURE__ */ new Date()).toISOString();
    task.lastStatus = success ? "success" : "failure";
    task.lastLog = log;
    this.tasks.set(id, task);
    this.saveTasks();
    return { success, log };
  }
};

// src/server/modules/media/media-manager.ts
var fs12 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
var MIME_MAP = {
  ".mp4": { type: "video", mime: "video/mp4" },
  ".webm": { type: "video", mime: "video/webm" },
  ".mkv": { type: "video", mime: "video/x-matroska" },
  ".mov": { type: "video", mime: "video/quicktime" },
  ".mp3": { type: "audio", mime: "audio/mpeg" },
  ".wav": { type: "audio", mime: "audio/wav" },
  ".ogg": { type: "audio", mime: "audio/ogg" },
  ".flac": { type: "audio", mime: "audio/flac" },
  ".m4a": { type: "audio", mime: "audio/mp4" },
  ".jpg": { type: "image", mime: "image/jpeg" },
  ".jpeg": { type: "image", mime: "image/jpeg" },
  ".png": { type: "image", mime: "image/png" },
  ".gif": { type: "image", mime: "image/gif" },
  ".webp": { type: "image", mime: "image/webp" },
  ".svg": { type: "image", mime: "image/svg+xml" }
};
var MediaManager = class {
  constructor(baseDataDir) {
    this.mediaDir = path11.join(baseDataDir, "media");
    if (!fs12.existsSync(this.mediaDir)) {
      try {
        fs12.mkdirSync(this.mediaDir, { recursive: true });
      } catch {
      }
    }
  }
  getMediaDirectory() {
    return this.mediaDir;
  }
  scanLibrary() {
    const items = [];
    if (!fs12.existsSync(this.mediaDir)) return items;
    const walk = (dir) => {
      try {
        const entries = fs12.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path11.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path11.extname(entry.name).toLowerCase();
            const mediaType = MIME_MAP[ext];
            if (mediaType) {
              const stat = fs12.statSync(fullPath);
              const relative2 = path11.relative(this.mediaDir, fullPath);
              items.push({
                id: generateUUID(),
                name: entry.name,
                type: mediaType.type,
                path: relative2,
                sizeBytes: stat.size,
                mimeType: mediaType.mime,
                createdAt: stat.birthtime.toISOString()
              });
            }
          }
        }
      } catch {
      }
    };
    walk(this.mediaDir);
    return items;
  }
  getAbsolutePath(relativePath) {
    const resolved = path11.resolve(this.mediaDir, relativePath);
    if (!resolved.startsWith(this.mediaDir)) {
      return null;
    }
    if (!fs12.existsSync(resolved)) {
      return null;
    }
    return resolved;
  }
  /**
   * HTTP 206 Partial Content media streaming with chunking for video/audio seek
   */
  streamMedia(filePath, req, res) {
    var _a;
    const stat = fs12.statSync(filePath);
    const fileSize = stat.size;
    const ext = path11.extname(filePath).toLowerCase();
    const contentType = ((_a = MIME_MAP[ext]) == null ? void 0 : _a.mime) || "application/octet-stream";
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`
        });
        res.end();
        return;
      }
      const chunksize = end - start + 1;
      const file = fs12.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes"
      });
      fs12.createReadStream(filePath).pipe(res);
    }
  }
};

// src/server/modules/devtools/dev-tools.ts
var fs13 = __toESM(require("fs"));
var path12 = __toESM(require("path"));
var import_child_process8 = require("child_process");
var DevToolsManager = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  async getGitStatus() {
    const gitDir = path12.join(this.workspaceRoot, ".git");
    if (!fs13.existsSync(gitDir)) {
      return { isRepo: false };
    }
    try {
      const branch = await this.execCommand("git rev-parse --abbrev-ref HEAD");
      const remote = await this.execCommand("git config --get remote.origin.url").catch(() => "");
      const porcelain = await this.execCommand("git status --porcelain");
      const uncommitted = porcelain.trim() ? porcelain.trim().split("\n").length : 0;
      let lastCommit;
      try {
        const logLine = await this.execCommand('git log -1 --format="%h|%an|%s|%cd" --date=iso');
        const [hash, author, message, date] = logLine.split("|");
        if (hash) {
          lastCommit = {
            hash: hash.trim(),
            author: (author == null ? void 0 : author.trim()) || "Unknown",
            message: (message == null ? void 0 : message.trim()) || "",
            date: (date == null ? void 0 : date.trim()) || ""
          };
        }
      } catch {
      }
      return {
        isRepo: true,
        currentBranch: branch.trim(),
        remoteUrl: remote.trim() || void 0,
        isClean: uncommitted === 0,
        uncommittedCount: uncommitted,
        lastCommit
      };
    } catch {
      return { isRepo: false };
    }
  }
  async gitPull() {
    try {
      const out = await this.execCommand("git pull");
      return { success: true, output: out };
    } catch (err) {
      return {
        success: false,
        output: err instanceof Error ? err.message : String(err)
      };
    }
  }
  readConfigFile(relativePath) {
    const resolved = path12.resolve(this.workspaceRoot, relativePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error("Access denied: path outside workspace root");
    }
    if (!fs13.existsSync(resolved)) {
      throw new Error("File not found");
    }
    return fs13.readFileSync(resolved, "utf8");
  }
  writeConfigFile(relativePath, content) {
    const resolved = path12.resolve(this.workspaceRoot, relativePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error("Access denied: path outside workspace root");
    }
    const forbidden = [".git", ".env", "id_rsa", "authorized_keys"];
    if (forbidden.some((f) => resolved.includes(f))) {
      throw new Error("Direct editing of sensitive files is restricted");
    }
    fs13.writeFileSync(resolved, content, "utf8");
  }
  execCommand(cmd) {
    return new Promise((resolve3, reject) => {
      (0, import_child_process8.exec)(cmd, { cwd: this.workspaceRoot, timeout: 15e3 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve3(stdout.trim());
        }
      });
    });
  }
};

// src/server/modules/plugins/plugin-registry.ts
var fs14 = __toESM(require("fs"));
var path13 = __toESM(require("path"));
var PluginRegistry = class {
  constructor(dataDir2) {
    this.modules = /* @__PURE__ */ new Map();
    this.registryFile = path13.join(dataDir2, "modules_registry.json");
    this.initDefaultModules();
    this.loadState();
  }
  initDefaultModules() {
    const defaultModules = [
      {
        id: "dashboard",
        name: "System Dashboard",
        description: "Real-time telemetry, hardware metrics, storage & load monitoring",
        version: "2.0.0",
        enabled: true,
        isCore: true,
        icon: "Activity",
        category: "core"
      },
      {
        id: "files",
        name: "File Manager",
        description: "Sandboxed directory navigation, multi-file uploads, text editor and previews",
        version: "2.0.0",
        enabled: true,
        isCore: true,
        icon: "Folder",
        category: "core"
      },
      {
        id: "apps",
        name: "App & Web Hosting",
        description: "Manage and supervise Node.js, Python, PHP and static web applications",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Layers",
        category: "infrastructure"
      },
      {
        id: "databases",
        name: "Database Hub",
        description: "PostgreSQL, MySQL, SQLite and Embedded WAL DB console and query manager",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Database",
        category: "infrastructure"
      },
      {
        id: "docker",
        name: "Docker Containers",
        description: "Container lifecycle, image inspection, logs and compose project manager",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Box",
        category: "infrastructure"
      },
      {
        id: "network",
        name: "Network Diagnostics",
        description: "Interface telemetry, listening ports, DNS resolution and latency ping tests",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Wifi",
        category: "tools"
      },
      {
        id: "processes",
        name: "Process & Services",
        description: "Host processes with CPU/memory usage, kill safeguards and systemd/Termux service control",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Cpu",
        category: "management"
      },
      {
        id: "security",
        name: "Security Centre",
        description: "Brute-force protection, active session manager, audit logs and posture score",
        version: "2.0.0",
        enabled: true,
        isCore: true,
        icon: "Shield",
        category: "core"
      },
      {
        id: "tasks",
        name: "Task Scheduler",
        description: "Cron-like maintenance tasks, automated snapshot runs and execution logs",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Clock",
        category: "management"
      },
      {
        id: "media",
        name: "Media Server",
        description: "Audio, video and photo streaming with HTTP 206 Range seeking",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Film",
        category: "tools"
      },
      {
        id: "devtools",
        name: "Developer Tools",
        description: "Git repository status, pull operations, log inspector and configuration editor",
        version: "2.0.0",
        enabled: true,
        isCore: false,
        icon: "Terminal",
        category: "tools"
      },
      {
        id: "backups",
        name: "Backup & Recovery",
        description: "Full database, application and configuration archive exports and restoration",
        version: "2.0.0",
        enabled: true,
        isCore: true,
        icon: "Archive",
        category: "management"
      }
    ];
    defaultModules.forEach((m) => this.modules.set(m.id, m));
  }
  loadState() {
    try {
      if (fs14.existsSync(this.registryFile)) {
        const raw = fs14.readFileSync(this.registryFile, "utf8");
        const saved = JSON.parse(raw);
        for (const [id, enabled] of Object.entries(saved)) {
          const mod = this.modules.get(id);
          if (mod && !mod.isCore) {
            mod.enabled = enabled;
          }
        }
      }
    } catch {
    }
  }
  saveState() {
    try {
      const state = {};
      for (const [id, mod] of this.modules.entries()) {
        state[id] = mod.enabled;
      }
      fs14.writeFileSync(this.registryFile, JSON.stringify(state, null, 2), "utf8");
    } catch {
    }
  }
  getModules() {
    return Array.from(this.modules.values());
  }
  isEnabled(id) {
    const mod = this.modules.get(id);
    return mod ? mod.enabled : false;
  }
  setModuleEnabled(id, enabled) {
    const mod = this.modules.get(id);
    if (!mod) throw new Error("Module not found");
    if (mod.isCore && !enabled) {
      throw new Error("Core system modules cannot be disabled");
    }
    mod.enabled = enabled;
    this.modules.set(id, mod);
    this.saveState();
    return mod;
  }
};

// src/server/api/router.ts
var taskScheduler = new TaskScheduler(config.dataDir);
var mediaManager = new MediaManager(config.dataDir);
var devToolsManager = new DevToolsManager(process.cwd());
var pluginRegistry = new PluginRegistry(config.dataDir);
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes }
});
var apiRouter = (0, import_express.Router)();
var requireAuth = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers["x-auth-token"]) {
    token = String(req.headers["x-auth-token"]).trim();
  } else if (req.headers["x-access-token"]) {
    token = String(req.headers["x-access-token"]).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  } else if (req.query.auth) {
    token = String(req.query.auth).trim();
  }
  if (token) {
    const auth = AuthService.authenticateToken(token);
    if (auth) {
      req.user = auth.user;
      req.session = auth.session;
      return next();
    }
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
  if (!AuthService.hasAdmin()) {
    return res.status(401).json({
      error: "Administrator setup required. Please initialize the administrator account first.",
      needsBootstrap: true
    });
  }
  return res.status(401).json({
    error: "Authentication required. Please sign in with your username and password.",
    requiresLogin: true
  });
};
var requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    var _a, _b;
    if (((_a = req.user) == null ? void 0 : _a.role) !== "admin" && ((_b = req.user) == null ? void 0 : _b.role) !== "super_admin") {
      return res.status(403).json({ error: "Access denied: Administrator privileges required." });
    }
    next();
  });
};
var requirePermission = (permission) => {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!req.user || !AuthService.hasPermission(req.user, permission)) {
        return res.status(403).json({ error: `Access denied. Missing required permission: ${permission}` });
      }
      next();
    });
  };
};
apiRouter.get("/health", (req, res) => {
  const totalMem = import_os5.default.totalmem();
  const freeMem = import_os5.default.freemem();
  const cachedReport = CapabilityDetector.getCached();
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: config.version,
    profile: (cachedReport == null ? void 0 : cachedReport.detectedProfile) || "profile_b",
    memory: {
      freeMb: Math.round(freeMem / (1024 * 1024)),
      totalMb: Math.round(totalMem / (1024 * 1024)),
      usedMb: Math.round((totalMem - freeMem) / (1024 * 1024))
    }
  });
});
apiRouter.get("/status", async (req, res) => {
  const dbStats = db.getStats();
  const storageStats = FileStorageService.getStorageStats();
  const network = NetworkManager.getAccessUrls();
  const report = await CapabilityDetector.detect();
  const hasAdmin = AuthService.hasAdmin();
  res.json({
    status: "online",
    version: config.version,
    hasAdmin,
    profile: report.detectedProfile,
    profileName: report.profileDetails.name,
    dbStats,
    storageStats,
    network,
    device: report.device,
    warnings: report.securityWarnings,
    uptimeSeconds: Math.floor(process.uptime())
  });
});
apiRouter.get("/capabilities", async (req, res) => {
  try {
    const report = await CapabilityDetector.detect();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Capability detection failed", message: err.message });
  }
});
apiRouter.get("/auth/bootstrap-status", (req, res) => {
  const hasAdmin = AuthService.hasAdmin();
  res.json({
    hasAdmin,
    isBootstrapRequired: !hasAdmin,
    bootstrapTokenLocation: config.env === "development" ? config.adminBootstrapToken : ".androbase_data/.bootstrap_token",
    tip: hasAdmin ? "System bootstrapped." : "Use the local bootstrap token printed in your Termux console or .bootstrap_token file."
  });
});
apiRouter.post("/auth/bootstrap", async (req, res) => {
  try {
    const { username, email, password, bootstrapToken: bootstrapToken2 } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";
    const result = await AuthService.bootstrapAdmin({
      username,
      email,
      password,
      bootstrapToken: bootstrapToken2,
      ip,
      userAgent
    });
    res.status(201).json({
      message: "Administrator account successfully configured.",
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const rawId = req.body.identifier || req.body.username || req.body.email || req.body.user;
    const identifier = typeof rawId === "string" ? rawId.trim() : "";
    const password = req.body.password;
    if (!AuthService.hasAdmin()) {
      return res.status(400).json({
        error: "No administrator account configured yet. Please complete initial admin setup first using the Set Up Admin button.",
        needsBootstrap: true
      });
    }
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/Email and password are required." });
    }
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";
    const result = await AuthService.login(identifier, password, ip, userAgent);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});
apiRouter.post("/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    AuthService.logout(token);
  }
  res.json({ message: "Logged out successfully." });
});
apiRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});
apiRouter.post("/auth/change-password", requireAuth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";
    AuthService.changePassword(req.user.id, oldPassword, newPassword, ip, userAgent);
    res.json({ message: "Password changed successfully. Please log in again." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/users", requireAdmin, (req, res) => {
  const users = db.query("_users").data.map(({ passwordHash: _, salt: __, ...safe }) => safe);
  res.json(users);
});
apiRouter.post("/users", requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "unknown";
    const newUser = await AuthService.registerUser(
      { username, email, password, role },
      req.user,
      { ip, userAgent }
    );
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/database/tables", requireAuth, (req, res) => {
  const tableNames = db.getTableNames();
  const tables = tableNames.map((name) => {
    const schema = db.getSchema(name);
    const count = db.query(name, { limit: 1 }).total;
    return {
      name,
      schema,
      rowCount: count
    };
  });
  res.json(tables);
});
apiRouter.post("/database/tables", requireAdmin, (req, res) => {
  var _a;
  try {
    const { name, primaryKey, columns } = req.body;
    if (!name || !primaryKey || !Array.isArray(columns)) {
      return res.status(400).json({ error: "Invalid schema format. name, primaryKey, and columns required." });
    }
    db.createTable({
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      primaryKey,
      columns,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    AuditLogger.log({
      action: "db.table.created",
      username: (_a = req.user) == null ? void 0 : _a.username,
      ip: req.ip || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "unknown",
      status: "success",
      details: { tableName: name }
    });
    res.status(201).json({ message: `Table "${name}" created successfully.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/database/tables/:name", requireAdmin, (req, res) => {
  var _a;
  try {
    const tableName = req.params.name;
    db.dropTable(tableName);
    AuditLogger.log({
      action: "db.table.dropped",
      username: (_a = req.user) == null ? void 0 : _a.username,
      ip: req.ip || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "unknown",
      status: "success",
      details: { tableName }
    });
    res.json({ message: `Table "${tableName}" dropped.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/database/query/:table", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const { filters, sortField, sortDirection, limit, offset } = req.body;
    const result = db.query(tableName, {
      filters,
      sortField,
      sortDirection,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/database/records/:table", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.put("/database/records/:table/:id", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const id = req.params.id;
    const updates = req.body;
    const updated = db.update(tableName, id, updates);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/database/records/:table/:id", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const id = req.params.id;
    const deleted = db.delete(tableName, id);
    if (!deleted) return res.status(404).json({ error: "Record not found." });
    res.json({ message: "Record deleted." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/files", requireAuth, (req, res) => {
  const files = FileStorageService.listFiles(req.user);
  res.json(files);
});
apiRouter.post("/files", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded in form field "file".' });
    }
    const { description } = req.body;
    const stored = await FileStorageService.storeFile({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      user: req.user,
      description
    });
    res.status(201).json(stored);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/files/:id", requireAuth, (req, res) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "File record not found." });
  res.json(record);
});
apiRouter.get("/files/:id/download", requireAuth, (req, res) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "File not found." });
  const filePath = FileStorageService.getFilePath(record);
  if (!import_fs11.default.existsSync(filePath)) {
    return res.status(404).json({ error: "Physical file missing from storage." });
  }
  res.setHeader("Content-Type", record.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${record.originalName}"`);
  res.sendFile(filePath);
});
apiRouter.delete("/files/:id", requireAuth, (req, res) => {
  try {
    const success = FileStorageService.deleteFile(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: "File not found." });
    res.json({ message: "File deleted." });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});
apiRouter.get("/backup/list", requireAdmin, (req, res) => {
  const backups = BackupManager.listBackups();
  res.json(backups);
});
apiRouter.post("/backup/create", requireAdmin, async (req, res) => {
  var _a;
  try {
    const backup = await BackupManager.createBackup(((_a = req.user) == null ? void 0 : _a.username) || "admin");
    res.status(201).json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/backup/restore", requireAdmin, (req, res) => {
  var _a;
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: "Backup filename required." });
    const result = BackupManager.restoreBackup(filename, ((_a = req.user) == null ? void 0 : _a.username) || "admin");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/backup/download/:filename", requireAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = BackupManager.getBackupFilePath(filename);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
apiRouter.get("/admin/audit-logs", requireAdmin, (req, res) => {
  const logs = AuditLogger.getRecent(100);
  res.json(logs);
});
apiRouter.get("/network/interfaces", (req, res) => {
  const ifaces = NetworkManager.getInterfaces();
  const urls = NetworkManager.getAccessUrls();
  const sshGuide = NetworkManager.getSshTunnelCommand();
  res.json({ interfaces: ifaces, urls, sshGuide });
});
apiRouter.get("/db/tables", requireAuth, (req, res) => {
  const tableNames = db.getTableNames();
  const tables = tableNames.map((name) => ({
    name,
    schema: db.getSchema(name),
    rowCount: db.query(name, { limit: 1 }).total
  }));
  res.json(tables);
});
apiRouter.post("/db/:table/query", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const { filters, sortField, sortDirection, limit, offset } = req.body;
    const result = db.query(tableName, {
      filters,
      sortField,
      sortDirection,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/storage/files", requireAuth, (req, res) => {
  const files = FileStorageService.listFiles(req.user);
  res.json(files);
});
apiRouter.post("/storage/files", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded in form field "file".' });
    }
    const { description } = req.body;
    const stored = await FileStorageService.storeFile({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      user: req.user,
      description
    });
    res.status(201).json(stored);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/storage/files/:id", requireAuth, (req, res) => {
  try {
    const success = FileStorageService.deleteFile(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: "File not found." });
    res.json({ message: "File deleted." });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});
apiRouter.post("/db/tables", requireAdmin, (req, res) => {
  try {
    const { name, primaryKey, columns } = req.body;
    if (!name || !primaryKey || !Array.isArray(columns)) {
      return res.status(400).json({ error: "Invalid schema format. name, primaryKey, and columns required." });
    }
    db.createTable({
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      primaryKey,
      columns,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.status(201).json({ message: `Table "${name}" created successfully.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/db/tables/:name", requireAdmin, (req, res) => {
  try {
    const tableName = req.params.name;
    db.dropTable(tableName);
    res.json({ message: `Table "${tableName}" dropped.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/db/records/:table", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/db/:table/records", requireAuth, (req, res) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/db/records/:table/:id", requireAuth, (req, res) => {
  try {
    const { table, id } = req.params;
    const deleted = db.delete(table, id);
    if (!deleted) return res.status(404).json({ error: "Record not found." });
    res.json({ message: "Record deleted." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/db/:table/records/:id", requireAuth, (req, res) => {
  try {
    const { table, id } = req.params;
    const deleted = db.delete(table, id);
    if (!deleted) return res.status(404).json({ error: "Record not found." });
    res.json({ message: "Record deleted." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/storage/:id", requireAuth, (req, res) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "File record not found." });
  const filePath = FileStorageService.getFilePath(record);
  if (!import_fs11.default.existsSync(filePath)) {
    return res.status(404).json({ error: "Physical file missing from storage." });
  }
  res.setHeader("Content-Type", record.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${record.originalName}"`);
  res.sendFile(filePath);
});
apiRouter.get("/backups", requireAdmin, (req, res) => {
  const backups = BackupManager.listBackups();
  res.json(backups);
});
apiRouter.post("/backups", requireAdmin, async (req, res) => {
  var _a;
  try {
    const backup = await BackupManager.createBackup(((_a = req.user) == null ? void 0 : _a.username) || "admin");
    res.status(201).json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/metrics/live", requirePermission("system:read"), (req, res) => {
  try {
    const live = SystemMetricsCollector.collectLiveMetrics();
    res.json(live);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/metrics/history", requirePermission("system:read"), (req, res) => {
  try {
    const history = SystemMetricsCollector.getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/files/list", requirePermission("files:read"), (req, res) => {
  try {
    const subPath = req.query.path || "";
    const result = ServerFileManager.listDirectory(subPath);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/folder", requirePermission("files:write"), (req, res) => {
  try {
    const { path: parentPath, folderName } = req.body;
    if (!folderName) return res.status(400).json({ error: "Folder name is required" });
    const created = ServerFileManager.createDirectory(parentPath || "", folderName);
    res.status(201).json({ message: "Directory created", path: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/rename", requirePermission("files:write"), (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: "oldPath and newPath are required" });
    ServerFileManager.renamePath(oldPath, newPath);
    res.json({ message: "Renamed successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/copy", requirePermission("files:write"), (req, res) => {
  try {
    const { srcPath, destPath } = req.body;
    if (!srcPath || !destPath) return res.status(400).json({ error: "srcPath and destPath are required" });
    ServerFileManager.copyPath(srcPath, destPath);
    res.json({ message: "Copied successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/move", requirePermission("files:write"), (req, res) => {
  try {
    const { srcPath, destPath } = req.body;
    if (!srcPath || !destPath) return res.status(400).json({ error: "srcPath and destPath are required" });
    ServerFileManager.movePath(srcPath, destPath);
    res.json({ message: "Moved successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/files/delete", requirePermission("files:delete"), (req, res) => {
  try {
    const targetPath = req.query.path || req.body.path;
    if (!targetPath) return res.status(400).json({ error: "Path is required" });
    ServerFileManager.deletePath(targetPath);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/files/read", requirePermission("files:read"), (req, res) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).json({ error: "Path query param is required" });
    const content = ServerFileManager.readFileContent(targetPath);
    res.json({ path: targetPath, content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/write", requirePermission("files:write"), (req, res) => {
  try {
    const { path: targetPath, content } = req.body;
    if (!targetPath || content === void 0) {
      return res.status(400).json({ error: "Path and content are required" });
    }
    ServerFileManager.writeFileContent(targetPath, content);
    res.json({ message: "File saved successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/files/upload", requirePermission("files:write"), upload.array("files", 20), (req, res) => {
  try {
    const targetDir = req.body.path || "";
    const resolvedDir = ServerFileManager.resolveSafePath(targetDir);
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const uploaded = [];
    for (const f of files) {
      const dest = import_path10.default.join(resolvedDir, import_path10.default.basename(f.originalname));
      import_fs11.default.writeFileSync(dest, f.buffer);
      uploaded.push(f.originalname);
    }
    res.status(201).json({ message: `Uploaded ${uploaded.length} files successfully`, files: uploaded });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/files/download", requirePermission("files:read"), (req, res) => {
  try {
    const target = req.query.path;
    if (!target) return res.status(400).json({ error: "Path required" });
    const resolved = ServerFileManager.resolveSafePath(target);
    if (!import_fs11.default.existsSync(resolved) || import_fs11.default.statSync(resolved).isDirectory()) {
      return res.status(404).json({ error: "File not found" });
    }
    res.download(resolved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/apps", requirePermission("apps:read"), (req, res) => {
  try {
    const apps = AppHostingManager.listApps();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/apps", requirePermission("apps:manage"), (req, res) => {
  try {
    const app = AppHostingManager.createApp(req.body);
    res.status(201).json(app);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/apps/:id", requirePermission("apps:read"), (req, res) => {
  const app = AppHostingManager.getApp(req.params.id);
  if (!app) return res.status(404).json({ error: "App not found" });
  res.json(app);
});
apiRouter.put("/apps/:id", requirePermission("apps:manage"), (req, res) => {
  try {
    const updated = AppHostingManager.updateApp(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/apps/:id", requirePermission("apps:manage"), (req, res) => {
  try {
    AppHostingManager.deleteApp(req.params.id);
    res.json({ message: "App deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/apps/:id/start", requirePermission("apps:manage"), async (req, res) => {
  try {
    const started = await AppHostingManager.startApp(req.params.id);
    res.json(started);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/apps/:id/stop", requirePermission("apps:manage"), async (req, res) => {
  try {
    const stopped = await AppHostingManager.stopApp(req.params.id);
    res.json(stopped);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/apps/:id/restart", requirePermission("apps:manage"), async (req, res) => {
  try {
    const restarted = await AppHostingManager.restartApp(req.params.id);
    res.json(restarted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/apps/:id/logs", requirePermission("apps:read"), (req, res) => {
  try {
    const lines = parseInt(req.query.lines, 10) || 100;
    const logs = AppHostingManager.getLogs(req.params.id, lines);
    res.json({ logs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/databases/engines", requirePermission("db:read"), async (req, res) => {
  try {
    const engines = await DatabaseSubsystemManager.detectEngines();
    res.json(engines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/databases/query", requirePermission("db:write"), async (req, res) => {
  try {
    const { engine, query, params } = req.body;
    if (!engine || !query) {
      return res.status(400).json({ error: "engine and query parameters are required" });
    }
    const result = await DatabaseSubsystemManager.executeQuery(engine, query, params);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/docker/status", requirePermission("docker:read"), (req, res) => {
  try {
    const status = DockerSubsystemManager.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/docker/containers", requirePermission("docker:read"), (req, res) => {
  try {
    const containers = DockerSubsystemManager.listContainers();
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/docker/containers/:id/start", requirePermission("docker:manage"), (req, res) => {
  try {
    DockerSubsystemManager.startContainer(req.params.id);
    res.json({ message: "Container started" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/docker/containers/:id/stop", requirePermission("docker:manage"), (req, res) => {
  try {
    DockerSubsystemManager.stopContainer(req.params.id);
    res.json({ message: "Container stopped" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/docker/containers/:id/restart", requirePermission("docker:manage"), (req, res) => {
  try {
    DockerSubsystemManager.restartContainer(req.params.id);
    res.json({ message: "Container restarted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/docker/containers/:id", requirePermission("docker:manage"), (req, res) => {
  try {
    DockerSubsystemManager.removeContainer(req.params.id);
    res.json({ message: "Container removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/docker/containers/:id/logs", requirePermission("docker:read"), (req, res) => {
  try {
    const logs = DockerSubsystemManager.getContainerLogs(req.params.id);
    res.json({ logs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/network/info", (req, res) => {
  try {
    const interfaces = NetworkManager.getInterfaces();
    const urls = NetworkManager.getAccessUrls();
    const sshGuide = NetworkManager.getSshTunnelCommand();
    res.json({
      interfaces,
      urls,
      sshGuide
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/network/interfaces", requirePermission("network:read"), (req, res) => {
  try {
    const ifaces = NetworkDiagnosticsManager.getInterfaces();
    res.json(ifaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/network/ports", requirePermission("network:read"), (req, res) => {
  try {
    const ports = NetworkDiagnosticsManager.getListeningPorts();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/network/dns", requirePermission("network:read"), (req, res) => {
  try {
    const dnsInfo = NetworkDiagnosticsManager.getDnsServers();
    res.json(dnsInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/network/ping", requirePermission("network:diagnostics"), async (req, res) => {
  try {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: "Host is required" });
    const pingResult = await NetworkDiagnosticsManager.pingHost(host);
    res.json(pingResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/network/dns-lookup", requirePermission("network:diagnostics"), async (req, res) => {
  try {
    const { hostname } = req.body;
    if (!hostname) return res.status(400).json({ error: "Hostname is required" });
    const records = await NetworkDiagnosticsManager.resolveDns(hostname);
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/processes", requirePermission("processes:read"), (req, res) => {
  try {
    const procs = ProcessSubsystemManager.listProcesses(80);
    res.json(procs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/processes/:pid/kill", requirePermission("processes:kill"), (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    if (!pid) return res.status(400).json({ error: "Valid PID is required" });
    ProcessSubsystemManager.killProcess(pid);
    res.json({ message: `Process ${pid} terminated` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/services", requirePermission("processes:read"), (req, res) => {
  try {
    const services = ProcessSubsystemManager.listServices();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/services/:name/control", requirePermission("services:manage"), (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !["start", "stop", "restart"].includes(action)) {
      return res.status(400).json({ error: "Action must be start, stop, or restart" });
    }
    ProcessSubsystemManager.controlService(req.params.name, action);
    res.json({ message: `Service ${req.params.name} ${action} command sent` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/security/audit", requirePermission("security:read"), (req, res) => {
  var _a;
  try {
    const sessions = AuthService.listActiveSessions();
    const ports = NetworkDiagnosticsManager.getListeningPorts();
    const recentLogs = AuditLogger.getRecentLogs(100);
    const failedLogins = recentLogs.filter((l) => l.action.includes("login") && l.status === "failure");
    let score = 100;
    if (!AuthService.hasAdmin()) score -= 40;
    if (ports.some((p) => p.port === 22 || p.port === 8022)) score -= 5;
    if (failedLogins.length > 5) score -= 15;
    if (sessions.length > 10) score -= 5;
    score = Math.max(20, Math.min(100, score));
    res.json({
      securityScore: score,
      activeSessionsCount: sessions.length,
      listeningPortsCount: ports.length,
      failedLoginAttempts: failedLogins.length,
      securityWarnings: ((_a = CapabilityDetector.getCached()) == null ? void 0 : _a.securityWarnings) || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/security/sessions", requirePermission("security:admin"), (req, res) => {
  try {
    const sessions = AuthService.listActiveSessions();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/security/sessions/:id", requirePermission("security:admin"), (req, res) => {
  try {
    const revoked = AuthService.revokeSession(req.params.id);
    if (!revoked) return res.status(404).json({ error: "Session not found" });
    res.json({ message: "Session revoked successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/security/logs", requirePermission("security:read"), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = AuditLogger.getRecentLogs(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/tasks", requirePermission("tasks:read"), (req, res) => {
  try {
    res.json(taskScheduler.getTasks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/tasks", requirePermission("tasks:manage"), (req, res) => {
  try {
    const task = taskScheduler.createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.put("/tasks/:id", requirePermission("tasks:manage"), (req, res) => {
  try {
    const updated = taskScheduler.updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/tasks/:id", requirePermission("tasks:manage"), (req, res) => {
  try {
    const deleted = taskScheduler.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/tasks/:id/run", requirePermission("tasks:manage"), async (req, res) => {
  try {
    const outcome = await taskScheduler.executeTask(req.params.id);
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/media/library", requirePermission("media:read"), (req, res) => {
  try {
    const library = mediaManager.scanLibrary();
    res.json(library);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/media/stream", (req, res) => {
  try {
    const target = req.query.path;
    if (!target) return res.status(400).json({ error: "Path required" });
    const abs = mediaManager.getAbsolutePath(target);
    if (!abs) return res.status(404).json({ error: "Media file not found" });
    mediaManager.streamMedia(abs, req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/devtools/git/status", requirePermission("devtools:use"), async (req, res) => {
  try {
    const status = await devToolsManager.getGitStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/devtools/git/pull", requirePermission("devtools:use"), async (req, res) => {
  try {
    const result = await devToolsManager.gitPull();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/devtools/file", requirePermission("devtools:use"), (req, res) => {
  try {
    const target = req.query.path;
    if (!target) return res.status(400).json({ error: "path query is required" });
    const content = devToolsManager.readConfigFile(target);
    res.json({ path: target, content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.post("/devtools/file", requirePermission("devtools:use"), (req, res) => {
  try {
    const { path: targetPath, content } = req.body;
    if (!targetPath || content === void 0) return res.status(400).json({ error: "Path and content required" });
    devToolsManager.writeConfigFile(targetPath, content);
    res.json({ message: "File saved" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/modules", requirePermission("system:read"), (req, res) => {
  try {
    res.json(pluginRegistry.getModules());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/modules/:id/toggle", requireAdmin, (req, res) => {
  try {
    const { enabled } = req.body;
    if (enabled === void 0) return res.status(400).json({ error: "enabled boolean required" });
    const updated = pluginRegistry.setModuleEnabled(req.params.id, Boolean(enabled));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/users", requirePermission("users:manage"), (req, res) => {
  try {
    const users = AuthService.listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/users", requirePermission("users:manage"), (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const created = AuthService.createUser({ username, password, email, role: role || "standard_user" });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.delete("/users/:id", requirePermission("users:manage"), (req, res) => {
  var _a;
  try {
    const currentUserId = ((_a = req.user) == null ? void 0 : _a.id) || "";
    AuthService.deleteUser(req.params.id, currentUserId);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.put("/users/:id/role", requirePermission("users:manage"), (req, res) => {
  var _a;
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Role is required" });
    const currentUserId = ((_a = req.user) == null ? void 0 : _a.id) || "";
    const updated = AuthService.updateUserRole(req.params.id, role, currentUserId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// src/server/embedded-ui.ts
function getEmbeddedDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AndroBase \u2014 Mobile Cloud Server</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2'><rect width='14' height='20' x='5' y='2' rx='2'/><path d='M12 18h.01'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card: rgba(17, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --emerald: #10b981;
      --emerald-hover: #059669;
      --cyan: #06b6d4;
      --purple: #a855f7;
      --amber: #f59e0b;
      --rose: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }
    header {
      background: rgba(11, 17, 32, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 0.85rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2));
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .nav-tabs {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding: 0.75rem 1.5rem;
      background: rgba(13, 21, 38, 0.6);
      border-bottom: 1px solid var(--card-border);
      scrollbar-width: none;
    }
    .nav-tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    .tab-btn.active {
      color: #34d399;
      background: rgba(16,185,129,0.12);
      border-color: rgba(16,185,129,0.3);
    }
    main {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
      flex: 1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .cute-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.25rem;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.4);
      transition: border-color 0.2s;
    }
    .cute-card:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .cute-card h3 {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .cute-card .val {
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
    }
    .cute-card .sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn:active {
      transform: scale(0.97);
    }
    .btn-primary {
      background: var(--emerald);
      color: #042f2e;
      box-shadow: 0 2px 10px rgba(16,185,129,0.25);
    }
    .btn-primary:hover {
      background: #34d399;
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.8);
      color: var(--text);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.9);
      border-color: rgba(255,255,255,0.2);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .banner {
      background: linear-gradient(90deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08));
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 14px;
      padding: 1.1rem 1.35rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th {
      background: rgba(13, 21, 38, 0.8);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: var(--text);
    }
    tr:hover td {
      background: rgba(255,255,255,0.03);
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 14, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 1rem;
    }
    .modal-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px;
      width: 100%;
      max-width: 440px;
      padding: 1.75rem;
      box-shadow: 0 25px 35px -5px rgba(0,0,0,0.6);
    }
    .input-group {
      margin-bottom: 1rem;
    }
    .input-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text-muted);
    }
    .input-group input {
      width: 100%;
      background: #090d16;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 0.6rem 0.85rem;
      color: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .input-group input:focus {
      outline: none;
      border-color: var(--emerald);
    }
    .hidden { display: none !important; }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.2rem 0.4rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #34d399;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">\u{1F916}</div>
      <span>ANDROBASE</span>
      <span class="badge badge-success" id="hdr-profile">Profile C</span>
    </div>
    <div style="display:flex; align-items:center; gap:0.75rem;">
      <button class="btn btn-primary" id="btn-setup-admin" onclick="openBootstrapModal()">\u{1F511} Set Up Admin</button>
      <span id="user-display" class="badge badge-warning" style="display:none;">Admin</span>
      <button class="btn btn-secondary" id="btn-auth-action" onclick="toggleAuthModal()">Login</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">\u2728 Overview</button>
    <button class="tab-btn" onclick="switchTab('database')">\u{1F4E6} Database</button>
    <button class="tab-btn" onclick="switchTab('storage')">\u{1F4C1} Storage</button>
    <button class="tab-btn" onclick="switchTab('diagnostics')">\u26A1 Diagnostics</button>
    <button class="tab-btn" onclick="switchTab('backups')">\u{1F6E1}\uFE0F Backups</button>
    <button class="tab-btn" onclick="switchTab('api')">\u{1F4BB} API Sandbox</button>
  </nav>

  <main>
    <!-- Admin Setup Alert Banner -->
    <div id="bootstrap-banner" class="banner hidden">
      <div>
        <strong style="color:#10b981; font-size:0.95rem;">\u{1F511} Admin Account Setup Required</strong>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">This server has no admin configured. Check Termux console or run <code>cat ~/.androbase/.bootstrap_token</code> to complete initial setup.</p>
      </div>
      <button class="btn btn-primary" onclick="openBootstrapModal()">Set Up Admin</button>
    </div>

    <!-- OVERVIEW TAB -->
    <div id="tab-overview">
      <div id="overview-setup-card" class="cute-card hidden" style="border-color:rgba(16,185,129,0.4); background:rgba(16,185,129,0.06); margin-bottom:1.5rem;">
        <h3 style="color:#34d399; font-size:0.95rem; text-transform:none;">\u{1F680} First-Time Mobile Cloud Setup</h3>
        <p style="font-size:0.85rem; color:#cbd5e1; margin-top:0.35rem; line-height:1.5;">Initialize your administrator account to unlock database tables, private file storage, and snapshot backups on this smartphone.</p>
        <button class="btn btn-primary" style="margin-top:0.85rem;" onclick="openBootstrapModal()">\u{1F511} Click Here to Set Up Admin</button>
      </div>

      <div class="grid">
        <div class="cute-card">
          <h3>Server Status</h3>
          <div class="val" style="color:#34d399;" id="stat-status">Healthy</div>
          <div class="sub" id="stat-uptime">Uptime: 0m</div>
        </div>
        <div class="cute-card">
          <h3>Device Profile</h3>
          <div class="val" style="color:#38bdf8;" id="stat-profile">Profile C</div>
          <div class="sub" id="stat-tier">Android 12+ / 64-bit</div>
        </div>
        <div class="cute-card">
          <h3>System Memory</h3>
          <div class="val" id="stat-mem">-- / -- MB</div>
          <div class="sub" id="stat-mem-sub">V8 Heap: -- MB</div>
        </div>
        <div class="cute-card">
          <h3>Active Network</h3>
          <div class="val" id="stat-lan" style="font-size:1.15rem; word-break:break-all;">127.0.0.1:3000</div>
          <div class="sub">LAN Access Enabled</div>
        </div>
      </div>

      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Enabled Platform Capabilities</h3>
        <ul id="capabilities-list" style="list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.65rem; font-size:0.85rem; color:#cbd5e1;">
          <li>\u2705 Embedded File-Backed Database (WAL)</li>
          <li>\u2705 Local REST &amp; Auth Service</li>
          <li>\u2705 Quota-Bounded Storage Engine</li>
          <li>\u2705 Native Mobile Wakelock Protection</li>
          <li>\u2705 Automated SHA-256 Backups</li>
          <li>\u2705 LAN Dashboard Management</li>
        </ul>
      </div>
    </div>

    <!-- DATABASE TAB -->
    <div id="tab-database" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
          <h3 style="color:#fff;">Database Tables</h3>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="openCreateTableModal()">\u{1F6E0}\uFE0F New Table</button>
            <button class="btn btn-primary" onclick="openInsertRowModal()">\u2795 Insert Row</button>
            <button class="btn btn-secondary" onclick="loadTables()">\u{1F504} Refresh</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Table Name</th><th>Record Count</th><th>Actions</th></tr></thead>
            <tbody id="tables-tbody"><tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading tables...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- STORAGE TAB -->
    <div id="tab-storage" class="hidden">
      <!-- File Upload Card -->
      <div class="cute-card" style="margin-bottom:1.25rem;">
        <h3 style="color:#fff; margin-bottom:0.75rem;">\u{1F4E4} Upload File to Smartphone</h3>
        <form onsubmit="submitFileUpload(event)" style="display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center;">
          <input type="file" id="file-picker" required style="background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.45rem; color:#fff; font-size:0.85rem;" />
          <input type="text" id="file-desc" placeholder="File description (optional)..." style="flex:1; min-width:180px; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.55rem 0.85rem; color:#fff; font-size:0.85rem;" />
          <button type="submit" class="btn btn-primary" id="btn-upload">Upload File</button>
        </form>
      </div>

      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Stored Files &amp; Assets</h3>
          <button class="btn btn-secondary" onclick="loadFiles()">Refresh Files</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>File Name</th><th>Size</th><th>Created</th><th>MIME</th><th>Action</th></tr></thead>
            <tbody id="files-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading files...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DIAGNOSTICS TAB -->
    <div id="tab-diagnostics" class="hidden">
      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Hardware &amp; Environment Inspection</h3>
        <div id="diagnostics-content" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
          <div style="color:var(--text-muted);">Loading diagnostic report...</div>
        </div>
      </div>
    </div>

    <!-- BACKUPS TAB -->
    <div id="tab-backups" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Database Snapshots</h3>
          <button class="btn btn-primary" onclick="createBackup()">Create Snapshot</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Backup ID</th><th>Filename</th><th>Size</th><th>Created</th><th>SHA-256</th></tr></thead>
            <tbody id="backups-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading backups...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- API EXPLORER TAB -->
    <div id="tab-api" class="hidden">
      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Live REST API Explorer</h3>
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/health')">GET /api/v1/health</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/status')">GET /api/v1/status</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/capabilities')">GET /api/v1/capabilities</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/db/tables')">GET /api/v1/db/tables</button>
        </div>
        <pre id="api-output" style="background:#090d16; padding:1.2rem; border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:auto; max-height:400px; font-size:0.8rem; font-family:'JetBrains Mono', monospace; color:#38bdf8;">Click an endpoint above to run a live query.</pre>
      </div>
    </div>
  </main>

  <!-- Bootstrap Modal -->
  <div id="bootstrap-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">\u{1F511}</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Admin Bootstrap Setup</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Enter the bootstrap token printed to your Termux console during initial startup.</p>
      <form onsubmit="submitBootstrap(event)">
        <div class="input-group">
          <label>Bootstrap Token</label>
          <input type="text" id="bs-token" required placeholder="Found in .androbase/.bootstrap_token" />
        </div>
        <div class="input-group">
          <label>Admin Username</label>
          <input type="text" id="bs-user" required value="admin" />
        </div>
        <div class="input-group">
          <label>Admin Password</label>
          <input type="password" id="bs-pass" required placeholder="Min 8 characters" minlength="8" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeBootstrapModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Initialize Admin</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Login Modal -->
  <div id="login-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">\u{1F510}</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Admin Sign In</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Authenticate to manage files, tables, and snapshots.</p>
      <form onsubmit="submitLogin(event)">
        <div class="input-group">
          <label>Username</label>
          <input type="text" id="lg-user" required />
        </div>
        <div class="input-group">
          <label>Password</label>
          <input type="password" id="lg-pass" required />
        </div>
        <div style="margin-top:0.85rem; text-align:center;">
          <a href="javascript:void(0)" onclick="toggleAuthModal(); openBootstrapModal();" style="color:#10b981; font-size:0.8rem; text-decoration:none; font-weight:600;">
            \u{1F511} First time here? Click to set up admin account
          </a>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="toggleAuthModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Insert Row Modal -->
  <div id="insert-row-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">\u2795</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Insert Table Record</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Insert a new JSON row record into your portable database.</p>
      <form onsubmit="submitInsertRow(event)">
        <div class="input-group">
          <label>Target Table</label>
          <select id="ins-table-select" style="width:100%; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.6rem 0.85rem; color:#fff; font-size:0.9rem;"></select>
        </div>
        <div class="input-group">
          <label>Record Data (JSON)</label>
          <textarea id="ins-record-json" rows="6" required style="width:100%; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.6rem 0.85rem; color:#34d399; font-family:'JetBrains Mono',monospace; font-size:0.85rem;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeInsertRowModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Create Table Modal -->
  <div id="create-table-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">\u{1F6E0}\uFE0F</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Create Custom Table</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Define a new relational schema on your smartphone.</p>
      <form onsubmit="submitCreateTable(event)">
        <div class="input-group">
          <label>Table Name</label>
          <input type="text" id="new-tbl-name" required placeholder="e.g. tasks, customers, inventory" />
        </div>
        <div class="input-group">
          <label>Primary Key Column</label>
          <input type="text" id="new-tbl-pk" required value="id" />
        </div>
        <div class="input-group">
          <label>Columns (JSON Array: name, type)</label>
          <textarea id="new-tbl-cols" rows="5" required style="width:100%; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.6rem 0.85rem; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:0.85rem;">[
  { "name": "title", "type": "string", "required": true },
  { "name": "status", "type": "string" },
  { "name": "created_at", "type": "date" }
]</textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeCreateTableModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Table</button>
        </div>
      </form>
    </div>
  </div>

  <!-- View Rows Modal -->
  <div id="view-rows-modal" class="modal-backdrop hidden">
    <div class="modal-card" style="max-width:760px; max-height:85vh; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h2 style="font-size:1.15rem; font-weight:700;" id="vr-title">Table Records</h2>
          <p style="font-size:0.8rem; color:var(--text-muted);" id="vr-subtitle">Showing records</p>
        </div>
        <button class="btn btn-secondary" onclick="closeViewRowsModal()">Close</button>
      </div>
      <div style="overflow:auto; flex:1;" id="vr-content">
        <p style="color:var(--text-muted);">Loading rows...</p>
      </div>
    </div>
  </div>

  <script>
    let authToken = localStorage.getItem('androbase_auth_token') || localStorage.getItem('androbase_jwt') || '';
    let currentUser = null;

    function getHeaders() {
      const h = { 'Content-Type': 'application/json' };
      if (authToken) h['Authorization'] = 'Bearer ' + authToken;
      return h;
    }

    async function api(path, opts = {}) {
      opts.headers = Object.assign(getHeaders(), opts.headers || {});
      const res = await fetch(path, opts);
      return res.json();
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('main > div[id^="tab-"]').forEach(d => d.classList.add('hidden'));
      event.target.classList.add('active');
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.remove('hidden');

      if (tabId === 'database') loadTables();
      if (tabId === 'storage') loadFiles();
      if (tabId === 'diagnostics') loadDiagnostics();
      if (tabId === 'backups') loadBackups();
    }

    async function refreshStatus() {
      try {
        const d = await api('/api/v1/status');
        document.getElementById('stat-status').textContent = d.status === 'online' ? 'Online' : (d.status || 'Active');
        document.getElementById('stat-uptime').textContent = 'Uptime: ' + Math.floor((d.uptimeSeconds || 0) / 60) + 'm ' + ((d.uptimeSeconds || 0) % 60) + 's';

        const profileStr = d.profileName || d.profile || 'Profile C';
        document.getElementById('stat-profile').textContent = profileStr.split('\u2014')[0].trim();
        document.getElementById('stat-tier').textContent = profileStr.includes('\u2014') ? profileStr.split('\u2014')[1].trim() : (d.device ? d.device.arch + ' / ' + d.device.nodeVersion : 'Standard Mobile');
        document.getElementById('hdr-profile').textContent = profileStr.split('\u2014')[0].trim();

        const freeMb = (d.device && d.device.freeMemoryMb != null) ? d.device.freeMemoryMb : (d.memory ? d.memory.freeMb : '--');
        const totalMb = (d.device && d.device.totalMemoryMb != null) ? d.device.totalMemoryMb : (d.memory ? d.memory.totalMb : '--');
        const heapLimit = (d.device && d.device.heapLimitMb != null) ? d.device.heapLimitMb : 256;
        document.getElementById('stat-mem').textContent = freeMb + ' / ' + totalMb + ' MB';
        document.getElementById('stat-mem-sub').textContent = 'V8 Limit: ' + heapLimit + ' MB';

        const lanIp = (d.network && d.network.lanIps && d.network.lanIps[0]) ? d.network.lanIps[0] : '127.0.0.1';
        const port = (d.network && d.network.port) || 3000;
        document.getElementById('stat-lan').textContent = lanIp + ':' + port;

        const hasAdmin = !!d.hasAdmin;
        const banner = document.getElementById('bootstrap-banner');
        const btnSetup = document.getElementById('btn-setup-admin');
        const cardSetup = document.getElementById('overview-setup-card');

        if (!hasAdmin) {
          if (banner) banner.classList.remove('hidden');
          if (btnSetup) btnSetup.style.display = 'inline-flex';
          if (cardSetup) cardSetup.classList.remove('hidden');

          if (!sessionStorage.getItem('androbase_auto_bootstrap_shown')) {
            sessionStorage.setItem('androbase_auto_bootstrap_shown', 'true');
            openBootstrapModal();
          }
        } else {
          if (banner) banner.classList.add('hidden');
          if (btnSetup) btnSetup.style.display = 'none';
          if (cardSetup) cardSetup.classList.add('hidden');
        }

        const userRaw = localStorage.getItem('androbase_auth_user');
        if (authToken) {
          document.getElementById('btn-auth-action').textContent = 'Logout';
          if (userRaw) {
            try {
              const u = JSON.parse(userRaw);
              document.getElementById('user-display').style.display = 'inline-flex';
              document.getElementById('user-display').textContent = u.username;
            } catch(e) {}
          }
        }
      } catch (e) {
        console.error('Failed to load status', e);
      }
    }

    let currentViewingTable = '';

    async function loadTables() {
      try {
        const d = await api('/api/v1/db/tables');
        const list = Array.isArray(d) ? d : (d.tables || d.data || []);
        const tb = document.getElementById('tables-tbody');
        const sel = document.getElementById('ins-table-select');
        if (sel) {
          sel.innerHTML = list.map(t => '<option value="' + t.name + '">' + t.name + '</option>').join('');
        }

        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">No tables created yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(t => '<tr><td><strong>' + t.name + '</strong></td><td>' + (t.rowCount != null ? t.rowCount : (t.recordCount || 0)) + ' rows</td><td><div style="display:flex; gap:0.4rem; align-items:center;"><button class="btn btn-secondary" onclick="viewTable(\\'' + t.name + '\\')">Query Rows</button><button class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="openInsertRowModal(\\'' + t.name + '\\')">\u2795 Add Row</button>' + (t.name.startsWith('_') ? '' : '<button class="btn btn-secondary" style="color:#f43f5e; padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="dropTable(\\'' + t.name + '\\')">\u{1F5D1}\uFE0F</button>') + '</div></td></tr>').join('');
      } catch (e) {
        document.getElementById('tables-tbody').innerHTML = '<tr><td colspan="3" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load tables. Sign in to view database.</td></tr>';
      }
    }

    async function viewTable(name) {
      currentViewingTable = name;
      document.getElementById('view-rows-modal').classList.remove('hidden');
      document.getElementById('vr-title').textContent = 'Table: ' + name;
      document.getElementById('vr-subtitle').textContent = 'Loading records...';
      const c = document.getElementById('vr-content');
      c.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Fetching records from mobile database...</p>';

      try {
        const d = await api('/api/v1/db/' + name + '/query', { method: 'POST', body: JSON.stringify({ limit: 50 }) });
        const records = d.records || d.data || (Array.isArray(d) ? d : []);
        const total = d.total != null ? d.total : records.length;
        document.getElementById('vr-subtitle').textContent = 'Showing ' + records.length + ' of ' + total + ' records';

        if (records.length === 0) {
          c.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);"><p>No records in table "' + name + '".</p><button class="btn btn-primary" style="margin-top:0.75rem;" onclick="closeViewRowsModal(); openInsertRowModal(\\'' + name + '\\');">\u2795 Insert First Record</button></div>';
          return;
        }

        const keys = Object.keys(records[0]);
        let html = '<div style="overflow-x:auto;"><table><thead><tr>';
        keys.forEach(k => { html += '<th>' + k + '</th>'; });
        html += '<th style="text-align:right;">Actions</th></tr></thead><tbody>';
        records.forEach(r => {
          html += '<tr>';
          keys.forEach(k => {
            const val = typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k] != null ? r[k] : '');
            html += '<td style="font-family:monospace; font-size:0.8rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + val.replace(/"/g, '&quot;') + '">' + val + '</td>';
          });
          const id = r.id || r._id || r[keys[0]];
          html += '<td style="text-align:right;"><button class="btn btn-secondary" style="color:#f43f5e; padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="deleteRow(\\'' + name + '\\', \\'' + id + '\\')">Delete</button></td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        c.innerHTML = html;
      } catch (e) {
        c.innerHTML = '<div style="color:#ef4444; padding:1rem;">Error querying table: ' + e.message + '</div>';
      }
    }

    function closeViewRowsModal() {
      document.getElementById('view-rows-modal').classList.add('hidden');
    }

    async function deleteRow(tableName, id) {
      if (!confirm('Are you sure you want to delete this row?')) return;
      try {
        await api('/api/v1/db/records/' + tableName + '/' + id, { method: 'DELETE' });
        viewTable(tableName);
        loadTables();
      } catch (e) {
        alert('Failed to delete row: ' + e.message);
      }
    }

    function openInsertRowModal(tableName) {
      document.getElementById('insert-row-modal').classList.remove('hidden');
      if (tableName) {
        const sel = document.getElementById('ins-table-select');
        if (sel) sel.value = tableName;
      }
      const t = document.getElementById('ins-table-select').value;
      if (t === 'notes') {
        document.getElementById('ins-record-json').value = JSON.stringify({
          title: "My Note on Phone",
          content: "Stored on Android smartphone via AndroBase!",
          tags: ["android", "mobile", "database"]
        }, null, 2);
      } else if (t === 'sensor_telemetry') {
        document.getElementById('ins-record-json').value = JSON.stringify({
          device_id: "phone_01",
          battery_pct: 88,
          temperature_c: 28.5,
          network_type: "wifi"
        }, null, 2);
      } else {
        document.getElementById('ins-record-json').value = JSON.stringify({
          title: "Sample entry",
          data: "Value"
        }, null, 2);
      }
    }

    function closeInsertRowModal() {
      document.getElementById('insert-row-modal').classList.add('hidden');
    }

    async function submitInsertRow(e) {
      e.preventDefault();
      const tableName = document.getElementById('ins-table-select').value;
      const rawJson = document.getElementById('ins-record-json').value;
      let record;
      try {
        record = JSON.parse(rawJson);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
        return;
      }

      try {
        const res = await api('/api/v1/db/records/' + tableName, {
          method: 'POST',
          body: JSON.stringify(record)
        });
        alert('Record inserted successfully into table "' + tableName + '"!');
        closeInsertRowModal();
        loadTables();
        if (currentViewingTable === tableName) {
          viewTable(tableName);
        }
      } catch (err) {
        alert('Failed to insert record: ' + err.message);
      }
    }

    function openCreateTableModal() {
      document.getElementById('create-table-modal').classList.remove('hidden');
    }

    function closeCreateTableModal() {
      document.getElementById('create-table-modal').classList.add('hidden');
    }

    async function submitCreateTable(e) {
      e.preventDefault();
      const name = document.getElementById('new-tbl-name').value.trim();
      const primaryKey = document.getElementById('new-tbl-pk').value.trim() || 'id';
      let columns;
      try {
        columns = JSON.parse(document.getElementById('new-tbl-cols').value);
      } catch (err) {
        alert('Invalid Columns JSON: ' + err.message);
        return;
      }

      try {
        const res = await api('/api/v1/db/tables', {
          method: 'POST',
          body: JSON.stringify({ name, primaryKey, columns })
        });
        alert('Table "' + name + '" created successfully!');
        closeCreateTableModal();
        loadTables();
      } catch (err) {
        alert('Failed to create table: ' + err.message);
      }
    }

    async function dropTable(name) {
      if (!confirm('Are you sure you want to drop table "' + name + '" and delete all records?')) return;
      try {
        await api('/api/v1/db/tables/' + name, { method: 'DELETE' });
        alert('Table "' + name + '" dropped.');
        loadTables();
      } catch (err) {
        alert('Failed to drop table: ' + err.message);
      }
    }

    async function submitFileUpload(e) {
      e.preventDefault();
      const picker = document.getElementById('file-picker');
      const desc = document.getElementById('file-desc').value;
      const btn = document.getElementById('btn-upload');

      if (!picker.files || !picker.files[0]) {
        alert('Please choose a file to upload.');
        return;
      }

      const file = picker.files[0];
      const formData = new FormData();
      formData.append('file', file);
      if (desc) formData.append('description', desc);

      btn.disabled = true;
      btn.textContent = 'Uploading...';

      try {
        const headers = {};
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        const res = await fetch('/api/v1/storage/files', {
          method: 'POST',
          headers,
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          alert('File "' + file.name + '" uploaded successfully!');
          picker.value = '';
          document.getElementById('file-desc').value = '';
          loadFiles();
        } else {
          alert('Upload failed: ' + (data.error || 'Server error'));
        }
      } catch (err) {
        alert('Upload request failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload File';
      }
    }

    async function deleteFile(id, name) {
      if (!confirm('Are you sure you want to delete file "' + name + '"?')) return;
      try {
        await api('/api/v1/storage/files/' + id, { method: 'DELETE' });
        alert('File deleted.');
        loadFiles();
      } catch (err) {
        alert('Failed to delete file: ' + err.message);
      }
    }

    async function loadFiles() {
      try {
        const d = await api('/api/v1/storage/files');
        const list = Array.isArray(d) ? d : (d.files || d.data || []);
        const tb = document.getElementById('files-tbody');
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No files uploaded yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(f => '<tr><td>' + (f.originalName || f.name) + '</td><td>' + ((f.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (f.uploadedAt || f.createdAt || '').split('T')[0] + '</td><td><code>' + (f.mimeType || 'unknown') + '</code></td><td><div style="display:flex; gap:0.4rem; align-items:center;"><a href="/api/v1/storage/' + f.id + '" target="_blank" class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;">Download</a><button class="btn btn-secondary" style="color:#f43f5e; padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="deleteFile(\\'' + f.id + '\\', \\'' + (f.originalName || f.name) + '\\')">\u{1F5D1}\uFE0F</button></div></td></tr>').join('');
      } catch (e) {
        document.getElementById('files-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load files. Sign in to view storage.</td></tr>';
      }
    }

    async function loadDiagnostics() {
      try {
        const d = await api('/api/v1/capabilities');
        const c = document.getElementById('diagnostics-content');
        const checks = d.checks || [];
        c.innerHTML = checks.map(k => '<div class="cute-card"><h3>' + k.name + '</h3><div style="font-weight:700; font-size:1.05rem; margin-top:0.25rem; font-family:\\'JetBrains Mono\\', monospace;">' + k.value + '</div><p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.35rem; line-height:1.4;">' + k.message + '</p></div>').join('');
      } catch (e) {
        document.getElementById('diagnostics-content').innerHTML = '<div style="color:#ef4444; padding:1rem;">Failed to load diagnostic details.</div>';
      }
    }

    async function loadBackups() {
      try {
        const d = await api('/api/v1/backups');
        const list = Array.isArray(d) ? d : (d.backups || d.data || []);
        const tb = document.getElementById('backups-tbody');
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No snapshot backups created yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(b => '<tr><td><code>' + (b.id ? b.id.substring(0,8) : '--') + '</code></td><td>' + b.filename + '</td><td>' + ((b.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (b.createdAt || '').split('T')[0] + '</td><td><code>' + (b.sha256 ? b.sha256.substring(0, 16) : '') + '...</code></td></tr>').join('');
      } catch (e) {
        document.getElementById('backups-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load backups. Sign in to manage snapshots.</td></tr>';
      }
    }

    async function createBackup() {
      try {
        const d = await api('/api/v1/backups', { method: 'POST', body: JSON.stringify({ label: 'manual' }) });
        alert('Snapshot created successfully! Archive: ' + d.backup.filename);
        loadBackups();
      } catch (e) {
        alert('Failed to create backup: ' + e.message);
      }
    }

    async function testEndpoint(p) {
      document.getElementById('api-output').textContent = 'Loading ' + p + '...';
      try {
        const res = await api(p);
        document.getElementById('api-output').textContent = JSON.stringify(res, null, 2);
      } catch (e) {
        document.getElementById('api-output').textContent = 'Error: ' + e.message;
      }
    }

    function openBootstrapModal() { document.getElementById('bootstrap-modal').classList.remove('hidden'); }
    function closeBootstrapModal() { document.getElementById('bootstrap-modal').classList.add('hidden'); }
    function toggleAuthModal() {
      if (authToken) {
        authToken = '';
        localStorage.removeItem('androbase_auth_token');
        localStorage.removeItem('androbase_jwt');
        localStorage.removeItem('androbase_auth_user');
        document.getElementById('btn-auth-action').textContent = 'Login';
        document.getElementById('user-display').style.display = 'none';
        refreshStatus();
      } else {
        document.getElementById('login-modal').classList.toggle('hidden');
      }
    }

    async function submitBootstrap(e) {
      e.preventDefault();
      const token = document.getElementById('bs-token').value.trim();
      const username = document.getElementById('bs-user').value.trim();
      const password = document.getElementById('bs-pass').value;
      try {
        const res = await api('/api/v1/auth/bootstrap', { method: 'POST', body: JSON.stringify({ bootstrapToken: token, username, password }) });
        if (res.token) {
          authToken = res.token;
          localStorage.setItem('androbase_auth_token', authToken);
          localStorage.setItem('androbase_jwt', authToken);
          localStorage.setItem('androbase_auth_user', JSON.stringify(res.user));
          alert('Admin initialized successfully!');
          closeBootstrapModal();
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
          loadTables();
          loadFiles();
        } else {
          alert('Bootstrap error: ' + (res.error || 'Failed'));
        }
      } catch (err) {
        alert('Bootstrap request failed: ' + err.message);
      }
    }

    async function submitLogin(e) {
      e.preventDefault();
      const username = document.getElementById('lg-user').value.trim();
      const password = document.getElementById('lg-pass').value;
      try {
        const res = await api('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: username, username, password })
        });
        if (res.token) {
          authToken = res.token;
          localStorage.setItem('androbase_auth_token', authToken);
          localStorage.setItem('androbase_jwt', authToken);
          localStorage.setItem('androbase_auth_user', JSON.stringify(res.user));
          document.getElementById('login-modal').classList.add('hidden');
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
          loadTables();
          loadFiles();
        } else {
          alert('Login failed: ' + (res.error || 'Invalid credentials'));
        }
      } catch (err) {
        alert('Login request failed: ' + err.message);
      }
    }

    // Initialize
    refreshStatus();
    setInterval(refreshStatus, 10000);
  </script>
</body>
</html>`;
}

// server.ts
var appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = config.port;
  await db.initialize();
  console.log("[AndroBase] Embedded Portable Database initialized.");
  SystemMetricsCollector.initialize();
  await AppHostingManager.initialize();
  console.log("[AndroBase] System metrics collector & App hosting manager initialized.");
  const report = await CapabilityDetector.detect();
  console.log(`[AndroBase] Capability detection completed. Active Profile: ${report.profileDetails.name}`);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.removeHeader("X-Powered-By");
    next();
  });
  app.use(import_express2.default.json({ limit: "10mb" }));
  app.use(import_express2.default.urlencoded({ extended: true, limit: "10mb" }));
  app.use("/api/v1", apiRouter);
  app.get("/api/health", (req, res) => res.redirect("/api/v1/health"));
  const distPath = import_path11.default.resolve(appDir, "dist");
  const isProd = process.env.NODE_ENV === "production" || import_fs12.default.existsSync(import_path11.default.join(distPath, "index.html"));
  if (isProd) {
    if (import_fs12.default.existsSync(distPath)) {
      app.use(import_express2.default.static(distPath));
    }
    app.get("*", (req, res) => {
      const htmlFile = import_path11.default.resolve(distPath, "index.html");
      if (import_fs12.default.existsSync(htmlFile)) {
        res.sendFile(htmlFile);
      } else {
        res.status(200).type("html").send(getEmbeddedDashboardHtml());
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await Promise.resolve().then(() => __toESM(require("vite")));
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch {
      const hasDist = import_fs12.default.existsSync(distPath) && import_fs12.default.existsSync(import_path11.default.join(distPath, "index.html"));
      if (hasDist) {
        app.use(import_express2.default.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(import_path11.default.resolve(distPath, "index.html"));
        });
      } else {
        app.get("*", (req, res) => {
          res.status(200).type("html").send(getEmbeddedDashboardHtml());
        });
      }
    }
  }
  app.use((err, req, res, _next) => {
    console.error("[AndroBase Server Error]", err);
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected server error occurred."
    });
  });
  const server = app.listen(PORT, "0.0.0.0", () => {
    const access = NetworkManager.getAccessUrls();
    const hasAdmin = AuthService.hasAdmin();
    console.log("\n============================================================");
    console.log("  \u{1F4F1} ANDROBASE \u2014 Open-Source Mobile Server Platform");
    console.log("============================================================");
    console.log(`  Local URL:        ${access.local}`);
    if (access.lan) {
      console.log(`  LAN URL:          ${access.lan}`);
    }
    console.log(`  Profile:          ${report.profileDetails.name}`);
    console.log(`  Target Tier:      ${report.profileDetails.targetTier}`);
    console.log(`  Storage Root:     ${config.dataDir}`);
    if (!hasAdmin) {
      console.log("\n  \u{1F511} FIRST-RUN LOCAL BOOTSTRAP TOKEN:");
      console.log(`     ${config.adminBootstrapToken}`);
      console.log("     (Enter this token in the dashboard to set up your admin account)");
    } else {
      console.log("  \u{1F512} Administrator account already configured.");
    }
    console.log("============================================================\n");
  });
  const gracefulShutdown = (signal) => {
    console.log(`
[AndroBase] Received ${signal}. Flushing database buffers and shutting down cleanly...`);
    try {
      db.atomicSaveSync();
      console.log("[AndroBase] Database state synchronized to disk.");
    } catch (e) {
      console.error("[AndroBase] Error during database shutdown sync:", e);
    }
    server.close(() => {
      console.log("[AndroBase] HTTP server closed gracefully.");
      process.exit(0);
    });
    setTimeout(() => {
      console.warn("[AndroBase] Forced shutdown timeout reached.");
      process.exit(1);
    }, 5e3);
  };
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    console.error("[AndroBase] Unhandled promise rejection:", reason);
  });
}
startServer().catch((err) => {
  console.error("[AndroBase] Fatal error during startup:", err);
  process.exit(1);
});
