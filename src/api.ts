/**
 * AndroBase - Complete Home Server Management Platform
 * Frontend API Client
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ServerStatusResponse,
  CompatibilityReport,
  User,
  StoredFile,
  TableInfo,
  BackupItem,
  AuditLog,
  LiveSystemMetrics,
  ResourceMetricHistoryPoint,
  FileSystemEntry,
  HostedAppRecord,
  DetectedDatabaseEngine,
  DockerHostStatus,
  DockerContainerItem,
  RunningProcessItem,
  SystemServiceItem,
  ScheduledTaskItem,
  MediaLibraryItem,
  GitRepositoryStatus,
  ServerModuleDefinition,
  NetworkInterfaceInfo,
} from './types.ts';

const TOKEN_KEY = 'androbase_auth_token';
const USER_KEY = 'androbase_auth_user';

export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('androbase_jwt');
  }

  public static setAuth(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('androbase_jwt', token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('androbase_auth_changed'));
  }

  public static clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('androbase_jwt');
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('androbase_auth_changed'));
  }

  public static getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (token) {
        this.clearAuth();
        window.dispatchEvent(new Event('androbase_auth_changed'));
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }

    return data as T;
  }

  // ----------------------------------------------------
  // System Health & Telemetry
  // ----------------------------------------------------
  public static getStatus(): Promise<ServerStatusResponse> {
    return this.request<ServerStatusResponse>('/status');
  }

  public static getCapabilities(): Promise<CompatibilityReport> {
    return this.request<CompatibilityReport>('/capabilities');
  }

  public static getLiveMetrics(): Promise<LiveSystemMetrics> {
    return this.request<LiveSystemMetrics>('/metrics/live');
  }

  public static getMetricsHistory(): Promise<ResourceMetricHistoryPoint[]> {
    return this.request<ResourceMetricHistoryPoint[]>('/metrics/history');
  }

  public static getBootstrapStatus(): Promise<{ hasAdmin: boolean; isBootstrapRequired: boolean; bootstrapTokenLocation: string; tip: string }> {
    return this.request('/auth/bootstrap-status');
  }

  // ----------------------------------------------------
  // Authentication & Session
  // ----------------------------------------------------
  public static bootstrapAdmin(params: { username: string; email: string; password: string; bootstrapToken: string }): Promise<{ user: User; token: string }> {
    return this.request('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public static login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  public static async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearAuth();
      window.dispatchEvent(new Event('androbase_auth_changed'));
    }
  }

  public static getMe(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  public static changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // ----------------------------------------------------
  // User & Permission Management (RBAC)
  // ----------------------------------------------------
  public static listUsers(): Promise<User[]> {
    return this.request('/users');
  }

  public static createUser(userData: { username: string; email?: string; password: string; role: string }): Promise<User> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  public static deleteUser(userId: string): Promise<{ message: string }> {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  public static updateUserRole(userId: string, role: string): Promise<User> {
    return this.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // ----------------------------------------------------
  // File Manager Engine
  // ----------------------------------------------------
  public static listDirectory(pathStr: string = ''): Promise<{ currentPath: string; entries: FileSystemEntry[] }> {
    return this.request(`/files/list?path=${encodeURIComponent(pathStr)}`);
  }

  public static createFolder(parentPath: string, folderName: string): Promise<{ message: string; path: string }> {
    return this.request('/files/folder', {
      method: 'POST',
      body: JSON.stringify({ path: parentPath, folderName }),
    });
  }

  public static renameFile(oldPath: string, newPath: string): Promise<{ message: string }> {
    return this.request('/files/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    });
  }

  public static copyFile(srcPath: string, destPath: string): Promise<{ message: string }> {
    return this.request('/files/copy', {
      method: 'POST',
      body: JSON.stringify({ srcPath, destPath }),
    });
  }

  public static moveFile(srcPath: string, destPath: string): Promise<{ message: string }> {
    return this.request('/files/move', {
      method: 'POST',
      body: JSON.stringify({ srcPath, destPath }),
    });
  }

  public static deleteFileManagerItem(pathStr: string): Promise<{ message: string }> {
    return this.request('/files/delete', {
      method: 'DELETE',
      body: JSON.stringify({ path: pathStr }),
    });
  }

  public static readFileContent(pathStr: string): Promise<{ path: string; content: string }> {
    return this.request(`/files/read?path=${encodeURIComponent(pathStr)}`);
  }

  public static writeFileContent(pathStr: string, content: string): Promise<{ message: string }> {
    return this.request('/files/write', {
      method: 'POST',
      body: JSON.stringify({ path: pathStr, content }),
    });
  }

  public static uploadFileManagerFiles(targetPath: string, files: FileList | File[]): Promise<{ message: string; files: string[] }> {
    const formData = new FormData();
    formData.append('path', targetPath);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Legacy private file storage for backwards compatibility
  public static listFiles(): Promise<StoredFile[]> {
    return this.request('/files');
  }

  public static listLegacyFiles(): Promise<StoredFile[]> {
    return this.request('/files');
  }

  public static uploadFile(file: File, description?: string): Promise<StoredFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return this.request('/files', {
      method: 'POST',
      body: formData,
    });
  }

  public static uploadLegacyFile(file: File, description?: string): Promise<StoredFile> {
    return this.uploadFile(file, description);
  }

  public static deleteFile(id: string): Promise<{ message: string }> {
    return this.request(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Application & Web Hosting Manager
  // ----------------------------------------------------
  public static listApps(): Promise<HostedAppRecord[]> {
    return this.request('/apps');
  }

  public static createApp(data: {
    name: string;
    type: string;
    directoryPath: string;
    entryPoint: string;
    port: number;
    env?: Record<string, string>;
    autoStart?: boolean;
  }): Promise<HostedAppRecord> {
    return this.request('/apps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateApp(id: string, data: Partial<HostedAppRecord>): Promise<HostedAppRecord> {
    return this.request(`/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static deleteApp(id: string): Promise<{ message: string }> {
    return this.request(`/apps/${id}`, {
      method: 'DELETE',
    });
  }

  public static startApp(id: string): Promise<HostedAppRecord> {
    return this.request(`/apps/${id}/start`, { method: 'POST' });
  }

  public static stopApp(id: string): Promise<HostedAppRecord> {
    return this.request(`/apps/${id}/stop`, { method: 'POST' });
  }

  public static restartApp(id: string): Promise<HostedAppRecord> {
    return this.request(`/apps/${id}/restart`, { method: 'POST' });
  }

  public static getAppLogs(id: string, lines: number = 100): Promise<{ logs: string[] }> {
    return this.request(`/apps/${id}/logs?lines=${lines}`);
  }

  // ----------------------------------------------------
  // Database Hub (Multi-Engine & Embedded WAL)
  // ----------------------------------------------------
  public static detectDatabaseEngines(): Promise<DetectedDatabaseEngine[]> {
    return this.request('/databases/engines');
  }

  public static executeDatabaseQuery(engine: string, query: string, params?: unknown[]): Promise<any> {
    return this.request('/databases/query', {
      method: 'POST',
      body: JSON.stringify({ engine, query, params }),
    });
  }

  public static listTables(): Promise<TableInfo[]> {
    return this.request('/database/tables');
  }

  public static createTable(tableDef: { name: string; primaryKey: string; columns: any[] }): Promise<{ message: string }> {
    return this.request('/database/tables', {
      method: 'POST',
      body: JSON.stringify(tableDef),
    });
  }

  public static dropTable(tableName: string): Promise<{ message: string }> {
    return this.request(`/database/tables/${tableName}`, {
      method: 'DELETE',
    });
  }

  public static queryTable(tableName: string, queryParams: { filters?: any[]; sortField?: string; sortDirection?: 'asc' | 'desc'; limit?: number; offset?: number } = {}): Promise<{ data: any[]; total: number; limit: number; offset: number; page: number; pages: number }> {
    return this.request(`/database/query/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(queryParams),
    });
  }

  public static insertRecord(tableName: string, record: any): Promise<any> {
    return this.request(`/database/records/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  public static updateRecord(tableName: string, id: string, updates: any): Promise<any> {
    return this.request(`/database/records/${tableName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static deleteRecord(tableName: string, id: string): Promise<{ message: string }> {
    return this.request(`/database/records/${tableName}/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Docker Containers
  // ----------------------------------------------------
  public static getDockerStatus(): Promise<DockerHostStatus> {
    return this.request('/docker/status');
  }

  public static listDockerContainers(): Promise<DockerContainerItem[]> {
    return this.request('/docker/containers');
  }

  public static startDockerContainer(id: string): Promise<{ message: string }> {
    return this.request(`/docker/containers/${id}/start`, { method: 'POST' });
  }

  public static stopDockerContainer(id: string): Promise<{ message: string }> {
    return this.request(`/docker/containers/${id}/stop`, { method: 'POST' });
  }

  public static restartDockerContainer(id: string): Promise<{ message: string }> {
    return this.request(`/docker/containers/${id}/restart`, { method: 'POST' });
  }

  public static removeDockerContainer(id: string): Promise<{ message: string }> {
    return this.request(`/docker/containers/${id}`, { method: 'DELETE' });
  }

  public static getDockerContainerLogs(id: string): Promise<{ logs: string[] }> {
    return this.request(`/docker/containers/${id}/logs`);
  }

  // ----------------------------------------------------
  // Network Diagnostics
  // ----------------------------------------------------
  public static getNetworkInterfaces(): Promise<NetworkInterfaceInfo[]> {
    return this.request('/network/interfaces');
  }

  public static getNetworkInfo(): Promise<{
    interfaces: any[];
    urls: { local: string; lan: string | null; allLanUrls: string[] };
    sshGuide: any;
  }> {
    return this.request('/network/info');
  }

  public static getListeningPorts(): Promise<any[]> {
    return this.request('/network/ports');
  }

  public static getDnsInfo(): Promise<{ hostname: string; dnsServers: string[] }> {
    return this.request('/network/dns');
  }

  public static pingHost(host: string): Promise<{ success: boolean; latencyMs?: number; output: string }> {
    return this.request('/network/ping', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  }

  public static lookupDns(hostname: string): Promise<{ hostname: string; addresses: string[] }> {
    return this.request('/network/dns-lookup', {
      method: 'POST',
      body: JSON.stringify({ hostname }),
    });
  }

  // ----------------------------------------------------
  // Process & System Services
  // ----------------------------------------------------
  public static listProcesses(): Promise<RunningProcessItem[]> {
    return this.request('/processes');
  }

  public static killProcess(pid: number): Promise<{ message: string }> {
    return this.request(`/processes/${pid}/kill`, { method: 'POST' });
  }

  public static listServices(): Promise<SystemServiceItem[]> {
    return this.request('/services');
  }

  public static controlService(name: string, action: 'start' | 'stop' | 'restart'): Promise<{ message: string }> {
    return this.request(`/services/${name}/control`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ----------------------------------------------------
  // Security Centre
  // ----------------------------------------------------
  public static getSecurityAudit(): Promise<{
    securityScore: number;
    activeSessionsCount: number;
    listeningPortsCount: number;
    failedLoginAttempts: number;
    securityWarnings: string[];
  }> {
    return this.request('/security/audit');
  }

  public static listActiveSessions(): Promise<any[]> {
    return this.request('/security/sessions');
  }

  public static revokeSession(id: string): Promise<{ message: string }> {
    return this.request(`/security/sessions/${id}`, { method: 'DELETE' });
  }

  public static getSecurityLogs(limit: number = 50): Promise<AuditLog[]> {
    return this.request(`/security/logs?limit=${limit}`);
  }

  // ----------------------------------------------------
  // Task Scheduler
  // ----------------------------------------------------
  public static listTasks(): Promise<ScheduledTaskItem[]> {
    return this.request('/tasks');
  }

  public static createTask(data: Omit<ScheduledTaskItem, 'id' | 'createdAt'>): Promise<ScheduledTaskItem> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static updateTask(id: string, data: Partial<ScheduledTaskItem>): Promise<ScheduledTaskItem> {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static deleteTask(id: string): Promise<{ message: string }> {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  public static runTask(id: string): Promise<{ success: boolean; log: string }> {
    return this.request(`/tasks/${id}/run`, { method: 'POST' });
  }

  // ----------------------------------------------------
  // Media Server
  // ----------------------------------------------------
  public static scanMediaLibrary(): Promise<MediaLibraryItem[]> {
    return this.request('/media/library');
  }

  // ----------------------------------------------------
  // Developer Tools
  // ----------------------------------------------------
  public static getGitStatus(): Promise<GitRepositoryStatus> {
    return this.request('/devtools/git/status');
  }

  public static gitPull(): Promise<{ success: boolean; output: string }> {
    return this.request('/devtools/git/pull', { method: 'POST' });
  }

  public static readConfigFile(pathStr: string): Promise<{ path: string; content: string }> {
    return this.request(`/devtools/file?path=${encodeURIComponent(pathStr)}`);
  }

  public static writeConfigFile(pathStr: string, content: string): Promise<{ message: string }> {
    return this.request('/devtools/file', {
      method: 'POST',
      body: JSON.stringify({ path: pathStr, content }),
    });
  }

  // ----------------------------------------------------
  // Module / Plugin Registry
  // ----------------------------------------------------
  public static listModules(): Promise<ServerModuleDefinition[]> {
    return this.request('/modules');
  }

  public static toggleModule(id: string, enabled: boolean): Promise<ServerModuleDefinition> {
    return this.request(`/modules/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // ----------------------------------------------------
  // Backup & Recovery
  // ----------------------------------------------------
  public static listBackups(): Promise<BackupItem[]> {
    return this.request('/backup/list');
  }

  public static createBackup(): Promise<BackupItem> {
    return this.request('/backup/create', { method: 'POST' });
  }

  public static restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
    return this.request('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    });
  }
}
