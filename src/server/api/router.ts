/**
 * AndroBase - Open-Source Mobile Server Platform
 * Versioned REST API Router (/api/v1)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { config } from '../config.ts';
import { db } from '../db/portable-db.ts';
import { AuthService } from '../security/auth.ts';
import { CapabilityDetector } from '../detector.ts';
import { FileStorageService } from '../storage/file-storage.ts';
import { BackupManager } from '../backup/manager.ts';
import { NetworkManager } from '../network/manager.ts';
import { AuditLogger } from '../audit/logger.ts';
import { UserRecord, ServerPermission } from '../types.ts';
import { SystemMetricsCollector } from '../modules/system/metrics.ts';
import { ServerFileManager } from '../modules/files/manager.ts';
import { AppHostingManager } from '../modules/apps/manager.ts';
import { DatabaseSubsystemManager } from '../modules/databases/manager.ts';
import { DockerSubsystemManager } from '../modules/docker/manager.ts';
import { NetworkDiagnosticsManager } from '../modules/network/network-tools.ts';
import { ProcessSubsystemManager } from '../modules/processes/process-manager.ts';
import { TaskScheduler } from '../modules/tasks/scheduler.ts';
import { MediaManager } from '../modules/media/media-manager.ts';
import { DevToolsManager } from '../modules/devtools/dev-tools.ts';
import { PluginRegistry } from '../modules/plugins/plugin-registry.ts';

// Initialize singleton instances
export const taskScheduler = new TaskScheduler(config.dataDir);
export const mediaManager = new MediaManager(config.dataDir);
export const devToolsManager = new DevToolsManager(process.cwd());
export const pluginRegistry = new PluginRegistry(config.dataDir);

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
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  } else if (req.headers['x-access-token']) {
    token = String(req.headers['x-access-token']).trim();
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
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  // Check if system has any admin configured yet
  if (!AuthService.hasAdmin()) {
    return res.status(401).json({
      error: 'Administrator setup required. Please initialize the administrator account first.',
      needsBootstrap: true,
    });
  }

  return res.status(401).json({
    error: 'Authentication required. Please sign in with your username and password.',
    requiresLogin: true,
  });
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }
    next();
  });
};

const requirePermission = (permission: ServerPermission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !AuthService.hasPermission(req.user, permission)) {
        return res.status(403).json({ error: `Access denied. Missing required permission: ${permission}` });
      }
      next();
    });
  };
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
    const rawId = req.body.identifier || req.body.username || req.body.email || req.body.user;
    const identifier = typeof rawId === 'string' ? rawId.trim() : '';
    const password = req.body.password;

    if (!AuthService.hasAdmin()) {
      return res.status(400).json({
        error: 'No administrator account configured yet. Please complete initial admin setup first using the Set Up Admin button.',
        needsBootstrap: true,
      });
    }

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

// ----------------------------------------------------
// 8. REST Route Aliases (Ensures all UI clients & scripts connect cleanly)
// ----------------------------------------------------
apiRouter.get('/db/tables', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tableNames = db.getTableNames();
  const tables = tableNames.map((name) => ({
    name,
    schema: db.getSchema(name),
    rowCount: db.query(name, { limit: 1 }).total,
  }));
  res.json(tables);
});

apiRouter.post('/db/:table/query', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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

apiRouter.get('/storage/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const files = FileStorageService.listFiles(req.user);
  res.json(files);
});

apiRouter.post('/storage/files', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
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

apiRouter.delete('/storage/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = FileStorageService.deleteFile(req.params.id, req.user!);
    if (!success) return res.status(404).json({ error: 'File not found.' });
    res.json({ message: 'File deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

apiRouter.post('/db/tables', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
    res.status(201).json({ message: `Table "${name}" created successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/db/tables/:name', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.name;
    db.dropTable(tableName);
    res.json({ message: `Table "${tableName}" dropped.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/db/records/:table', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/db/:table/records', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = req.params.table;
    const record = req.body;
    const inserted = db.insert(tableName, record);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/db/records/:table/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { table, id } = req.params;
    const deleted = db.delete(table, id);
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/db/:table/records/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { table, id } = req.params;
    const deleted = db.delete(table, id);
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/storage/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const record = FileStorageService.getFileRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'File record not found.' });
  const filePath = FileStorageService.getFilePath(record);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Physical file missing from storage.' });
  }
  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  res.sendFile(filePath);
});

apiRouter.get('/backups', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const backups = BackupManager.listBackups();
  res.json(backups);
});

apiRouter.post('/backups', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await BackupManager.createBackup(req.user?.username || 'admin');
    res.status(201).json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 12. System Telemetry & Historical Metrics
// ----------------------------------------------------
apiRouter.get('/metrics/live', requirePermission('system:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const live = SystemMetricsCollector.collectLiveMetrics();
    res.json(live);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/metrics/history', requirePermission('system:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = SystemMetricsCollector.getHistory();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 13. File Manager
// ----------------------------------------------------
apiRouter.get('/files/list', requirePermission('files:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const subPath = (req.query.path as string) || '';
    const result = ServerFileManager.listDirectory(subPath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/folder', requirePermission('files:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { path: parentPath, folderName } = req.body;
    if (!folderName) return res.status(400).json({ error: 'Folder name is required' });
    const created = ServerFileManager.createDirectory(parentPath || '', folderName);
    res.status(201).json({ message: 'Directory created', path: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/rename', requirePermission('files:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath are required' });
    ServerFileManager.renamePath(oldPath, newPath);
    res.json({ message: 'Renamed successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/copy', requirePermission('files:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { srcPath, destPath } = req.body;
    if (!srcPath || !destPath) return res.status(400).json({ error: 'srcPath and destPath are required' });
    ServerFileManager.copyPath(srcPath, destPath);
    res.json({ message: 'Copied successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/move', requirePermission('files:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { srcPath, destPath } = req.body;
    if (!srcPath || !destPath) return res.status(400).json({ error: 'srcPath and destPath are required' });
    ServerFileManager.movePath(srcPath, destPath);
    res.json({ message: 'Moved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/files/delete', requirePermission('files:delete'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetPath = (req.query.path as string) || req.body.path;
    if (!targetPath) return res.status(400).json({ error: 'Path is required' });
    ServerFileManager.deletePath(targetPath);
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/files/read', requirePermission('files:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetPath = (req.query.path as string);
    if (!targetPath) return res.status(400).json({ error: 'Path query param is required' });
    const content = ServerFileManager.readFileContent(targetPath);
    res.json({ path: targetPath, content });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/write', requirePermission('files:write'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { path: targetPath, content } = req.body;
    if (!targetPath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }
    ServerFileManager.writeFileContent(targetPath, content);
    res.json({ message: 'File saved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/files/upload', requirePermission('files:write'), upload.array('files', 20), (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetDir = req.body.path || '';
    const resolvedDir = ServerFileManager.resolveSafePath(targetDir);
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = [];
    for (const f of files) {
      const dest = path.join(resolvedDir, path.basename(f.originalname));
      fs.writeFileSync(dest, f.buffer);
      uploaded.push(f.originalname);
    }
    res.status(201).json({ message: `Uploaded ${uploaded.length} files successfully`, files: uploaded });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/files/download', requirePermission('files:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = req.query.path as string;
    if (!target) return res.status(400).json({ error: 'Path required' });
    const resolved = ServerFileManager.resolveSafePath(target);
    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(resolved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 14. Application & Web Hosting Manager
// ----------------------------------------------------
apiRouter.get('/apps', requirePermission('apps:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const apps = AppHostingManager.listApps();
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/apps', requirePermission('apps:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const app = AppHostingManager.createApp(req.body);
    res.status(201).json(app);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/apps/:id', requirePermission('apps:read'), (req: AuthenticatedRequest, res: Response) => {
  const app = AppHostingManager.getApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
});

apiRouter.put('/apps/:id', requirePermission('apps:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = AppHostingManager.updateApp(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/apps/:id', requirePermission('apps:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    AppHostingManager.deleteApp(req.params.id);
    res.json({ message: 'App deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/apps/:id/start', requirePermission('apps:manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const started = await AppHostingManager.startApp(req.params.id);
    res.json(started);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/apps/:id/stop', requirePermission('apps:manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stopped = await AppHostingManager.stopApp(req.params.id);
    res.json(stopped);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/apps/:id/restart', requirePermission('apps:manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restarted = await AppHostingManager.restartApp(req.params.id);
    res.json(restarted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/apps/:id/logs', requirePermission('apps:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string, 10) || 100;
    const logs = AppHostingManager.getLogs(req.params.id, lines);
    res.json({ logs });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 15. Database Subsystem Manager
// ----------------------------------------------------
apiRouter.get('/databases/engines', requirePermission('db:read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const engines = await DatabaseSubsystemManager.detectEngines();
    res.json(engines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/databases/query', requirePermission('db:write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { engine, query, params } = req.body;
    if (!engine || !query) {
      return res.status(400).json({ error: 'engine and query parameters are required' });
    }
    const result = await DatabaseSubsystemManager.executeQuery(engine, query, params);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 16. Docker Container Manager
// ----------------------------------------------------
apiRouter.get('/docker/status', requirePermission('docker:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = DockerSubsystemManager.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/docker/containers', requirePermission('docker:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const containers = DockerSubsystemManager.listContainers();
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/docker/containers/:id/start', requirePermission('docker:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    DockerSubsystemManager.startContainer(req.params.id);
    res.json({ message: 'Container started' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/docker/containers/:id/stop', requirePermission('docker:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    DockerSubsystemManager.stopContainer(req.params.id);
    res.json({ message: 'Container stopped' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/docker/containers/:id/restart', requirePermission('docker:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    DockerSubsystemManager.restartContainer(req.params.id);
    res.json({ message: 'Container restarted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/docker/containers/:id', requirePermission('docker:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    DockerSubsystemManager.removeContainer(req.params.id);
    res.json({ message: 'Container removed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/docker/containers/:id/logs', requirePermission('docker:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = DockerSubsystemManager.getContainerLogs(req.params.id);
    res.json({ logs });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 17. Network Management & Diagnostics
// ----------------------------------------------------
apiRouter.get('/network/info', (req: Request, res: Response) => {
  try {
    const interfaces = NetworkManager.getInterfaces();
    const urls = NetworkManager.getAccessUrls();
    const sshGuide = NetworkManager.getSshTunnelCommand();
    res.json({
      interfaces,
      urls,
      sshGuide,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/network/interfaces', requirePermission('network:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const ifaces = NetworkDiagnosticsManager.getInterfaces();
    res.json(ifaces);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/network/ports', requirePermission('network:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const ports = NetworkDiagnosticsManager.getListeningPorts();
    res.json(ports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/network/dns', requirePermission('network:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const dnsInfo = NetworkDiagnosticsManager.getDnsServers();
    res.json(dnsInfo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/network/ping', requirePermission('network:diagnostics'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: 'Host is required' });
    const pingResult = await NetworkDiagnosticsManager.pingHost(host);
    res.json(pingResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/network/dns-lookup', requirePermission('network:diagnostics'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hostname } = req.body;
    if (!hostname) return res.status(400).json({ error: 'Hostname is required' });
    const records = await NetworkDiagnosticsManager.resolveDns(hostname);
    res.json(records);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 18. Processes & System Services
// ----------------------------------------------------
apiRouter.get('/processes', requirePermission('processes:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const procs = ProcessSubsystemManager.listProcesses(80);
    res.json(procs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/processes/:pid/kill', requirePermission('processes:kill'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    if (!pid) return res.status(400).json({ error: 'Valid PID is required' });
    ProcessSubsystemManager.killProcess(pid);
    res.json({ message: `Process ${pid} terminated` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/services', requirePermission('processes:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const services = ProcessSubsystemManager.listServices();
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/services/:name/control', requirePermission('services:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action } = req.body;
    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ error: 'Action must be start, stop, or restart' });
    }
    ProcessSubsystemManager.controlService(req.params.name, action);
    res.json({ message: `Service ${req.params.name} ${action} command sent` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 19. Security Centre & Sessions
// ----------------------------------------------------
apiRouter.get('/security/audit', requirePermission('security:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = AuthService.listActiveSessions();
    const ports = NetworkDiagnosticsManager.getListeningPorts();
    const recentLogs = AuditLogger.getRecentLogs(100);
    const failedLogins = recentLogs.filter((l: any) => l.action.includes('login') && l.status === 'failure');

    // Calculate dynamic security posture score (0 to 100)
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
      securityWarnings: CapabilityDetector.getCached()?.securityWarnings || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/security/sessions', requirePermission('security:admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = AuthService.listActiveSessions();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/security/sessions/:id', requirePermission('security:admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const revoked = AuthService.revokeSession(req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session revoked successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/security/logs', requirePermission('security:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = AuditLogger.getRecentLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 20. Task Scheduler
// ----------------------------------------------------
apiRouter.get('/tasks', requirePermission('tasks:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(taskScheduler.getTasks());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/tasks', requirePermission('tasks:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = taskScheduler.createTask(req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id', requirePermission('tasks:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = taskScheduler.updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id', requirePermission('tasks:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = taskScheduler.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/:id/run', requirePermission('tasks:manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const outcome = await taskScheduler.executeTask(req.params.id);
    res.json(outcome);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 21. Media Server
// ----------------------------------------------------
apiRouter.get('/media/library', requirePermission('media:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const library = mediaManager.scanLibrary();
    res.json(library);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/media/stream', (req: Request, res: Response) => {
  try {
    const target = req.query.path as string;
    if (!target) return res.status(400).json({ error: 'Path required' });
    const abs = mediaManager.getAbsolutePath(target);
    if (!abs) return res.status(404).json({ error: 'Media file not found' });
    mediaManager.streamMedia(abs, req, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 22. Developer Tools
// ----------------------------------------------------
apiRouter.get('/devtools/git/status', requirePermission('devtools:use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await devToolsManager.getGitStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/devtools/git/pull', requirePermission('devtools:use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await devToolsManager.gitPull();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/devtools/file', requirePermission('devtools:use'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = req.query.path as string;
    if (!target) return res.status(400).json({ error: 'path query is required' });
    const content = devToolsManager.readConfigFile(target);
    res.json({ path: target, content });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/devtools/file', requirePermission('devtools:use'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { path: targetPath, content } = req.body;
    if (!targetPath || content === undefined) return res.status(400).json({ error: 'Path and content required' });
    devToolsManager.writeConfigFile(targetPath, content);
    res.json({ message: 'File saved' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 23. Module & Plugin Registry
// ----------------------------------------------------
apiRouter.get('/modules', requirePermission('system:read'), (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(pluginRegistry.getModules());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/modules/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    if (enabled === undefined) return res.status(400).json({ error: 'enabled boolean required' });
    const updated = pluginRegistry.setModuleEnabled(req.params.id, Boolean(enabled));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 24. User Management (RBAC)
// ----------------------------------------------------
apiRouter.get('/users', requirePermission('users:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = AuthService.listUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/users', requirePermission('users:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const created = AuthService.createUser({ username, password, email, role: role || 'standard_user' });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/users/:id', requirePermission('users:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id || '';
    AuthService.deleteUser(req.params.id, currentUserId);
    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/users/:id/role', requirePermission('users:manage'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const currentUserId = req.user?.id || '';
    const updated = AuthService.updateUserRole(req.params.id, role, currentUserId);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

