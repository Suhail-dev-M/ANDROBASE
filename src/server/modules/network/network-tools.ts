/**
 * AndroBase - Complete Home Server Management Platform
 * Network Management & Connectivity Diagnostics
 * Features: Interface list, listening ports, DNS inspect, safe ping/dns diagnostics, VPN detection
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import dns from 'dns';
import fs from 'fs';
import { execSync } from 'child_process';
import { NetworkInterfaceInfo } from '../../types.ts';

export interface ListeningPortEntry {
  port: number;
  protocol: 'tcp' | 'udp';
  address: string;
  process?: string;
}

export class NetworkDiagnosticsManager {
  public static getInterfaces(): NetworkInterfaceInfo[] {
    const list: NetworkInterfaceInfo[] = [];
    const ifaces = os.networkInterfaces();

    for (const name in ifaces) {
      for (const iface of ifaces[name] || []) {
        let type: NetworkInterfaceInfo['type'] = 'unknown';
        if (iface.internal) {
          type = 'loopback';
        } else if (name.startsWith('wlan') || name.startsWith('wl')) {
          type = 'lan';
        } else if (name.startsWith('eth') || name.startsWith('en')) {
          type = 'lan';
        } else if (name.startsWith('rmnet') || name.startsWith('pdp')) {
          type = 'cellular';
        } else if (name.startsWith('ap') || name.startsWith('hotspot')) {
          type = 'hotspot';
        } else if (name.startsWith('tun') || name.startsWith('wg') || name.startsWith('tailscale')) {
          type = 'vpn';
        }

        list.push({
          name,
          address: iface.address,
          family: iface.family as 'IPv4' | 'IPv6',
          internal: iface.internal,
          type,
        });
      }
    }

    return list;
  }

  public static getListeningPorts(): ListeningPortEntry[] {
    const ports: ListeningPortEntry[] = [];

    // 1. Try ss (modern Linux)
    try {
      const out = execSync('ss -tulpn', { encoding: 'utf8', timeout: 1500 });
      const lines = out.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const proto = parts[0].toLowerCase().includes('udp') ? 'udp' : 'tcp';
          const localAddr = parts[4] || '';
          const portStr = localAddr.split(':').pop();
          const port = parseInt(portStr || '', 10);
          if (port && !ports.some((p) => p.port === port && p.protocol === proto)) {
            ports.push({
              port,
              protocol: proto,
              address: localAddr,
              process: parts[6] || undefined,
            });
          }
        }
      }
      if (ports.length > 0) return ports;
    } catch {}

    // 2. Try netstat
    try {
      const out = execSync('netstat -tlpn', { encoding: 'utf8', timeout: 1500 });
      const lines = out.trim().split('\n').slice(2);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const localAddr = parts[3] || '';
          const portStr = localAddr.split(':').pop();
          const port = parseInt(portStr || '', 10);
          if (port && !ports.some((p) => p.port === port)) {
            ports.push({
              port,
              protocol: 'tcp',
              address: localAddr,
              process: parts[6] || undefined,
            });
          }
        }
      }
      if (ports.length > 0) return ports;
    } catch {}

    // 3. Fallback: inspect /proc/net/tcp
    try {
      if (fs.existsSync('/proc/net/tcp')) {
        const content = fs.readFileSync('/proc/net/tcp', 'utf8');
        const lines = content.trim().split('\n').slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          // State 0A is LISTEN
          if (parts[3] === '0A' && parts[1]) {
            const hexPort = parts[1].split(':')[1];
            const port = parseInt(hexPort, 16);
            if (port && !ports.some((p) => p.port === port)) {
              ports.push({
                port,
                protocol: 'tcp',
                address: `0.0.0.0:${port}`,
              });
            }
          }
        }
      }
    } catch {}

    return ports;
  }

  public static getDnsServers(): string[] {
    try {
      if (fs.existsSync('/etc/resolv.conf')) {
        const lines = fs.readFileSync('/etc/resolv.conf', 'utf8').split('\n');
        const servers: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('nameserver')) {
            const ip = trimmed.split(/\s+/)[1];
            if (ip) servers.push(ip);
          }
        }
        if (servers.length > 0) return servers;
      }
    } catch {}

    return ['8.8.8.8', '1.1.1.1'];
  }

  public static async executePing(host: string): Promise<{ host: string; alive: boolean; timeMs?: number; output: string }> {
    // Strict input validation to prevent command injection
    const cleanHost = host.trim();
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanHost)) {
      throw new Error('Invalid host format. Must be a valid hostname or IP address.');
    }

    try {
      const out = execSync(`ping -c 2 -W 2 "${cleanHost}"`, { encoding: 'utf8', timeout: 5000 });
      const timeMatch = out.match(/time=([0-9.]+)\s*ms/);
      const timeMs = timeMatch ? parseFloat(timeMatch[1]) : undefined;

      return {
        host: cleanHost,
        alive: true,
        timeMs,
        output: out,
      };
    } catch (err: any) {
      return {
        host: cleanHost,
        alive: false,
        output: err.stdout || err.message || 'Host unreachable or ping timed out.',
      };
    }
  }

  public static async pingHost(host: string): Promise<{ host: string; alive: boolean; timeMs?: number; output: string }> {
    return this.executePing(host);
  }

  public static async resolveDns(domain: string): Promise<{ domain: string; addresses: string[]; lookupTimeMs: number }> {
    const cleanDomain = domain.trim();
    if (!/^[a-zA-Z0-9.-]+$/.test(cleanDomain)) {
      throw new Error('Invalid domain format.');
    }

    const start = performance.now();
    try {
      const records = await dns.promises.resolve4(cleanDomain);
      const duration = Math.round(performance.now() - start);
      return {
        domain: cleanDomain,
        addresses: records,
        lookupTimeMs: duration,
      };
    } catch (err: any) {
      throw new Error(`DNS lookup failed for ${cleanDomain}: ${err.code || err.message}`);
    }
  }

  public static getVpnStatus(): { tailscale: boolean; wireguard: boolean } {
    let tailscale = false;
    let wireguard = false;

    try {
      const ifaces = os.networkInterfaces();
      for (const name in ifaces) {
        if (name.includes('tailscale')) tailscale = true;
        if (name.includes('wg')) wireguard = true;
      }
    } catch {}

    return { tailscale, wireguard };
  }
}
