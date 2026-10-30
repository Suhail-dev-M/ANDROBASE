/**
 * AndroBase - Complete Home Server Management Platform
 * Core Type Definitions & RBAC Specifications
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

// ----------------------------------------------------
// User & Role-Based Access Control (RBAC)
// ----------------------------------------------------
export type UserRole = 'super_admin' | 'admin' | 'standard_user' | 'member' | 'readonly';

export type ServerPermission =
  | 'system:read'
  | 'system:power'
  | 'files:read'
  | 'files:write'
  | 'files:delete'
  | 'apps:read'
  | 'apps:manage'
  | 'db:read'
  | 'db:write'
  | 'db:admin'
  | 'docker:read'
  | 'docker:manage'
  | 'network:read'
  | 'network:diagnostics'
  | 'processes:read'
  | 'processes:kill'
  | 'services:manage'
  | 'security:read'
  | 'security:admin'
  | 'backups:read'
  | 'backups:create'
  | 'backups:restore'
  | 'tasks:read'
  | 'tasks:manage'
  | 'media:read'
  | 'media:manage'
  | 'devtools:use'
  | 'users:manage';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  customPermissions?: ServerPermission[];
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
  ip?: string;
  userAgent?: string;
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

// ----------------------------------------------------
// System Dashboard & Live Resource Telemetry
// ----------------------------------------------------
export interface StorageDriveInfo {
  mount: string;
  filesystem: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percent: number;
}

export interface NetworkBandwidthStats {
  rxSpeedBps: number;
  txSpeedBps: number;
  totalRxBytes: number;
  totalTxBytes: number;
}

export interface BatteryInfo {
  supported: boolean;
  present?: boolean;
  percent?: number;
  status?: string;
  temperatureC?: number;
  health?: string;
  plugged?: string;
}

export interface ResourceMetricHistoryPoint {
  timestamp: number;
  cpuPercent: number;
  ramPercent: number;
  rxSpeedBps: number;
  txSpeedBps: number;
}

export interface LiveSystemMetrics {
  timestamp: string;
  uptimeSeconds: number;
  cpu: {
    usagePercent: number;
    model: string;
    cores: number;
    speedMhz: number;
    loadAverage: number[];
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usagePercent: number;
  };
  storage: {
    drives: StorageDriveInfo[];
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  };
  network: {
    bandwidth: NetworkBandwidthStats;
    interfaces: NetworkInterfaceInfo[];
    listeningPortsCount: number;
    activeConnectionsCount: number;
  };
  environment: {
    osRelease: string;
    platform: string;
    arch: string;
    battery: BatteryInfo;
    cpuTempC?: number;
  };
  history: ResourceMetricHistoryPoint[];
}

// ----------------------------------------------------
// File Manager Item & Metadata
// ----------------------------------------------------
export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  updatedAt: string;
  mimeType?: string;
  isSymlink?: boolean;
  isProtected?: boolean;
}

// ----------------------------------------------------
// Application & Web Hosting Manager
// ----------------------------------------------------
export type HostedAppType = 'node' | 'python' | 'php' | 'static' | 'custom';
export type HostedAppStatus = 'running' | 'stopped' | 'failed';

export interface HostedAppRecord {
  id: string;
  name: string;
  type: HostedAppType;
  directoryPath: string;
  entryPoint: string;
  port: number;
  env: Record<string, string>;
  autoStart: boolean;
  status: HostedAppStatus;
  pid?: number;
  createdAt: string;
  updatedAt: string;
  restartCount: number;
  lastError?: string;
}

// ----------------------------------------------------
// Database Management
// ----------------------------------------------------
export type DatabaseEngineType = 'postgres' | 'mysql' | 'sqlite' | 'embedded';

export interface DetectedDatabaseEngine {
  type: DatabaseEngineType;
  name: string;
  isInstalled: boolean;
  isAvailable: boolean;
  status: 'online' | 'offline' | 'uninstalled';
  version?: string;
  defaultPort?: number;
  socketOrHost?: string;
  message: string;
}

// ----------------------------------------------------
// Docker & Container Management
// ----------------------------------------------------
export interface DockerHostStatus {
  isInstalled: boolean;
  isAvailable: boolean;
  version?: string;
  containersTotal?: number;
  containersRunning?: number;
  imagesTotal?: number;
  message: string;
}

export interface DockerContainerItem {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting';
  status: string;
  created: string;
  ports: string[];
  command: string;
}

// ----------------------------------------------------
// Process & Service Manager
// ----------------------------------------------------
export interface RunningProcessItem {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMb: number;
  user: string;
  command: string;
}

export interface SystemServiceItem {
  name: string;
  description: string;
  type: 'systemd' | 'termux_sv' | 'managed_app';
  status: 'active' | 'inactive' | 'failed' | 'unknown';
  enabled: boolean;
  canControl: boolean;
}

// ----------------------------------------------------
// Task Scheduler & Automation
// ----------------------------------------------------
export interface ScheduledTaskItem {
  id: string;
  name: string;
  cronExpression: string;
  taskType: 'backup' | 'cleanup' | 'app_restart' | 'ping_check';
  target: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: 'success' | 'failure';
  lastLog?: string;
  createdAt: string;
}

// ----------------------------------------------------
// Media Server
// ----------------------------------------------------
export interface MediaLibraryItem {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'image';
  path: string;
  sizeBytes: number;
  mimeType: string;
  durationSec?: number;
  createdAt: string;
}

// ----------------------------------------------------
// Developer Tools (Git, Logs, Code Editor)
// ----------------------------------------------------
export interface GitRepositoryStatus {
  isRepo: boolean;
  currentBranch?: string;
  remoteUrl?: string;
  isClean?: boolean;
  uncommittedCount?: number;
  lastCommit?: {
    hash: string;
    author: string;
    message: string;
    date: string;
  };
}

// ----------------------------------------------------
// Plugin & Modular Architecture
// ----------------------------------------------------
export interface ServerModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  isCore: boolean;
  icon: string;
  category: 'core' | 'infrastructure' | 'management' | 'tools';
}
