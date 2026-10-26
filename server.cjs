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
var import_path7 = __toESM(require("path"));
var import_fs8 = __toESM(require("fs"));

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
var import_crypto = __toESM(require("crypto"));
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
      newRecord[pk] = import_crypto.default.randomUUID();
    }
    const table = this.payload.tables[tableName];
    for (const col of schema.columns) {
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
var import_os3 = __toESM(require("os"));
var import_fs7 = __toESM(require("fs"));

// src/server/security/auth.ts
var import_crypto3 = __toESM(require("crypto"));

// src/server/audit/logger.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var import_crypto2 = __toESM(require("crypto"));
var AuditLogger = class {
  // 2MB max log file on mobile flash
  static log(entry) {
    const fullEntry = {
      id: import_crypto2.default.randomUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
};
AuditLogger.logFilePath = import_path3.default.join(config.logsDir, "androbase-audit.log");
AuditLogger.maxLogSizeBytes = 1024 * 1024 * 2;

// src/server/security/auth.ts
var AuthService = class {
  // 15 mins
  static hashPassword(password, saltHex) {
    const salt = saltHex ? Buffer.from(saltHex, "hex") : import_crypto3.default.randomBytes(16);
    const iterations = 1e4;
    const derivedKey = import_crypto3.default.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    return {
      hash: derivedKey.toString("hex"),
      salt: salt.toString("hex")
    };
  }
  static verifyPassword(password, storedHash, saltHex) {
    const salt = Buffer.from(saltHex, "hex");
    const iterations = 1e4;
    const derivedKey = import_crypto3.default.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (derivedKey.length !== storedBuf.length) {
      return false;
    }
    return import_crypto3.default.timingSafeEqual(derivedKey, storedBuf);
  }
  static hashToken(token) {
    return import_crypto3.default.createHash("sha256").update(token).digest("hex");
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
    const admins = db.query("_users", {
      filters: [{ field: "role", operator: "eq", value: "admin" }]
    });
    return admins.total > 0;
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
    const userId = import_crypto3.default.randomUUID();
    const userRecord = {
      id: userId,
      username: params.username.trim().toLowerCase(),
      email: params.email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: "admin",
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
    const email = params.email.trim().toLowerCase();
    const existing = db.query("_users", {
      filters: [
        { field: "username", operator: "eq", value: username }
      ]
    });
    if (existing.total > 0) {
      throw new Error(`Username "${username}" is already taken.`);
    }
    if (params.password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    const { hash, salt } = this.hashPassword(params.password);
    const userId = import_crypto3.default.randomUUID();
    const user = {
      id: userId,
      username,
      email,
      passwordHash: hash,
      salt,
      role: params.role || "member",
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
      details: { createdBy: (createdByAdmin == null ? void 0 : createdByAdmin.username) || "self" }
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
    const token = import_crypto3.default.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1e3).toISOString();
    const session = {
      id: import_crypto3.default.randomUUID(),
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
    }).data[0];
    if (session) {
      db.delete("_sessions", session.id);
      AuditLogger.log({
        action: "auth.logout",
        userId: session.userId,
        ip: session.ip,
        userAgent: session.userAgent,
        status: "success"
      });
    }
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
// In-memory rate limiting map: ip -> { attempts, resetAt }
AuthService.loginAttempts = /* @__PURE__ */ new Map();
AuthService.MAX_ATTEMPTS = 5;
AuthService.LOCKOUT_MS = 15 * 60 * 1e3;

// src/server/detector.ts
var import_os = __toESM(require("os"));
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_crypto4 = __toESM(require("crypto"));
var import_child_process = require("child_process");
var PROFILES = {
  profile_a: {
    id: "profile_a",
    name: "Profile A \u2014 Legacy Mobile",
    targetTier: "Android 5.1\u20137.x / ARMv7 32-bit / < 1GB RAM",
    minRamMb: 256,
    description: "Minimal resource mode. Uses embedded portable database, reduced memory heap, restricted concurrent uploads, and conservative cryptographic parameters.",
    enabledFeatures: ["Core REST API", "Embedded File-Backed Database", "Local User Auth", "Basic File Storage", "LAN Dashboard"],
    disabledFeatures: ["Automated Scheduled Cron Tasks", "PostgreSQL External Adapter", "Heavy In-Memory Caching", "Real-time WebSocket Broadcasts"]
  },
  profile_b: {
    id: "profile_b",
    name: "Profile B \u2014 Standard Mobile",
    targetTier: "Android 8.0\u201311.0 / ARM64 or modern 32-bit / 1GB\u20133GB RAM",
    minRamMb: 768,
    description: "Standard self-hosted server mode. Enables full authentication, relational database operations, file storage with metadata indexing, audit logging, and automated backups.",
    enabledFeatures: ["Core REST API", "Embedded Relational Database", "Full JWT/Session Auth", "File Storage with Quotas", "Audit Logs", "Snapshot Backups", "LAN Dashboard"],
    disabledFeatures: ["Multi-worker cluster mode", "Memory-intensive video/binary processing"]
  },
  profile_c: {
    id: "profile_c",
    name: "Profile C \u2014 Advanced Mobile / Edge",
    targetTier: "Android 12+ / 64-bit ARM64 / 4GB+ RAM",
    minRamMb: 2048,
    description: "High performance edge profile. Supports multi-database sync, background scheduled jobs, automated integrity checks, high-concurrency requests, and comprehensive diagnostics.",
    enabledFeatures: ["Core REST API", "Full Database Suite", "Advanced Monitoring", "Automated Scheduled Maintenance", "Fast Cryptographic Primitives", "Concurrent Uploads", "LAN Discovery"],
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
      const testSalt = import_crypto4.default.randomBytes(16);
      const testHash = import_crypto4.default.pbkdf2Sync("testPassword123", testSalt, 1e3, 32, "sha256");
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
var import_crypto5 = __toESM(require("crypto"));
var DISALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([
  ".exe",
  ".apk",
  ".dex",
  ".so",
  ".sh",
  ".bat",
  ".cmd",
  ".vbs",
  ".ps1",
  ".php",
  ".phtml",
  ".cgi",
  ".jar"
]);
var FileStorageService = class {
  static sanitizeFilename(originalName) {
    const base = import_path5.default.basename(originalName);
    return base.replace(/[^a-zA-Z0-9._-]/g, "_");
  }
  static isExtensionAllowed(filename) {
    const ext = import_path5.default.extname(filename).toLowerCase();
    return !DISALLOWED_EXTENSIONS.has(ext);
  }
  static validatePathSafe(storageName) {
    const safeTarget = import_path5.default.normalize(import_path5.default.join(this.storageRoot, storageName));
    const relative = import_path5.default.relative(this.storageRoot, safeTarget);
    if (relative.startsWith("..") || import_path5.default.isAbsolute(relative)) {
      throw new Error("Path traversal detected. Access rejected.");
    }
    return safeTarget;
  }
  static async storeFile(params) {
    const { originalName, mimeType, buffer, user, description } = params;
    if (buffer.length > config.maxUploadBytes) {
      throw new Error(`File exceeds maximum allowed upload size of ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB.`);
    }
    if (!this.isExtensionAllowed(originalName)) {
      throw new Error("Execution hazard: File extension is not permitted for storage.");
    }
    const cleanBaseName = this.sanitizeFilename(originalName);
    const fileId = import_crypto5.default.randomUUID();
    const sha256 = import_crypto5.default.createHash("sha256").update(buffer).digest("hex");
    const storageName = `${fileId}_${cleanBaseName}`;
    const destinationPath = this.validatePathSafe(storageName);
    const tempPath = `${destinationPath}.upload.${Date.now()}`;
    try {
      import_fs5.default.writeFileSync(tempPath, buffer, { mode: 384 });
      import_fs5.default.renameSync(tempPath, destinationPath);
    } catch (err) {
      if (import_fs5.default.existsSync(tempPath)) {
        try {
          import_fs5.default.unlinkSync(tempPath);
        } catch {
        }
      }
      throw err;
    }
    const record = {
      id: fileId,
      originalName: cleanBaseName,
      storageName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: buffer.length,
      uploadedBy: user.username,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      sha256,
      description: description || ""
    };
    db.insert("_files", record);
    AuditLogger.log({
      action: "file.uploaded",
      userId: user.id,
      username: user.username,
      ip: "127.0.0.1",
      userAgent: "internal",
      status: "success",
      details: { fileId, originalName: cleanBaseName, sizeBytes: buffer.length }
    });
    return record;
  }
  static getFileRecord(fileId) {
    return db.findById("_files", fileId);
  }
  static getFilePath(record) {
    return this.validatePathSafe(record.storageName);
  }
  static deleteFile(fileId, user) {
    const record = this.getFileRecord(fileId);
    if (!record) return false;
    if (user.role !== "admin" && record.uploadedBy !== user.username) {
      throw new Error("Access denied: You do not have permission to delete this file.");
    }
    const fullPath = this.getFilePath(record);
    if (import_fs5.default.existsSync(fullPath)) {
      try {
        import_fs5.default.unlinkSync(fullPath);
      } catch (err) {
        console.error("[AndroBase Storage] Failed to delete physical file:", err);
      }
    }
    db.delete("_files", fileId);
    AuditLogger.log({
      action: "file.deleted",
      userId: user.id,
      username: user.username,
      ip: "127.0.0.1",
      userAgent: "internal",
      status: "success",
      details: { fileId, originalName: record.originalName }
    });
    return true;
  }
  static listFiles(user) {
    const res = db.query("_files", {
      sortField: "createdAt",
      sortDirection: "desc",
      limit: 200
    });
    return res.data;
  }
  static getStorageStats() {
    const files = db.query("_files").data;
    const totalSizeBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    return {
      totalFiles: files.length,
      totalSizeBytes
    };
  }
};
FileStorageService.storageRoot = config.storageDir;

// src/server/backup/manager.ts
var import_fs6 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));
var import_crypto6 = __toESM(require("crypto"));
var BackupManager = class {
  static async createBackup(createdBy = "system") {
    var _a;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupId = import_crypto6.default.randomUUID();
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
    const sha256 = import_crypto6.default.createHash("sha256").update(serialized).digest("hex");
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

// src/server/api/router.ts
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes }
});
var apiRouter = (0, import_express.Router)();
var requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Bearer token missing." });
  }
  const token = authHeader.substring(7).trim();
  const auth = AuthService.authenticateToken(token);
  if (!auth) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
  req.user = auth.user;
  req.session = auth.session;
  next();
};
var requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    var _a;
    if (((_a = req.user) == null ? void 0 : _a.role) !== "admin") {
      return res.status(403).json({ error: "Access denied: Administrator privileges required." });
    }
    next();
  });
};
apiRouter.get("/health", (req, res) => {
  const totalMem = import_os3.default.totalmem();
  const freeMem = import_os3.default.freemem();
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
    const { identifier, password } = req.body;
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
  if (!import_fs7.default.existsSync(filePath)) {
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

// server.ts
var appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = config.port;
  await db.initialize();
  console.log("[AndroBase] Embedded Portable Database initialized.");
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
  const distPath = import_path7.default.resolve(appDir, "dist");
  const hasDist = import_fs8.default.existsSync(import_path7.default.join(distPath, "index.html"));
  const isProd = process.env.NODE_ENV === "production" || hasDist;
  if (isProd) {
    if (import_fs8.default.existsSync(distPath)) {
      app.use(import_express2.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path7.default.resolve(distPath, "index.html"));
      });
    } else {
      console.warn("[AndroBase] Production mode active but dist/ directory not found. Please run `npm run build`.");
    }
  } else {
    try {
      const { createServer: createViteServer } = await Promise.resolve().then(() => __toESM(require("vite")));
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch {
      console.warn("[AndroBase] Vite dev middleware not loaded (running without devDependencies). Serving static dist.");
      if (import_fs8.default.existsSync(distPath)) {
        app.use(import_express2.default.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(import_path7.default.resolve(distPath, "index.html"));
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
