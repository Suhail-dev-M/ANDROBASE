/**
 * AndroBase - Open-Source Mobile Server Platform
 * Versioned REST API Router (/api/v1)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import { config } from '../config.ts';
import { db } from '../db/portable-db.ts';
import { AuthService } from '../security/auth.ts';
import { CapabilityDetector } from '../detector.ts';
import { FileStorageService } from '../storage/file-storage.ts';
import { BackupManager } from '../backup/manager.ts';
import { NetworkManager } from '../network/manager.ts';
import { AuditLogger } from '../audit/logger.ts';
import { UserRecord } from '../types.ts';

// Multer memory storage for safe inspection before streaming to private storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

export const apiRouter = Router();

// Middleware: Extract Bearer token & populate req.user
export interface AuthenticatedRequest extends Request {
  user?: Omit<UserRecord, 'passwordHash' | 'salt'>;
  session?: any;
}

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
  }

  const token = authHeader.substring(7).trim();
  const auth = AuthService.authenticateToken(token);
  if (!auth) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.user = auth.user;
  req.session = auth.session;
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }
    next();
  });
};

// ----------------------------------------------------
// 1. Health & Server Lifecycle
// ----------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cachedReport = CapabilityDetector.getCached();

  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: config.version,
    profile: cachedReport?.detectedProfile || 'profile_b',
    memory: {
      freeMb: Math.round(freeMem / (1024 * 1024)),
      totalMb: Math.round(totalMem / (1024 * 1024)),
      usedMb: Math.round((totalMem - freeMem) / (1024 * 1024)),
    },
  });
});

apiRouter.get('/status', async (req: Request, res: Response) => {
  const dbStats = db.getStats();
  const storageStats = FileStorageService.getStorageStats();
  const network = NetworkManager.getAccessUrls();
  const report = await CapabilityDetector.detect();
  const hasAdmin = AuthService.hasAdmin();

  res.json({
    status: 'online',
    version: config.version,
    hasAdmin,
    profile: report.detectedProfile,
    profileName: report.profileDetails.name,
    dbStats,
    storageStats,
    network,
    device: report.device,
    warnings: report.securityWarnings,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// ----------------------------------------------------
// 2. Capability Detection & Compatibility Matrix
// ----------------------------------------------------
apiRouter.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const report = await CapabilityDetector.detect();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Capability detection failed', message: err.message });
  }
});

// ----------------------------------------------------
// 3. Authentication & User Management
// ----------------------------------------------------
apiRouter.get('/auth/bootstrap-status', (req: Request, res: Response) => {
  const hasAdmin = AuthService.hasAdmin();
  res.json({
    hasAdmin,
    isBootstrapRequired: !hasAdmin,
    bootstrapTokenLocation: config.env === 'development' ? config.adminBootstrapToken : '.androbase_data/.bootstrap_token',
    tip: hasAdmin ? 'System bootstrapped.' : 'Use the local bootstrap token printed in your Termux console or .bootstrap_token file.',
  });
});

apiRouter.post('/auth/bootstrap', async (req: Request, res: Response) => {
  try {
    const { username, email, password, bootstrapToken } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await AuthService.bootstrapAdmin({
      username,
      email,
      password,
      bootstrapToken,
      ip,
      userAgent,
    });

    res.status(201).json({
      message: 'Administrator account successfully configured.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await AuthService.login(identifier, password, ip, userAgent);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    AuthService.logout(token);
  }
  res.json({ message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user, session: req.session });
});

apiRouter.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    AuthService.changePassword(req.user!.id, oldPassword, newPassword, ip, userAgent);
    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const users = db.query<UserRecord>('_users').data.map(({ passwordHash: _, salt: __, ...safe }) => safe);
  res.json(users);
});

apiRouter.post('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, email, password, role } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const newUser = await AuthService.registerUser(
      { username, email, password, role },
      req.user as any,
      { ip, userAgent }
    );
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. Portable Database Endpoints
// ----------------------------------------------------
apiRouter.get('/database/tables', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tableNames = db.getTableNames();
  const tables = tableNames.map((name) => {
    const schema = db.getSchema(name);
    const count = db.query(name, { limit: 1 }).total;
    return {
      name,
      schema,
      rowCount: count,
    };
  });
  res.json(tables);
});

apiRouter.post('/database/tables', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, primaryKey, columns } = req.body;
    if (!name || !primaryKey || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Invalid schema format. name, primaryKey, and columns required.' });
    }

    db.createTable({
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      primaryKey,
      columns,
      createdAt: new Date().toISOString(),
    });

    AuditLogger.log({
      action: 'db.table.created',
      username: req.user?.username,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'success',
      details: { tableName: name },
    });

    res.status(201).json({ message: `Table "${name}" created successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/database/tables/:name', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.name;
    db.dropTable(tableName);

    AuditLogger.log({
      action: 'db.table.dropped',
      username: req.user?.username,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'success',
      details: { tableName },
    });

    res.json({ message: `Table "${tableName}" dropped.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/database/query/:table', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const { filters, sortField, sortDirection, limit, offset } = req.body;

    const result = db.query(tableName, {
      filters,
      sortField,
      sortDirection,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/database/records/:table', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/database/records/:table/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const id = req.params.id;
    const updates = req.body;
    const updated = db.update(tableName, id, updates);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/database/records/:table/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const id = req.params.id;
    const deleted = db.delete(tableName, id);
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. File Storage Endpoints
// ----------------------------------------------------
apiRouter.get('/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const files = FileStorageService.listFiles(req.user);
  res.json(files);
});

apiRouter.post('/files', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded in form field "file".' });
    }

    const { description } = req.body;
    const stored = await FileStorageService.storeFile({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      user: req.user!,
      description,
    });

    res.status(201).json(stored);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'File record not found.' });
  res.json(record);
});

apiRouter.get('/files/:id/download', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'File not found.' });

  const filePath = FileStorageService.getFilePath(record);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Physical file missing from storage.' });
  }

  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  res.sendFile(filePath);
});

apiRouter.delete('/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = FileStorageService.deleteFile(req.params.id, req.user!);
    if (!success) return res.status(404).json({ error: 'File not found.' });
    res.json({ message: 'File deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Backup & Recovery Endpoints
// ----------------------------------------------------
apiRouter.get('/backup/list', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const backups = BackupManager.listBackups();
  res.json(backups);
});

apiRouter.post('/backup/create', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await BackupManager.createBackup(req.user?.username || 'admin');
    res.status(201).json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/backup/restore', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Backup filename required.' });

    const result = BackupManager.restoreBackup(filename, req.user?.username || 'admin');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/backup/download/:filename', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = BackupManager.getBackupFilePath(filename);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Audit Logs & System Diagnostics
// ----------------------------------------------------
apiRouter.get('/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const logs = AuditLogger.getRecent(100);
  res.json(logs);
});

apiRouter.get('/network/interfaces', (req: Request, res: Response) => {
  const ifaces = NetworkManager.getInterfaces();
  const urls = NetworkManager.getAccessUrls();
  const sshGuide = NetworkManager.getSshTunnelCommand();
  res.json({ interfaces: ifaces, urls, sshGuide });
});
