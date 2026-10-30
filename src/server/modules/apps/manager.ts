/**
 * AndroBase - Complete Home Server Management Platform
 * Application & Web Hosting Manager
 * Features: Deploy, manage, start, stop, restart Node.js, Python, PHP, Static, and Custom processes
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../../db/portable-db.ts';
import { config } from '../../config.ts';
import { HostedAppRecord, HostedAppType, HostedAppStatus } from '../../types.ts';
import { AuditLogger } from '../../audit/logger.ts';
import { generateUUID } from '../../utils/id.ts';

const APPS_TABLE = '_hosted_apps';
const APPS_BASE_DIR = path.join(config.dataDir, 'apps');
const APPS_LOGS_DIR = path.join(config.dataDir, 'logs', 'apps');

// In-memory running process handles: appId -> ChildProcess
const runningProcesses: Map<string, ChildProcess> = new Map();

export class AppHostingManager {
  public static async initialize(): Promise<void> {
    // Ensure apps directory and logs exist
    [APPS_BASE_DIR, APPS_LOGS_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    });

    // Ensure schema exists in portable db
    db.ensureTable({
      name: APPS_TABLE,
      primaryKey: 'id',
      isSystem: true,
      createdAt: new Date().toISOString(),
      columns: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'name', type: 'string', required: true, unique: true },
        { name: 'type', type: 'string', required: true },
        { name: 'directoryPath', type: 'string', required: true },
        { name: 'entryPoint', type: 'string', required: true },
        { name: 'port', type: 'number', required: true },
        { name: 'env', type: 'json' },
        { name: 'autoStart', type: 'boolean' },
        { name: 'status', type: 'string', required: true },
        { name: 'pid', type: 'number' },
        { name: 'createdAt', type: 'date', required: true },
        { name: 'updatedAt', type: 'date', required: true },
        { name: 'restartCount', type: 'number' },
        { name: 'lastError', type: 'string' },
      ],
    });

    // Auto-start apps that have autoStart: true
    const apps = this.listApps();
    for (const app of apps) {
      if (app.autoStart && app.status !== 'stopped') {
        try {
          console.log(`[AppHosting] Auto-starting application "${app.name}"...`);
          await this.startApp(app.id, 'system');
        } catch (err: any) {
          console.error(`[AppHosting] Failed to auto-start "${app.name}":`, err.message);
        }
      } else if (app.status === 'running') {
        // Reset stale running status on reboot
        db.update<HostedAppRecord>(APPS_TABLE, app.id, {
          status: 'stopped',
          pid: undefined,
        });
      }
    }
  }

  public static listApps(): HostedAppRecord[] {
    const list = db.query<HostedAppRecord>(APPS_TABLE).data;
    // Verify running PIDs are genuinely alive
    return list.map((app) => {
      if (app.status === 'running' && app.pid) {
        try {
          // Sending signal 0 tests process existence
          process.kill(app.pid, 0);
        } catch {
          app.status = 'stopped';
          app.pid = undefined;
          db.update(APPS_TABLE, app.id, { status: 'stopped', pid: undefined });
        }
      }
      return app;
    });
  }

  public static getApp(id: string): HostedAppRecord | null {
    return db.findById<HostedAppRecord>(APPS_TABLE, id);
  }

  public static createApp(params: {
    name: string;
    type: HostedAppType;
    entryPoint: string;
    port: number;
    env?: Record<string, string>;
    autoStart?: boolean;
    directoryPath?: string;
  }, username: string = 'system'): HostedAppRecord {
    const cleanName = params.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanName) throw new Error('Invalid application name. Must contain alphanumeric characters, hyphens, or underscores.');

    const existing = db.query<HostedAppRecord>(APPS_TABLE, {
      filters: [{ field: 'name', operator: 'eq', value: cleanName }],
    });
    if (existing.total > 0) throw new Error(`Application "${cleanName}" already exists.`);

    if (params.port < 1024 || params.port > 65535) {
      throw new Error('Port must be a non-privileged user port between 1024 and 65535.');
    }

    // Check port conflict with server itself
    if (params.port === config.port) {
      throw new Error(`Port ${params.port} is reserved by the main server.`);
    }

    const appDir = path.join(APPS_BASE_DIR, cleanName);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true, mode: 0o700 });
    }

    // Create a starter template if empty
    this.createStarterTemplate(appDir, params.type, params.entryPoint, params.port);

    const id = generateUUID();
    const app: HostedAppRecord = {
      id,
      name: cleanName,
      type: params.type,
      directoryPath: path.relative(config.dataDir, appDir),
      entryPoint: params.entryPoint || this.getDefaultEntryPoint(params.type),
      port: params.port,
      env: params.env || {},
      autoStart: !!params.autoStart,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restartCount: 0,
    };

    db.insert<HostedAppRecord>(APPS_TABLE, app);
    AuditLogger.log({
      action: 'apps.created',
      username,
      status: 'success',
      details: { name: app.name, type: app.type, port: app.port },
    });

    return app;
  }

  public static async startApp(id: string, username: string = 'system'): Promise<HostedAppRecord> {
    const app = this.getApp(id);
    if (!app) throw new Error('Application not found.');

    if (app.status === 'running' && app.pid) {
      try {
        process.kill(app.pid, 0);
        return app; // Already running
      } catch {
        // Stale process, proceed with launch
      }
    }

    const absDir = path.resolve(config.dataDir, app.directoryPath);
    if (!fs.existsSync(absDir)) {
      throw new Error(`Application working directory does not exist: ${app.directoryPath}`);
    }

    const logFilePath = path.join(APPS_LOGS_DIR, `${app.id}.log`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const launchCommand = this.buildLaunchCommand(app);
    const env = {
      ...process.env,
      PORT: String(app.port),
      NODE_ENV: 'production',
      ...app.env,
    };

    const child = spawn(launchCommand.command, launchCommand.args, {
      cwd: absDir,
      env,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    child.on('error', (err) => {
      console.error(`[AppHosting] App "${app.name}" process error:`, err);
      db.update<HostedAppRecord>(APPS_TABLE, app.id, {
        status: 'failed',
        lastError: err.message,
        pid: undefined,
      });
      runningProcesses.delete(app.id);
    });

    child.on('exit', (code, signal) => {
      console.log(`[AppHosting] App "${app.name}" exited with code ${code}, signal: ${signal}`);
      runningProcesses.delete(app.id);
      db.update<HostedAppRecord>(APPS_TABLE, app.id, {
        status: code === 0 ? 'stopped' : 'failed',
        pid: undefined,
        lastError: code !== 0 ? `Process exited with exit code ${code}` : undefined,
      });
    });

    if (child.pid) {
      runningProcesses.set(app.id, child);
      const updated = db.update<HostedAppRecord>(APPS_TABLE, app.id, {
        status: 'running',
        pid: child.pid,
        lastError: undefined,
        updatedAt: new Date().toISOString(),
      });

      AuditLogger.log({
        action: 'apps.started',
        username,
        status: 'success',
        details: { name: app.name, pid: child.pid },
      });

      return updated;
    }

    throw new Error('Failed to spawn child process.');
  }

  public static async stopApp(id: string, username: string = 'system'): Promise<HostedAppRecord> {
    const app = this.getApp(id);
    if (!app) throw new Error('Application not found.');

    const child = runningProcesses.get(id);
    if (child && child.pid) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Fallback kill
        try { child.kill('SIGKILL'); } catch {}
      }
      runningProcesses.delete(id);
    } else if (app.pid) {
      try {
        process.kill(app.pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
    }

    const updated = db.update<HostedAppRecord>(APPS_TABLE, app.id, {
      status: 'stopped',
      pid: undefined,
      updatedAt: new Date().toISOString(),
    });

    AuditLogger.log({
      action: 'apps.stopped',
      username,
      status: 'success',
      details: { name: app.name },
    });

    return updated;
  }

  public static async restartApp(id: string, username: string = 'system'): Promise<HostedAppRecord> {
    const app = this.getApp(id);
    if (!app) throw new Error('Application not found.');

    await this.stopApp(id, username);
    // Short wait for socket to release
    await new Promise((resolve) => setTimeout(resolve, 800));
    db.update<HostedAppRecord>(APPS_TABLE, id, {
      restartCount: (app.restartCount || 0) + 1,
    });
    return this.startApp(id, username);
  }

  public static deleteApp(id: string, username: string = 'system'): void {
    const app = this.getApp(id);
    if (!app) throw new Error('Application not found.');

    if (app.status === 'running') {
      try {
        this.stopApp(id, username);
      } catch {}
    }

    db.delete(APPS_TABLE, id);
    AuditLogger.log({
      action: 'apps.deleted',
      username,
      status: 'success',
      details: { name: app.name },
    });
  }

  public static updateApp(id: string, updates: Partial<HostedAppRecord>): HostedAppRecord {
    const app = this.getApp(id);
    if (!app) throw new Error('Application not found.');

    const updated = db.update<HostedAppRecord>(APPS_TABLE, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return updated;
  }

  public static getAppLogs(id: string, maxLines: number = 200): string {
    const logFilePath = path.join(APPS_LOGS_DIR, `${id}.log`);
    if (!fs.existsSync(logFilePath)) {
      return 'No logs recorded yet. Start the application to begin capturing runtime output.\n';
    }

    try {
      const content = fs.readFileSync(logFilePath, 'utf8');
      const lines = content.split('\n');
      return lines.slice(-maxLines).join('\n');
    } catch (err: any) {
      return `Failed to read application log file: ${err.message}`;
    }
  }

  public static getLogs(id: string, maxLines: number = 200): string[] {
    const raw = this.getAppLogs(id, maxLines);
    return raw.split('\n').filter(Boolean);
  }

  private static buildLaunchCommand(app: HostedAppRecord): { command: string; args: string[] } {
    switch (app.type) {
      case 'node':
        return { command: 'node', args: [app.entryPoint] };
      case 'python':
        const pyCmd = commandExists('python3') ? 'python3' : 'python';
        return { command: pyCmd, args: [app.entryPoint] };
      case 'php':
        return { command: 'php', args: ['-S', `0.0.0.0:${app.port}`, app.entryPoint] };
      case 'static':
        // Lightweight built-in static server runner using Node.js
        return {
          command: 'node',
          args: [
            '-e',
            `const http = require('http'); const fs = require('fs'); const path = require('path'); const p = ${app.port}; const dir = process.cwd(); http.createServer((q, r) => { let f = path.join(dir, q.url === '/' ? 'index.html' : q.url); if (!fs.existsSync(f)) { r.writeHead(404); r.end('404 Not Found'); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(p, '0.0.0.0', () => console.log('Static server listening on port ' + p));`,
          ],
        };
      case 'custom':
      default:
        const parts = app.entryPoint.trim().split(/\s+/);
        return { command: parts[0], args: parts.slice(1) };
    }
  }

  private static getDefaultEntryPoint(type: HostedAppType): string {
    switch (type) {
      case 'node': return 'index.js';
      case 'python': return 'app.py';
      case 'php': return 'index.php';
      case 'static': return 'index.html';
      default: return 'start.sh';
    }
  }

  private static createStarterTemplate(dir: string, type: HostedAppType, entryPoint: string, port: number): void {
    const ep = entryPoint || this.getDefaultEntryPoint(type);
    const targetFile = path.join(dir, ep);
    if (fs.existsSync(targetFile)) return;

    if (type === 'node') {
      fs.writeFileSync(
        targetFile,
        `// AndroBase Node.js Hosted Application\nconst http = require('http');\nconst port = process.env.PORT || ${port};\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({\n    message: 'Hello from AndroBase Hosted Node App!',\n    time: new Date().toISOString(),\n    url: req.url,\n    port\n  }));\n});\n\nserver.listen(port, '0.0.0.0', () => {\n  console.log('Server running at http://0.0.0.0:' + port);\n});\n`,
        { encoding: 'utf8', mode: 0o600 }
      );
    } else if (type === 'python') {
      fs.writeFileSync(
        targetFile,
        `# AndroBase Python Hosted Application\nimport os\nfrom http.server import SimpleHTTPRequestHandler, HTTPServer\n\nport = int(os.environ.get('PORT', ${port}))\nserver = HTTPServer(('0.0.0.0', port), SimpleHTTPRequestHandler)\nprint(f"Python server running on port {port}...")\nserver.serve_forever()\n`,
        { encoding: 'utf8', mode: 0o600 }
      );
    } else if (type === 'static') {
      fs.writeFileSync(
        targetFile,
        `<!DOCTYPE html>\n<html>\n<head>\n  <title>Hosted on AndroBase</title>\n  <style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center; }</style>\n</head>\n<body>\n  <h1>Welcome to your AndroBase Static Site</h1>\n  <p>Edit this file in the File Manager under apps directory.</p>\n</body>\n</html>\n`,
        { encoding: 'utf8', mode: 0o600 }
      );
    }
  }
}

function commandExists(cmd: string): boolean {
  try {
    const { execSync } = require('child_process');
    execSync(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}
