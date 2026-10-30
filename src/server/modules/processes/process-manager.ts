/**
 * AndroBase - Complete Home Server Management Platform
 * Process & Service Management Subsystem
 * Features: Process inspection, memory/CPU tracking, service control, termination protection
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';
import os from 'os';
import { RunningProcessItem, SystemServiceItem } from '../../types.ts';
import { AuditLogger } from '../../audit/logger.ts';

export class ProcessSubsystemManager {
  public static listProcesses(maxCount: number = 60): RunningProcessItem[] {
    const list: RunningProcessItem[] = [];

    // 1. Try ps aux
    try {
      const out = execSync('ps aux', { encoding: 'utf8', timeout: 2000 });
      const lines = out.trim().split('\n').slice(1);

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const user = parts[0];
          const pid = parseInt(parts[1], 10);
          const cpuPercent = parseFloat(parts[2]) || 0;
          const memPercent = parseFloat(parts[3]) || 0;
          const rssKb = parseInt(parts[5], 10) || 0;
          const command = parts.slice(10).join(' ');

          if (pid) {
            list.push({
              pid,
              name: pathBase(parts[10]) || command.split(' ')[0],
              cpuPercent,
              memoryMb: Math.round(rssKb / 1024),
              user,
              command,
            });
          }
        }
      }

      // Sort by CPU usage descending
      list.sort((a, b) => b.cpuPercent - a.cpuPercent);
      return list.slice(0, maxCount);
    } catch {
      // 2. Fallback: ps -ef on minimal Android Termux
      try {
        const out = execSync('ps -ef', { encoding: 'utf8', timeout: 2000 });
        const lines = out.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 8) {
            const pid = parseInt(parts[1], 10);
            const user = parts[0];
            const command = parts.slice(7).join(' ');
            if (pid) {
              list.push({
                pid,
                name: command.split(' ')[0],
                cpuPercent: 0,
                memoryMb: 0,
                user,
                command,
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

  public static killProcess(pid: number, username: string = 'system'): void {
    if (pid <= 1) {
      throw new Error('Access denied: System init (PID 1) cannot be terminated.');
    }
    if (pid === process.pid) {
      throw new Error('Access denied: Cannot terminate the active Home Server process.');
    }

    try {
      process.kill(pid, 'SIGTERM');
      AuditLogger.log({
        action: 'process.killed',
        username,
        status: 'success',
        details: { pid },
      });
    } catch (err: any) {
      throw new Error(`Failed to terminate process ${pid}: ${err.message}`);
    }
  }

  public static listServices(): SystemServiceItem[] {
    const services: SystemServiceItem[] = [];

    // 1. Check systemctl if running under full Linux with systemd
    if (commandExists('systemctl')) {
      try {
        const out = execSync('systemctl list-units --type=service --state=running,failed --no-pager --no-legend', {
          encoding: 'utf8',
          timeout: 2000,
        });
        const lines = out.trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          const name = parts[0]?.replace('.service', '') || '';
          const active = parts[2] === 'active';
          const failed = parts[3] === 'failed';

          services.push({
            name,
            description: parts.slice(4).join(' '),
            type: 'systemd',
            status: failed ? 'failed' : active ? 'active' : 'inactive',
            enabled: true,
            canControl: true,
          });
        }
        if (services.length > 0) return services.slice(0, 30);
      } catch {}
    }

    // 2. Check Termux services (sv)
    if (commandExists('sv')) {
      try {
        const out = execSync('sv status /data/data/com.termux/files/usr/var/service/*', {
          encoding: 'utf8',
          timeout: 1500,
        });
        const lines = out.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const status = parts[0] === 'run:' ? 'active' : 'inactive';
          const name = parts[1]?.split('/').pop() || 'service';
          services.push({
            name,
            description: `Termux service: ${name}`,
            type: 'termux_sv',
            status,
            enabled: status === 'active',
            canControl: true,
          });
        }
        if (services.length > 0) return services;
      } catch {}
    }

    // 3. Fallback: Core server services
    return [
      {
        name: 'androbase-server',
        description: 'Core Home Server Management Engine & Web API',
        type: 'managed_app',
        status: 'active',
        enabled: true,
        canControl: false,
      },
      {
        name: 'androbase-metrics',
        description: 'Real-Time Resource Telemetry & Health Monitor',
        type: 'managed_app',
        status: 'active',
        enabled: true,
        canControl: false,
      },
      {
        name: 'androbase-backup',
        description: 'Automatic Snapshot & WAL Journaling Service',
        type: 'managed_app',
        status: 'active',
        enabled: true,
        canControl: false,
      },
    ];
  }

  public static controlService(serviceName: string, action: 'start' | 'stop' | 'restart', username: string = 'system'): void {
    const cleanName = serviceName.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!cleanName) throw new Error('Invalid service name.');

    if (commandExists('systemctl')) {
      execSync(`systemctl ${action} "${cleanName}"`, { encoding: 'utf8', timeout: 5000 });
    } else if (commandExists('sv')) {
      execSync(`sv ${action} "${cleanName}"`, { encoding: 'utf8', timeout: 5000 });
    } else {
      throw new Error(`Direct service control not supported on this platform.`);
    }

    AuditLogger.log({
      action: `service.${action}`,
      username,
      status: 'success',
      details: { service: cleanName },
    });
  }
}

function pathBase(p: string): string {
  return p.split('/').pop() || p;
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}
