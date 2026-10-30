/**
 * AndroBase - Complete Home Server Management Platform
 * Docker & Container Management Subsystem
 * Features: Daemon availability detection, container inspect/start/stop/logs, graceful degradation
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { DockerHostStatus, DockerContainerItem } from '../../types.ts';
import { AuditLogger } from '../../audit/logger.ts';

export class DockerSubsystemManager {
  public static getStatus(): DockerHostStatus {
    const hasDockerCmd = commandExists('docker');
    if (!hasDockerCmd) {
      return {
        isInstalled: false,
        isAvailable: false,
        message: 'Docker CLI is not installed on this device. Native process and application hosting are fully active.',
      };
    }

    try {
      const out = execSync('docker info --format "{{.ServerVersion}}|{{.Containers}}|{{.ContainersRunning}}|{{.Images}}"', {
        encoding: 'utf8',
        timeout: 2500,
      });

      const parts = out.trim().split('|');
      return {
        isInstalled: true,
        isAvailable: true,
        version: parts[0] || 'Unknown',
        containersTotal: parseInt(parts[1], 10) || 0,
        containersRunning: parseInt(parts[2], 10) || 0,
        imagesTotal: parseInt(parts[3], 10) || 0,
        message: 'Docker engine is running and operational.',
      };
    } catch (err: any) {
      return {
        isInstalled: true,
        isAvailable: false,
        message: 'Docker CLI is installed, but the Docker daemon is not active (check dockerd / systemctl status docker).',
      };
    }
  }

  public static listContainers(): DockerContainerItem[] {
    const status = this.getStatus();
    if (!status.isAvailable) return [];

    try {
      const cmd = 'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Status}}\t{{.CreatedAt}}\t{{.Ports}}\t{{.Command}}"';
      const output = execSync(cmd, { encoding: 'utf8', timeout: 3000 });
      const lines = output.trim().split('\n');

      const items: DockerContainerItem[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const [id, name, image, state, statusStr, created, portsStr, command] = line.split('\t');
        items.push({
          id: id || '',
          name: name || '',
          image: image || '',
          state: (state as any) || 'exited',
          status: statusStr || '',
          created: created || '',
          ports: portsStr ? portsStr.split(',').map((p) => p.trim()) : [],
          command: command || '',
        });
      }

      return items;
    } catch {
      return [];
    }
  }

  public static controlContainer(containerId: string, action: 'start' | 'stop' | 'restart', username: string = 'system'): void {
    const status = this.getStatus();
    if (!status.isAvailable) throw new Error('Docker daemon is not available on this host.');

    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) throw new Error('Invalid container identifier.');

    execSync(`docker ${action} "${cleanId}"`, { encoding: 'utf8', timeout: 8000 });
    AuditLogger.log({
      action: `docker.${action}`,
      username,
      status: 'success',
      details: { containerId: cleanId },
    });
  }

  public static startContainer(containerId: string, username: string = 'system'): void {
    this.controlContainer(containerId, 'start', username);
  }

  public static stopContainer(containerId: string, username: string = 'system'): void {
    this.controlContainer(containerId, 'stop', username);
  }

  public static restartContainer(containerId: string, username: string = 'system'): void {
    this.controlContainer(containerId, 'restart', username);
  }

  public static getContainerLogs(containerId: string, linesCount: number = 100): string {
    const status = this.getStatus();
    if (!status.isAvailable) return 'Docker daemon is not available on this host.';

    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) throw new Error('Invalid container identifier.');

    try {
      return execSync(`docker logs --tail ${linesCount} "${cleanId}" 2>&1`, {
        encoding: 'utf8',
        timeout: 4000,
      });
    } catch (err: any) {
      return `Failed to read container logs: ${err.message}`;
    }
  }

  public static removeContainer(containerId: string, username: string = 'system'): void {
    const status = this.getStatus();
    if (!status.isAvailable) throw new Error('Docker daemon is not available.');

    const cleanId = containerId.replace(/[^a-zA-Z0-9_-]/g, '');
    execSync(`docker rm -f "${cleanId}"`, { encoding: 'utf8', timeout: 5000 });

    AuditLogger.log({
      action: 'docker.remove',
      username,
      status: 'success',
      details: { containerId: cleanId },
    });
  }
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}
