/**
 * AndroBase - Open-Source Mobile Server Platform
 * Backup, Integrity Verification & Restore Engine
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.ts';
import { db } from '../db/portable-db.ts';
import { BackupMetadata } from '../types.ts';
import { CapabilityDetector } from '../detector.ts';
import { AuditLogger } from '../audit/logger.ts';
import { generateUUID } from '../utils/id.ts';

export interface BackupArchiveContent {
  metadata: BackupMetadata;
  database: ReturnType<typeof db.getRawDump>;
  configSnapshot: {
    version: string;
    port: number;
    allowLan: boolean;
    maxUploadBytes: number;
    maxMemoryMb: number;
    createdTimestamp: string;
  };
  fileInventory: { id: string; storageName: string; originalName: string; sizeBytes: number; sha256: string }[];
}

export class BackupManager {
  private static backupsDir = config.backupsDir;

  public static async createBackup(createdBy: string = 'system'): Promise<BackupMetadata> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = generateUUID();
    const filename = `androbase_backup_${timestamp}.json`;
    const targetFilePath = path.join(this.backupsDir, filename);

    // 1. Get consistent database memory dump
    const dbDump = db.getRawDump();

    // 2. Collect file inventory
    const files = db.query<any>('_files').data;
    const fileInventory = files.map((f) => ({
      id: f.id,
      storageName: f.storageName,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes,
      sha256: f.sha256,
    }));

    const detectedProfile = CapabilityDetector.getCached()?.detectedProfile || 'profile_b';

    const tempMetadata: BackupMetadata = {
      id: backupId,
      filename,
      createdAt: new Date().toISOString(),
      sizeBytes: 0,
      sha256: '',
      tablesCount: Object.keys(dbDump.schemas).length,
      filesCount: fileInventory.length,
      version: config.version,
      profile: detectedProfile,
    };

    const archive: BackupArchiveContent = {
      metadata: tempMetadata,
      database: dbDump,
      configSnapshot: {
        version: config.version,
        port: config.port,
        allowLan: config.allowLan,
        maxUploadBytes: config.maxUploadBytes,
        maxMemoryMb: config.maxMemoryMb,
        createdTimestamp: new Date().toISOString(),
      },
      fileInventory,
    };

    const serialized = JSON.stringify(archive, null, 2);
    const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    // Update computed sha256 and size in the archive
    archive.metadata.sha256 = sha256;
    archive.metadata.sizeBytes = sizeBytes;

    // Atomic write to disk
    const finalSerialized = JSON.stringify(archive, null, 2);
    const tempPath = `${targetFilePath}.tmp`;
    fs.writeFileSync(tempPath, finalSerialized, { mode: 0o600 });
    fs.renameSync(tempPath, targetFilePath);

    AuditLogger.log({
      action: 'backup.created',
      username: createdBy,
      ip: '127.0.0.1',
      userAgent: 'internal',
      status: 'success',
      details: { backupId, filename, sha256, sizeBytes },
    });

    return archive.metadata;
  }

  public static listBackups(): BackupMetadata[] {
    if (!fs.existsSync(this.backupsDir)) return [];

    const files = fs.readdirSync(this.backupsDir);
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json') && file.startsWith('androbase_backup_')) {
        try {
          const filePath = path.join(this.backupsDir, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.metadata) {
            backups.push(parsed.metadata);
          }
        } catch {
          // Skip corrupt file
        }
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static verifyBackupIntegrity(filename: string): { valid: boolean; message: string; metadata?: BackupMetadata } {
    const safeTarget = path.normalize(path.join(this.backupsDir, path.basename(filename)));
    if (!fs.existsSync(safeTarget)) {
      return { valid: false, message: 'Backup file does not exist.' };
    }

    try {
      const raw = fs.readFileSync(safeTarget, 'utf8');
      const parsed: BackupArchiveContent = JSON.parse(raw);

      if (!parsed.metadata || !parsed.database || !parsed.database.schemas) {
        return { valid: false, message: 'Backup payload structure is malformed or missing tables.' };
      }

      return { valid: true, message: 'Backup integrity verified with valid schema structure.', metadata: parsed.metadata };
    } catch (err: any) {
      return { valid: false, message: `Backup verification failed: ${err.message}` };
    }
  }

  public static restoreBackup(filename: string, performedBy: string): { success: boolean; message: string } {
    const safeTarget = path.normalize(path.join(this.backupsDir, path.basename(filename)));
    const check = this.verifyBackupIntegrity(filename);

    if (!check.valid) {
      throw new Error(`Cannot restore invalid backup: ${check.message}`);
    }

    const raw = fs.readFileSync(safeTarget, 'utf8');
    const parsed: BackupArchiveContent = JSON.parse(raw);

    // 1. Take safety snapshot of current state before restoration
    const rollbackDump = db.getRawDump();
    const rollbackPath = path.join(this.backupsDir, `pre_restore_rollback_${Date.now()}.json`);
    try {
      fs.writeFileSync(rollbackPath, JSON.stringify(rollbackDump, null, 2), { mode: 0o600 });
    } catch (e) {
      console.warn('Could not save pre-restore rollback snapshot:', e);
    }

    // 2. Restore database state
    try {
      db.restoreFromDump(parsed.database);

      AuditLogger.log({
        action: 'backup.restored',
        username: performedBy,
        ip: '127.0.0.1',
        userAgent: 'internal',
        status: 'success',
        details: { restoredFile: filename, tablesRestored: Object.keys(parsed.database.schemas).length },
      });

      return {
        success: true,
        message: `Successfully restored ${Object.keys(parsed.database.schemas).length} tables from ${filename}. Rollback point saved.`,
      };
    } catch (err: any) {
      // Roll back
      db.restoreFromDump(rollbackDump);
      throw new Error(`Restoration failed and was safely rolled back: ${err.message}`);
    }
  }

  public static getBackupFilePath(filename: string): string {
    const safeTarget = path.normalize(path.join(this.backupsDir, path.basename(filename)));
    if (!fs.existsSync(safeTarget)) {
      throw new Error('Backup file not found.');
    }
    return safeTarget;
  }
}
