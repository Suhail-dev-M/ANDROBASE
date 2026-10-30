/**
 * AndroBase - Open-Source Mobile Server Platform
 * Structured Audit Logging & Flash-Safe Log Rotation
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.ts';
import { db } from '../db/portable-db.ts';
import { AuditLogEntry } from '../types.ts';
import { generateUUID } from '../utils/id.ts';

export class AuditLogger {
  private static logFilePath = path.join(config.logsDir, 'androbase-audit.log');
  private static maxLogSizeBytes = 1024 * 1024 * 2; // 2MB max log file on mobile flash

  public static log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      ip: entry.ip || '127.0.0.1',
      userAgent: entry.userAgent || 'system/internal',
      ...entry,
    };

    // 1. Write to database table for visual dashboard inspection
    try {
      db.insert<AuditLogEntry>('_audit_logs', fullEntry);
    } catch {
      // In case DB is not yet ready, proceed to append to file
    }

    // 2. Append to disk log file with rotation safety
    try {
      this.rotateIfNeeded();
      const line = JSON.stringify(fullEntry) + '\n';
      fs.appendFileSync(this.logFilePath, line, 'utf8');
    } catch (err) {
      console.error('[AndroBase Audit] Failed to write audit log line:', err);
    }
  }

  private static rotateIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stat = fs.statSync(this.logFilePath);
        if (stat.size > this.maxLogSizeBytes) {
          const rotated = `${this.logFilePath}.${Date.now()}.bak`;
          fs.renameSync(this.logFilePath, rotated);

          // Keep max 2 previous backups to preserve mobile disk storage
          const files = fs.readdirSync(config.logsDir);
          const baks = files
            .filter((f) => f.startsWith('androbase-audit.log.') && f.endsWith('.bak'))
            .sort()
            .reverse();

          baks.slice(2).forEach((oldBak) => {
            try {
              fs.unlinkSync(path.join(config.logsDir, oldBak));
            } catch {
              // Safe
            }
          });
        }
      }
    } catch {
      // Non-fatal
    }
  }

  public static getRecent(limit: number = 50): AuditLogEntry[] {
    try {
      const res = db.query<AuditLogEntry>('_audit_logs', {
        sortField: 'timestamp',
        sortDirection: 'desc',
        limit,
      });
      return res.data;
    } catch {
      return [];
    }
  }

  public static getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return this.getRecent(limit);
  }
}
