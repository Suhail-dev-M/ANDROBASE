import * as fs from 'fs';
import * as path from 'path';
import { ServerModuleDefinition } from '../../types';

export class PluginRegistry {
  private registryFile: string;
  private modules: Map<string, ServerModuleDefinition> = new Map();

  constructor(dataDir: string) {
    this.registryFile = path.join(dataDir, 'modules_registry.json');
    this.initDefaultModules();
    this.loadState();
  }

  private initDefaultModules() {
    const defaultModules: ServerModuleDefinition[] = [
      {
        id: 'dashboard',
        name: 'System Dashboard',
        description: 'Real-time telemetry, hardware metrics, storage & load monitoring',
        version: '2.0.0',
        enabled: true,
        isCore: true,
        icon: 'Activity',
        category: 'core'
      },
      {
        id: 'files',
        name: 'File Manager',
        description: 'Sandboxed directory navigation, multi-file uploads, text editor and previews',
        version: '2.0.0',
        enabled: true,
        isCore: true,
        icon: 'Folder',
        category: 'core'
      },
      {
        id: 'apps',
        name: 'App & Web Hosting',
        description: 'Manage and supervise Node.js, Python, PHP and static web applications',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Layers',
        category: 'infrastructure'
      },
      {
        id: 'databases',
        name: 'Database Hub',
        description: 'PostgreSQL, MySQL, SQLite and Embedded WAL DB console and query manager',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Database',
        category: 'infrastructure'
      },
      {
        id: 'docker',
        name: 'Docker Containers',
        description: 'Container lifecycle, image inspection, logs and compose project manager',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Box',
        category: 'infrastructure'
      },
      {
        id: 'network',
        name: 'Network Diagnostics',
        description: 'Interface telemetry, listening ports, DNS resolution and latency ping tests',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Wifi',
        category: 'tools'
      },
      {
        id: 'processes',
        name: 'Process & Services',
        description: 'Host processes with CPU/memory usage, kill safeguards and systemd/Termux service control',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Cpu',
        category: 'management'
      },
      {
        id: 'security',
        name: 'Security Centre',
        description: 'Brute-force protection, active session manager, audit logs and posture score',
        version: '2.0.0',
        enabled: true,
        isCore: true,
        icon: 'Shield',
        category: 'core'
      },
      {
        id: 'tasks',
        name: 'Task Scheduler',
        description: 'Cron-like maintenance tasks, automated snapshot runs and execution logs',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Clock',
        category: 'management'
      },
      {
        id: 'media',
        name: 'Media Server',
        description: 'Audio, video and photo streaming with HTTP 206 Range seeking',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Film',
        category: 'tools'
      },
      {
        id: 'devtools',
        name: 'Developer Tools',
        description: 'Git repository status, pull operations, log inspector and configuration editor',
        version: '2.0.0',
        enabled: true,
        isCore: false,
        icon: 'Terminal',
        category: 'tools'
      },
      {
        id: 'backups',
        name: 'Backup & Recovery',
        description: 'Full database, application and configuration archive exports and restoration',
        version: '2.0.0',
        enabled: true,
        isCore: true,
        icon: 'Archive',
        category: 'management'
      }
    ];

    defaultModules.forEach((m) => this.modules.set(m.id, m));
  }

  private loadState() {
    try {
      if (fs.existsSync(this.registryFile)) {
        const raw = fs.readFileSync(this.registryFile, 'utf8');
        const saved: Record<string, boolean> = JSON.parse(raw);
        for (const [id, enabled] of Object.entries(saved)) {
          const mod = this.modules.get(id);
          if (mod && !mod.isCore) {
            mod.enabled = enabled;
          }
        }
      }
    } catch {
      // Fallback to defaults
    }
  }

  private saveState() {
    try {
      const state: Record<string, boolean> = {};
      for (const [id, mod] of this.modules.entries()) {
        state[id] = mod.enabled;
      }
      fs.writeFileSync(this.registryFile, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // Fallback
    }
  }

  public getModules(): ServerModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  public isEnabled(id: string): boolean {
    const mod = this.modules.get(id);
    return mod ? mod.enabled : false;
  }

  public setModuleEnabled(id: string, enabled: boolean): ServerModuleDefinition {
    const mod = this.modules.get(id);
    if (!mod) throw new Error('Module not found');
    if (mod.isCore && !enabled) {
      throw new Error('Core system modules cannot be disabled');
    }
    mod.enabled = enabled;
    this.modules.set(id, mod);
    this.saveState();
    return mod;
  }
}
