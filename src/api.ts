/**
 * AndroBase - Frontend API Client
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServerStatusResponse, CompatibilityReport, User, StoredFile, TableInfo, BackupItem, AuditLog } from './types.ts';

const TOKEN_KEY = 'androbase_auth_token';
const USER_KEY = 'androbase_auth_user';

export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public static setAuth(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public static clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
      // Token invalid or expired
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

  // System & Health
  public static getStatus(): Promise<ServerStatusResponse> {
    return this.request<ServerStatusResponse>('/status');
  }

  public static getCapabilities(): Promise<CompatibilityReport> {
    return this.request<CompatibilityReport>('/capabilities');
  }

  public static getBootstrapStatus(): Promise<{ hasAdmin: boolean; isBootstrapRequired: boolean; bootstrapTokenLocation: string; tip: string }> {
    return this.request('/auth/bootstrap-status');
  }

  // Auth
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

  // Users
  public static listUsers(): Promise<User[]> {
    return this.request('/users');
  }

  public static createUser(userData: { username: string; email: string; password: string; role: 'member' | 'readonly' }): Promise<User> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Database
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

  // Files
  public static listFiles(): Promise<StoredFile[]> {
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

  public static deleteFile(fileId: string): Promise<{ message: string }> {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Backups
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

  // Audit Logs
  public static getAuditLogs(): Promise<AuditLog[]> {
    return this.request('/admin/audit-logs');
  }

  // Network & Guides
  public static getNetworkInfo(): Promise<{ interfaces: any[]; urls: { local: string; lan: string | null; allLanUrls: string[] }; sshGuide: any }> {
    return this.request('/network/interfaces');
  }
}
