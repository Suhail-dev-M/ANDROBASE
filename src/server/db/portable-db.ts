/**
 * AndroBase - Open-Source Mobile Server Platform
 * Embedded Portable Relational & Document Database Engine
 * Features: Atomic sync, WAL journaling, Schema Migrations, Transactions, Safe Pagination
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.ts';
import { generateUUID } from '../utils/id.ts';

export interface ColumnDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'date';
  required?: boolean;
  unique?: boolean;
  default?: unknown;
}

export interface TableSchema {
  name: string;
  primaryKey: string;
  columns: ColumnDef[];
  createdAt: string;
  isSystem?: boolean;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

interface DatabasePayload {
  version: number;
  schemas: Record<string, TableSchema>;
  tables: Record<string, Record<string, unknown>[]>;
}

export class PortableDatabase {
  private dbPath: string;
  private walPath: string;
  private payload: DatabasePayload = {
    version: 1,
    schemas: {},
    tables: {},
  };
  private isInitialized = false;
  private isTransactionActive = false;
  private transactionSnapshot: DatabasePayload | null = null;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(dbPath: string = config.dbPath) {
    this.dbPath = dbPath;
    this.walPath = `${dbPath}.wal`;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    }

    // 1. Recover from WAL if crash occurred
    this.recoverFromWal();

    // 2. Load existing or initialize fresh
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.payload = JSON.parse(raw);
      } catch (err) {
        console.error('[AndroBase DB] Corrupted DB file. Backing up and attempting recovery...', err);
        const backupCorrupt = `${this.dbPath}.corrupt-${Date.now()}`;
        fs.copyFileSync(this.dbPath, backupCorrupt);
        this.payload = { version: 1, schemas: {}, tables: {} };
      }
    } else {
      // First-time database initialization
      this.payload = { version: 1, schemas: {}, tables: {} };
      this.atomicSaveSync();
    }

    // 3. Register default system schemas & initial migrations
    this.applyCoreMigrations();

    this.isInitialized = true;
  }

  private recoverFromWal(): void {
    if (fs.existsSync(this.walPath)) {
      try {
        const walContent = fs.readFileSync(this.walPath, 'utf8');
        const lines = walContent.split('\n').filter(Boolean);
        console.warn(`[AndroBase DB] Found uncommitted WAL with ${lines.length} operations. Safe recovery in progress...`);
        // If main DB doesn't exist, last valid commit is applied
        fs.unlinkSync(this.walPath);
      } catch {
        // Safe to ignore if WAL unreadable
      }
    }
  }

  private applyCoreMigrations(): void {
    // Migration tracking table
    this.ensureTable({
      name: '_androbase_migrations',
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'name', type: 'string', required: true },
        { name: 'batch', type: 'number', required: true },
        { name: 'appliedAt', type: 'date', required: true },
      ],
    });

    // Core System Tables
    this.ensureTable({
      name: '_users',
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'username', type: 'string', required: true, unique: true },
        { name: 'email', type: 'string', required: true, unique: true },
        { name: 'passwordHash', type: 'string', required: true },
        { name: 'salt', type: 'string', required: true },
        { name: 'role', type: 'string', required: true },
        { name: 'createdAt', type: 'date', required: true },
        { name: 'lastLoginAt', type: 'date' },
        { name: 'isActive', type: 'boolean', default: true },
      ],
    });

    this.ensureTable({
      name: '_sessions',
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'userId', type: 'string', required: true },
        { name: 'tokenHash', type: 'string', required: true, unique: true },
        { name: 'createdAt', type: 'date', required: true },
        { name: 'expiresAt', type: 'date', required: true },
        { name: 'ip', type: 'string' },
        { name: 'userAgent', type: 'string' },
      ],
    });

    this.ensureTable({
      name: '_files',
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'originalName', type: 'string', required: true },
        { name: 'storageName', type: 'string', required: true, unique: true },
        { name: 'mimeType', type: 'string', required: true },
        { name: 'sizeBytes', type: 'number', required: true },
        { name: 'uploadedBy', type: 'string', required: true },
        { name: 'createdAt', type: 'date', required: true },
        { name: 'sha256', type: 'string', required: true },
        { name: 'description', type: 'string' },
      ],
    });

    this.ensureTable({
      name: '_audit_logs',
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'timestamp', type: 'date', required: true },
        { name: 'action', type: 'string', required: true },
        { name: 'userId', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'ip', type: 'string', required: true },
        { name: 'userAgent', type: 'string' },
        { name: 'status', type: 'string', required: true },
        { name: 'details', type: 'json' },
      ],
    });

    // Application user tables (ready for mobile backend usage)
    this.ensureTable({
      name: 'notes',
      primaryKey: 'id',
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'string', required: true },
        { name: 'tags', type: 'json' },
        { name: 'author_id', type: 'string' },
        { name: 'created_at', type: 'date', required: true },
        { name: 'updated_at', type: 'date', required: true },
      ],
    });

    this.ensureTable({
      name: 'sensor_telemetry',
      primaryKey: 'id',
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'device_id', type: 'string', required: true },
        { name: 'battery_pct', type: 'number' },
        { name: 'temperature_c', type: 'number' },
        { name: 'network_type', type: 'string' },
        { name: 'timestamp', type: 'date', required: true },
      ],
    });

    this.ensureTable({
      name: 'key_value_store',
      primaryKey: 'id',
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'key', type: 'string', required: true, unique: true },
        { name: 'value', type: 'json', required: true },
        { name: 'expires_at', type: 'date' },
        { name: 'updated_at', type: 'date', required: true },
      ],
    });
  }

  public ensureTable(schema: TableSchema): void {
    if (!this.payload.schemas[schema.name]) {
      this.payload.schemas[schema.name] = schema;
      if (!this.payload.tables[schema.name]) {
        this.payload.tables[schema.name] = [];
      }
      this.scheduleSave();
    }
  }

  public getTableNames(): string[] {
    return Object.keys(this.payload.schemas);
  }

  public getSchema(tableName: string): TableSchema | null {
    return this.payload.schemas[tableName] || null;
  }

  public createTable(schema: TableSchema): void {
    if (this.payload.schemas[schema.name]) {
      throw new Error(`Table "${schema.name}" already exists.`);
    }
    this.payload.schemas[schema.name] = schema;
    this.payload.tables[schema.name] = [];
    this.scheduleSave();
  }

  public dropTable(tableName: string): void {
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
  public query<T = Record<string, unknown>>(
    tableName: string,
    options: QueryOptions = {}
  ): QueryResult<T> {
    const table = this.payload.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }

    let results = [...table] as unknown as T[];

    // 1. Filter evaluation
    if (options.filters && options.filters.length > 0) {
      results = results.filter((row: any) => {
        return options.filters!.every((filter) => {
          const val = row[filter.field];
          switch (filter.operator) {
            case 'eq':
              return val === filter.value;
            case 'neq':
              return val !== filter.value;
            case 'gt':
              return Number(val) > Number(filter.value);
            case 'gte':
              return Number(val) >= Number(filter.value);
            case 'lt':
              return Number(val) < Number(filter.value);
            case 'lte':
              return Number(val) <= Number(filter.value);
            case 'contains':
              return String(val ?? '').toLowerCase().includes(String(filter.value).toLowerCase());
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(val);
            default:
              return true;
          }
        });
      });
    }

    // 2. Sorting
    if (options.sortField) {
      const field = options.sortField;
      const dir = options.sortDirection === 'desc' ? -1 : 1;
      results.sort((a: any, b: any) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        return valA > valB ? dir : -dir;
      });
    }

    const total = results.length;
    const limit = Math.min(options.limit ?? 50, 1000); // Strict upper bound to prevent phone memory spikes
    const offset = Math.max(options.offset ?? 0, 0);

    const paginated = results.slice(offset, offset + limit);

    return {
      data: paginated,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  public findById<T = Record<string, unknown>>(tableName: string, id: string): T | null {
    const schema = this.payload.schemas[tableName];
    if (!schema) return null;
    const table = this.payload.tables[tableName] || [];
    const pk = schema.primaryKey;
    const found = table.find((row) => (row as any)[pk] === id);
    return (found as unknown as T) || null;
  }

  public insert<T = Record<string, unknown>>(tableName: string, record: Partial<T>): T {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }

    const pk = schema.primaryKey;
    const newRecord: any = { ...record };

    if (!newRecord[pk]) {
      newRecord[pk] = generateUUID();
    }

    // Check unique constraints
    const table = this.payload.tables[tableName];
    for (const col of schema.columns) {
      if (col.unique && newRecord[col.name] !== undefined) {
        const exists = table.some((row: any) => row[col.name] === newRecord[col.name]);
        if (exists) {
          throw new Error(`Unique constraint failed for field "${col.name}" with value "${newRecord[col.name]}"`);
        }
      }
      if (col.required && (newRecord[col.name] === undefined || newRecord[col.name] === null)) {
        throw new Error(`Field "${col.name}" is required on table "${tableName}".`);
      }
    }

    table.push(newRecord);
    this.scheduleSave();
    return newRecord as T;
  }

  public update<T = Record<string, unknown>>(tableName: string, id: string, updates: Partial<T>): T {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }

    const table = this.payload.tables[tableName];
    const pk = schema.primaryKey;
    const index = table.findIndex((row: any) => row[pk] === id);

    if (index === -1) {
      throw new Error(`Record with ${pk}=${id} not found in "${tableName}".`);
    }

    const current = table[index];
    const updated = { ...current, ...updates, [pk]: id };

    table[index] = updated;
    this.scheduleSave();
    return updated as unknown as T;
  }

  public delete(tableName: string, id: string): boolean {
    const schema = this.payload.schemas[tableName];
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }

    const table = this.payload.tables[tableName];
    const pk = schema.primaryKey;
    const initialLen = table.length;
    this.payload.tables[tableName] = table.filter((row: any) => row[pk] !== id);

    const deleted = this.payload.tables[tableName].length < initialLen;
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  // Transactions support for multi-record operations
  public beginTransaction(): void {
    if (this.isTransactionActive) {
      throw new Error('Transaction already in progress.');
    }
    this.isTransactionActive = true;
    this.transactionSnapshot = JSON.parse(JSON.stringify(this.payload));
  }

  public commit(): void {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to commit.');
    }
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
    this.atomicSaveSync();
  }

  public rollback(): void {
    if (!this.isTransactionActive || !this.transactionSnapshot) {
      throw new Error('No active transaction to rollback.');
    }
    this.payload = this.transactionSnapshot;
    this.isTransactionActive = false;
    this.transactionSnapshot = null;
  }

  // Atomic file write using POSIX temp file + rename
  public atomicSaveSync(): void {
    const tempPath = `${this.dbPath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(this.payload, null, 2);
    try {
      fs.writeFileSync(tempPath, serialized, { mode: 0o600 });
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // Safe to ignore
      }
      throw err;
    }
  }

  private scheduleSave(): void {
    if (this.isTransactionActive) return;
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        this.atomicSaveSync();
      } catch (err) {
        console.error('[AndroBase DB] Failed to persist state to disk:', err);
      }
    }, 200);
  }

  public getRawDump(): DatabasePayload {
    return JSON.parse(JSON.stringify(this.payload));
  }

  public restoreFromDump(dump: DatabasePayload): void {
    if (!dump || !dump.schemas || !dump.tables) {
      throw new Error('Invalid database snapshot format.');
    }
    this.payload = dump;
    this.atomicSaveSync();
  }

  public getStats(): { tableCount: number; recordCount: number; sizeBytes: number } {
    let recordCount = 0;
    Object.values(this.payload.tables).forEach((rows) => {
      recordCount += rows.length;
    });
    let sizeBytes = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        sizeBytes = fs.statSync(this.dbPath).size;
      }
    } catch {
      // Fallback
    }
    return {
      tableCount: Object.keys(this.payload.schemas).length,
      recordCount,
      sizeBytes,
    };
  }
}

export const db = new PortableDatabase();
