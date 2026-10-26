/**
 * AndroBase - Open-Source Mobile Server Platform
 * Network Discovery, Interface Inspector & SSH Tunnel Helper
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import { NetworkInterfaceInfo } from '../types.ts';
import { config } from '../config.ts';

export class NetworkManager {
  public static getInterfaces(): NetworkInterfaceInfo[] {
    const osInterfaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];

    Object.entries(osInterfaces).forEach(([name, ifaces]) => {
      if (!ifaces) return;
      ifaces.forEach((iface) => {
        let type: NetworkInterfaceInfo['type'] = 'unknown';

        if (iface.internal) {
          type = 'loopback';
        } else if (name.startsWith('wlan') || name.startsWith('wifi') || name.startsWith('en') || name.startsWith('wl')) {
          type = 'lan';
        } else if (name.startsWith('rmnet') || name.startsWith('ccmni') || name.startsWith('pdp')) {
          type = 'cellular';
        } else if (name.startsWith('ap') || name.startsWith('tether') || iface.address.startsWith('192.168.43.')) {
          type = 'hotspot';
        } else if (name.startsWith('tun') || name.startsWith('tap') || name.startsWith('wg')) {
          type = 'vpn';
        }

        result.push({
          name,
          address: iface.address,
          family: iface.family as 'IPv4' | 'IPv6',
          internal: iface.internal,
          type,
        });
      });
    });

    return result;
  }

  public static getPrimaryLanIp(): string | null {
    const interfaces = this.getInterfaces();
    // Prioritize Wi-Fi or Hotspot IPv4
    const lan = interfaces.find((i) => !i.internal && i.family === 'IPv4' && (i.type === 'lan' || i.type === 'hotspot'));
    if (lan) return lan.address;

    // Any non-internal IPv4
    const anyIpv4 = interfaces.find((i) => !i.internal && i.family === 'IPv4');
    return anyIpv4 ? anyIpv4.address : null;
  }

  public static getAccessUrls(): { local: string; lan: string | null; allLanUrls: string[] } {
    const port = config.port;
    const local = `http://127.0.0.1:${port}`;
    const primaryLan = this.getPrimaryLanIp();
    const interfaces = this.getInterfaces();

    const allLanUrls: string[] = interfaces
      .filter((i) => !i.internal && i.family === 'IPv4')
      .map((i) => `http://${i.address}:${port}`);

    return {
      local,
      lan: primaryLan ? `http://${primaryLan}:${port}` : null,
      allLanUrls,
    };
  }

  public static getSshTunnelCommand(termuxPort: number = 8022, appPort: number = config.port): {
    commandLinuxMac: string;
    commandWindowsPowershell: string;
    explanation: string;
  } {
    const lanIp = this.getPrimaryLanIp() || '<PHONE_WIFI_IP>';
    return {
      commandLinuxMac: `ssh -N -L ${appPort}:localhost:${appPort} -p ${termuxPort} u0_a... @${lanIp}`,
      commandWindowsPowershell: `ssh -N -L ${appPort}:localhost:${appPort} -p ${termuxPort} <user>@${lanIp}`,
      explanation:
        'SSH Port Forwarding tunnels port 3000 securely over SSH. This allows you to open http://localhost:3000 in your laptop browser even when the phone server is bound to loopback only, keeping your traffic encrypted across untrusted networks.',
    };
  }
}
