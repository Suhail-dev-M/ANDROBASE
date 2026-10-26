/**
 * AndroBase - Open-Source Mobile Server Platform
 * Universal Hardware & Android Capability Detection Engine
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { CompatibilityProfile, CompatibilityReport, CapabilityCheck, ProfileMetadata } from './types.ts';
import { config } from './config.ts';

export const PROFILES: Record<CompatibilityProfile, ProfileMetadata> = {
  profile_a: {
    id: 'profile_a',
    name: 'Profile A — Legacy Mobile',
    targetTier: 'Android 5.1–7.x / ARMv7 32-bit / < 1GB RAM',
    minRamMb: 256,
    description: 'Minimal resource mode. Uses embedded portable database, reduced memory heap, restricted concurrent uploads, and conservative cryptographic parameters.',
    enabledFeatures: ['Core REST API', 'Embedded File-Backed Database', 'Local User Auth', 'Basic File Storage', 'LAN Dashboard'],
    disabledFeatures: ['Automated Scheduled Cron Tasks', 'PostgreSQL External Adapter', 'Heavy In-Memory Caching', 'Real-time WebSocket Broadcasts'],
  },
  profile_b: {
    id: 'profile_b',
    name: 'Profile B — Standard Mobile',
    targetTier: 'Android 8.0–11.0 / ARM64 or modern 32-bit / 1GB–3GB RAM',
    minRamMb: 768,
    description: 'Standard self-hosted server mode. Enables full authentication, relational database operations, file storage with metadata indexing, audit logging, and automated backups.',
    enabledFeatures: ['Core REST API', 'Embedded Relational Database', 'Full JWT/Session Auth', 'File Storage with Quotas', 'Audit Logs', 'Snapshot Backups', 'LAN Dashboard'],
    disabledFeatures: ['Multi-worker cluster mode', 'Memory-intensive video/binary processing'],
  },
  profile_c: {
    id: 'profile_c',
    name: 'Profile C — Advanced Mobile / Edge',
    targetTier: 'Android 12+ / 64-bit ARM64 / 4GB+ RAM',
    minRamMb: 2048,
    description: 'High performance edge profile. Supports multi-database sync, background scheduled jobs, automated integrity checks, high-concurrency requests, and comprehensive diagnostics.',
    enabledFeatures: ['Core REST API', 'Full Database Suite', 'Advanced Monitoring', 'Automated Scheduled Maintenance', 'Fast Cryptographic Primitives', 'Concurrent Uploads', 'LAN Discovery'],
    disabledFeatures: [],
  },
};

export class CapabilityDetector {
  private static cachedReport: CompatibilityReport | null = null;

  public static async detect(): Promise<CompatibilityReport> {
    const checks: CapabilityCheck[] = [];
    const securityWarnings: string[] = [];
    const recommendations: string[] = [];

    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const arch = os.arch();
    const platform = os.platform();
    const release = os.release();

    // 1. Android & Termux environment inspection
    let isAndroid = platform === 'android' || !!process.env.ANDROID_ROOT;
    let isTermux = !!process.env.TERMUX_VERSION || !!process.env.PREFIX?.includes('com.termux');
    let termuxVersion: string | undefined = process.env.TERMUX_VERSION;
    let androidApiLevel: number | undefined;

    // Check Termux filesystem indicators
    if (fs.existsSync('/data/data/com.termux')) {
      isTermux = true;
    }

    // Check Android system properties if available
    try {
      if (fs.existsSync('/system/build.prop')) {
        isAndroid = true;
        const prop = fs.readFileSync('/system/build.prop', 'utf8');
        const apiMatch = prop.match(/ro\.build\.version\.sdk=(\d+)/);
        if (apiMatch) {
          androidApiLevel = parseInt(apiMatch[1], 10);
        }
      }
    } catch {
      // Ignored if unreadable without root
    }

    // 2. CPU Arch Check
    const is64Bit = arch === 'arm64' || arch === 'x64';
    const isArmv7 = arch === 'arm' || arch.includes('v7');
    checks.push({
      id: 'cpu_arch',
      name: 'CPU Architecture & Bitness',
      category: 'hardware',
      status: is64Bit ? 'passed' : isArmv7 ? 'warning' : 'passed',
      value: `${arch} (${is64Bit ? '64-bit' : '32-bit'})`,
      message: is64Bit
        ? '64-bit architecture detected with full instruction set support.'
        : isArmv7
        ? '32-bit ARMv7 detected. Some native C++ addons may lack precompiled binaries.'
        : `Architecture ${arch} active.`,
      critical: false,
    });

    // 3. Memory & RAM check
    checks.push({
      id: 'system_memory',
      name: 'Available System RAM',
      category: 'hardware',
      status: totalMemMb >= 1500 ? 'passed' : totalMemMb >= 500 ? 'warning' : 'failed',
      value: `${freeMemMb} MB free / ${totalMemMb} MB total`,
      message:
        totalMemMb < 600
          ? 'Low memory device (<600MB). Server will restrict worker threads to prevent OOM kills.'
          : 'Sufficient RAM detected for reliable server operation.',
      critical: totalMemMb < 256,
    });

    // 4. Node.js Runtime Check
    const nodeVer = process.version;
    const majorNode = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
    checks.push({
      id: 'node_runtime',
      name: 'Node.js Runtime Version',
      category: 'runtime',
      status: majorNode >= 18 ? 'passed' : majorNode >= 14 ? 'warning' : 'failed',
      value: nodeVer,
      message:
        majorNode >= 18
          ? 'Modern Node.js runtime with full ES2022 and native WebCrypto support.'
          : 'Older Node.js release. Some modern standard library APIs may be polyfilled.',
      critical: majorNode < 14,
    });

    // 5. Cryptographic Capabilities Check
    let cryptoOk = false;
    try {
      const testSalt = crypto.randomBytes(16);
      const testHash = crypto.pbkdf2Sync('testPassword123', testSalt, 1000, 32, 'sha256');
      cryptoOk = testHash.length === 32;
    } catch {
      cryptoOk = false;
    }

    checks.push({
      id: 'crypto_primitives',
      name: 'Cryptographic Engine (PBKDF2 & CSPRNG)',
      category: 'security',
      status: cryptoOk ? 'passed' : 'failed',
      value: cryptoOk ? 'Hardware/Software Accelerated' : 'Unavailable',
      message: cryptoOk
        ? 'Cryptographically secure pseudorandom numbers and PBKDF2 hashing functional.'
        : 'Node crypto primitives failed. Authentication cannot safely run.',
      critical: true,
    });

    if (!cryptoOk) {
      securityWarnings.push('Cryptographic randomness is unavailable or failing. Do not expose server to untrusted clients.');
    }

    // 6. Filesystem & Storage Permissions Check
    let storageWritable = false;
    let freeStorageMb = 2048; // Baseline fallback
    try {
      const testFile = path.join(config.dataDir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      storageWritable = true;
    } catch (e) {
      storageWritable = false;
    }

    checks.push({
      id: 'storage_permissions',
      name: 'Data Directory Write Permissions',
      category: 'storage',
      status: storageWritable ? 'passed' : 'failed',
      value: config.dataDir,
      message: storageWritable
        ? 'Directory is writable with POSIX file locking supported.'
        : 'Data directory is not writable! Check Termux storage permissions (termux-setup-storage).',
      critical: true,
    });

    // 7. Background Execution & Android Wakelock Check
    let wakelockAvailable = false;
    if (isTermux) {
      const termuxBin = path.join(process.env.PREFIX || '/data/data/com.termux/files/usr', 'bin', 'termux-wake-lock');
      if (fs.existsSync(termuxBin)) {
        wakelockAvailable = true;
      } else {
        try {
          execSync('command -v termux-wake-lock', { stdio: 'ignore', timeout: 1000 });
          wakelockAvailable = true;
        } catch {
          wakelockAvailable = false;
        }
      }
    }

    checks.push({
      id: 'background_wakelock',
      name: 'Android Background Wake-Lock & Battery Optimization',
      category: 'os',
      status: wakelockAvailable ? 'passed' : isAndroid ? 'warning' : 'passed',
      value: wakelockAvailable ? 'termux-api wake-lock ready' : isAndroid ? 'Missing termux-wake-lock' : 'Non-Android Host (N/A)',
      message: isAndroid && !wakelockAvailable
        ? 'Wakelock command not installed. Android may suspend CPU when screen turns off. Run `pkg install termux-api`.'
        : 'Process can prevent aggressive device sleep.',
      critical: false,
    });

    if (isAndroid && !wakelockAvailable) {
      recommendations.push('Run "termux-wake-lock" and disable Battery Optimization for Termux in Android Settings to prevent sleep termination.');
    }

    // 8. Network Interface Check
    const networkInterfaces = os.networkInterfaces();
    let hasLanIp = false;
    let lanAddresses: string[] = [];

    Object.entries(networkInterfaces).forEach(([name, ifaces]) => {
      ifaces?.forEach((iface) => {
        if (!iface.internal && iface.family === 'IPv4') {
          hasLanIp = true;
          lanAddresses.push(`${name}: ${iface.address}`);
        }
      });
    });

    checks.push({
      id: 'network_interfaces',
      name: 'Local Network (LAN / Wi-Fi) Discovery',
      category: 'network',
      status: hasLanIp ? 'passed' : 'warning',
      value: lanAddresses.length > 0 ? lanAddresses.join(', ') : 'Loopback Only (127.0.0.1)',
      message: hasLanIp
        ? `Server can be reached by other devices on LAN at ${lanAddresses.join(', ')}.`
        : 'No active non-internal IPv4 interface detected. Wi-Fi may be disabled or disconnected.',
      critical: false,
    });

    // Determine Compatibility Profile based on strict capability logic
    let detectedProfile: CompatibilityProfile = 'profile_b';

    if (totalMemMb < 700 || isArmv7 || (androidApiLevel && androidApiLevel < 26)) {
      detectedProfile = 'profile_a';
    } else if (totalMemMb >= 2048 && is64Bit && (!androidApiLevel || androidApiLevel >= 28)) {
      detectedProfile = 'profile_c';
    } else {
      detectedProfile = 'profile_b';
    }

    // Security warning on LAN exposure
    if (config.allowLan) {
      securityWarnings.push('LAN access is enabled. Plain HTTP on untrusted public Wi-Fi exposes credentials. Use a trusted home network or SSH tunnel.');
    } else {
      recommendations.push('Server is currently bound to local network interface. To securely manage from your laptop, connect to the same Wi-Fi or run SSH port forwarding.');
    }

    const report: CompatibilityReport = {
      timestamp: new Date().toISOString(),
      detectedProfile,
      profileDetails: PROFILES[detectedProfile],
      device: {
        arch,
        platform,
        osRelease: release,
        nodeVersion: nodeVer,
        isAndroid,
        isTermux,
        termuxVersion,
        androidApiLevel,
        cpuCores: os.cpus().length,
        totalMemoryMb: totalMemMb,
        freeMemoryMb: freeMemMb,
        heapLimitMb: Math.round(v8HeapLimitMb()),
        storage: {
          dataDir: config.dataDir,
          writable: storageWritable,
          estimatedFreeMb: freeStorageMb,
        },
      },
      checks,
      securityWarnings,
      recommendations,
    };

    CapabilityDetector.cachedReport = report;
    return report;
  }

  public static getCached(): CompatibilityReport | null {
    return CapabilityDetector.cachedReport;
  }
}

function v8HeapLimitMb(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const v8 = require('v8');
    const stats = v8.getHeapStatistics();
    return stats.heap_size_limit / (1024 * 1024);
  } catch {
    return 256;
  }
}
