/**
 * AndroBase - Frontend Types
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServerStatusResponse {
  status: string;
  version: string;
  hasAdmin: boolean;
  profile: 'profile_a' | 'profile_b' | 'profile_c';
  profileName: string;
  dbStats: {
    tableCount: number;
    recordCount: number;
    sizeBytes: number;
  };
  storageStats: {
    totalFiles: number;
    totalSizeBytes: number;
  };
  network: {
    local: string;
    lan: string | null;
    allLanUrls: string[];
  };
  device: {
    arch: string;
    platform: string;
    osRelease: string;
    nodeVersion: string;
    isAndroid: boolean;
    isTermux: boolean;
    termuxVersion?: string;
    androidApiLevel?: number;
    cpuCores: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
    heapLimitMb: number;
    storage: {
      dataDir: string;
      writable: boolean;
      estimatedFreeMb: number;
    };
  };
  warnings: string[];
  uptimeSeconds: number;
}

export interface CompatibilityReport {
  timestamp: string;
  detectedProfile: 'profile_a' | 'profile_b' | 'profile_c';
  profileDetails: {
    id: string;
    name: string;
    targetTier: string;
    minRamMb: number;
    description: string;
    enabledFeatures: string[];
    disabledFeatures: string[];
  };
  device: ServerStatusResponse['device'];
  checks: {
    id: string;
    name: string;
    category: 'runtime' | 'hardware' | 'os' | 'storage' | 'network' | 'security';
    status: 'passed' | 'warning' | 'failed' | 'unsupported';
    value: string | number | boolean;
    message: string;
    critical: boolean;
  }[];
  securityWarnings: string[];
  recommendations: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member' | 'readonly';
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface StoredFile {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  sha256: string;
  description?: string;
}

export interface TableInfo {
  name: string;
  rowCount: number;
  schema: {
    name: string;
    primaryKey: string;
    createdAt: string;
    isSystem?: boolean;
    columns: {
      name: string;
      type: 'string' | 'number' | 'boolean' | 'json' | 'date';
      required?: boolean;
      unique?: boolean;
      default?: unknown;
    }[];
  };
}

export interface BackupItem {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  sha256: string;
  tablesCount: number;
  filesCount: number;
  version: string;
  profile: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  username?: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, unknown>;
}
