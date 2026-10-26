/**
 * AndroBase - Open-Source Mobile Server Platform
 * Core Type Definitions
 * SPDX-License-Identifier: Apache-2.0
 */

export type CompatibilityProfile = 'profile_a' | 'profile_b' | 'profile_c';

export interface ProfileMetadata {
  id: CompatibilityProfile;
  name: string;
  targetTier: string;
  minRamMb: number;
  description: string;
  enabledFeatures: string[];
  disabledFeatures: string[];
}

export interface CapabilityCheck {
  id: string;
  name: string;
  category: 'runtime' | 'hardware' | 'os' | 'storage' | 'network' | 'security';
  status: 'passed' | 'warning' | 'failed' | 'unsupported';
  value: string | number | boolean;
  message: string;
  critical: boolean;
}

export interface CompatibilityReport {
  timestamp: string;
  detectedProfile: CompatibilityProfile;
  profileDetails: ProfileMetadata;
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
  checks: CapabilityCheck[];
  securityWarnings: string[];
  recommendations: string[];
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'member' | 'readonly';
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  ip: string;
  userAgent: string;
}

export interface StoredFileRecord {
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

export interface AuditLogEntry {
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

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  sha256: string;
  tablesCount: number;
  filesCount: number;
  version: string;
  profile: CompatibilityProfile;
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
  type: 'lan' | 'loopback' | 'cellular' | 'hotspot' | 'vpn' | 'unknown';
}
