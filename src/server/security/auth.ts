/**
 * AndroBase - Complete Home Server Management Platform
 * Security & Authentication Engine with Fine-Grained RBAC
 * Features: PBKDF2 Password Hashing, Session Management, RBAC Matrix, Rate Limiting, Local Admin Bootstrap
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { db } from '../db/portable-db.ts';
import { config } from '../config.ts';
import { UserRecord, SessionRecord, ServerPermission, UserRole } from '../types.ts';
import { AuditLogger } from '../audit/logger.ts';
import { generateUUID } from '../utils/id.ts';

export interface AuthResult {
  user: Omit<UserRecord, 'passwordHash' | 'salt'>;
  token: string;
  expiresAt: string;
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, ServerPermission[]> = {
  super_admin: [
    'system:read', 'system:power',
    'files:read', 'files:write', 'files:delete',
    'apps:read', 'apps:manage',
    'db:read', 'db:write', 'db:admin',
    'docker:read', 'docker:manage',
    'network:read', 'network:diagnostics',
    'processes:read', 'processes:kill',
    'services:manage',
    'security:read', 'security:admin',
    'backups:read', 'backups:create', 'backups:restore',
    'tasks:read', 'tasks:manage',
    'media:read', 'media:manage',
    'devtools:use',
    'users:manage',
  ],
  admin: [
    'system:read', 'system:power',
    'files:read', 'files:write', 'files:delete',
    'apps:read', 'apps:manage',
    'db:read', 'db:write', 'db:admin',
    'docker:read', 'docker:manage',
    'network:read', 'network:diagnostics',
    'processes:read', 'processes:kill',
    'services:manage',
    'security:read',
    'backups:read', 'backups:create', 'backups:restore',
    'tasks:read', 'tasks:manage',
    'media:read', 'media:manage',
    'devtools:use',
    'users:manage',
  ],
  standard_user: [
    'system:read',
    'files:read', 'files:write',
    'apps:read',
    'db:read',
    'network:read',
    'processes:read',
    'media:read', 'media:manage',
  ],
  member: [
    'system:read',
    'files:read', 'files:write',
    'apps:read',
    'db:read',
    'network:read',
    'processes:read',
    'media:read', 'media:manage',
  ],
  readonly: [
    'system:read',
    'files:read',
    'apps:read',
    'db:read',
    'network:read',
    'processes:read',
    'media:read',
  ],
};

export class AuthService {
  // In-memory rate limiting map: ip -> { count, resetAt }
  private static loginAttempts: Map<string, { count: number; resetAt: number }> = new Map();
  private static MAX_ATTEMPTS = 5;
  private static LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

  public static hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    const iterations = 10000;
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    return {
      hash: derivedKey.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  public static verifyPassword(password: string, storedHash: string, saltHex: string): boolean {
    const salt = Buffer.from(saltHex, 'hex');
    const iterations = 10000;
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (derivedKey.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedBuf);
  }

  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public static checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
    const now = Date.now();
    const entry = this.loginAttempts.get(ip);

    if (!entry) {
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    if (now > entry.resetAt) {
      this.loginAttempts.delete(ip);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    if (entry.count >= this.MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }

    return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - entry.count };
  }

  public static recordFailedAttempt(ip: string): void {
    const now = Date.now();
    const entry = this.loginAttempts.get(ip);

    if (!entry || now > entry.resetAt) {
      this.loginAttempts.set(ip, { count: 1, resetAt: now + this.LOCKOUT_MS });
    } else {
      entry.count += 1;
    }
  }

  public static resetRateLimit(ip: string): void {
    this.loginAttempts.delete(ip);
  }

  public static countUsers(): number {
    const users = db.query<UserRecord>('_users');
    return users.total;
  }

  public static hasAdmin(): boolean {
    const users = db.query<UserRecord>('_users').data;
    return users.some((u) => u.role === 'admin' || u.role === 'super_admin');
  }

  public static hasPermission(user: any, permission: ServerPermission): boolean {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const role = user.role || 'readonly';
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes(permission)) return true;
    if (Array.isArray(user.customPermissions) && user.customPermissions.includes(permission)) {
      return true;
    }
    return false;
  }

  public static async bootstrapAdmin(params: {
    username: string;
    email: string;
    password: string;
    bootstrapToken: string;
    ip: string;
    userAgent: string;
  }): Promise<AuthResult> {
    if (this.hasAdmin()) {
      throw new Error('Initial administrator setup has already been completed. Remote bootstrapping is permanently disabled.');
    }

    // Verify local bootstrap token generated at startup
    if (!params.bootstrapToken || params.bootstrapToken !== config.adminBootstrapToken) {
      AuditLogger.log({
        action: 'auth.bootstrap.failed_token',
        ip: params.ip,
        userAgent: params.userAgent,
        status: 'failure',
        details: { username: params.username },
      });
      throw new Error('Invalid or missing local bootstrap token. Check the server console or .bootstrap_token file in the data directory.');
    }

    if (params.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const { hash, salt } = this.hashPassword(params.password);
    const userId = generateUUID();

    const userRecord: UserRecord = {
      id: userId,
      username: params.username.trim().toLowerCase(),
      email: (params.email || `${params.username.trim()}@local.lan`).trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    db.insert<UserRecord>('_users', userRecord);

    AuditLogger.log({
      action: 'auth.admin_bootstrap_success',
      userId,
      username: userRecord.username,
      ip: params.ip,
      userAgent: params.userAgent,
      status: 'success',
    });

    return this.createSession(userRecord, params.ip, params.userAgent);
  }

  public static async registerUser(
    params: {
      username: string;
      email: string;
      password: string;
      role?: UserRole;
      customPermissions?: ServerPermission[];
    },
    createdByAdmin?: UserRecord,
    clientInfo?: { ip: string; userAgent: string }
  ): Promise<Omit<UserRecord, 'passwordHash' | 'salt'>> {
    const username = params.username.trim().toLowerCase();
    const email = (params.email || `${username}@local.lan`).trim().toLowerCase();

    // Check duplicate
    const existing = db.query<UserRecord>('_users', {
      filters: [{ field: 'username', operator: 'eq', value: username }],
    });
    if (existing.total > 0) {
      throw new Error(`Username "${username}" is already taken.`);
    }

    if (params.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const { hash, salt } = this.hashPassword(params.password);
    const userId = generateUUID();

    const user: UserRecord = {
      id: userId,
      username,
      email,
      passwordHash: hash,
      salt,
      role: params.role || 'standard_user',
      customPermissions: params.customPermissions,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    db.insert<UserRecord>('_users', user);

    AuditLogger.log({
      action: 'user.created',
      userId,
      username: user.username,
      ip: clientInfo?.ip || '127.0.0.1',
      userAgent: clientInfo?.userAgent || 'internal',
      status: 'success',
      details: { createdBy: createdByAdmin?.username || 'self', role: user.role },
    });

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  }

  public static async login(
    identifier: string,
    password: string,
    ip: string,
    userAgent: string
  ): Promise<AuthResult> {
    const rateCheck = this.checkRateLimit(ip);
    if (!rateCheck.allowed) {
      AuditLogger.log({
        action: 'auth.rate_limited',
        ip,
        userAgent,
        status: 'failure',
        details: { identifier, retryAfterSec: rateCheck.retryAfterSec },
      });
      throw new Error(`Too many failed login attempts. Please wait ${rateCheck.retryAfterSec} seconds.`);
    }

    const cleanId = identifier.trim().toLowerCase();

    // Query by username or email
    let user = db.query<UserRecord>('_users', {
      filters: [{ field: 'username', operator: 'eq', value: cleanId }],
    }).data[0];

    if (!user) {
      user = db.query<UserRecord>('_users', {
        filters: [{ field: 'email', operator: 'eq', value: cleanId }],
      }).data[0];
    }

    if (!user || !user.isActive) {
      this.recordFailedAttempt(ip);
      AuditLogger.log({
        action: 'auth.login.failed_user_not_found',
        ip,
        userAgent,
        status: 'failure',
        details: { identifier },
      });
      throw new Error('Invalid credentials.');
    }

    const isValid = this.verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      this.recordFailedAttempt(ip);
      AuditLogger.log({
        action: 'auth.login.failed_invalid_password',
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'failure',
      });
      throw new Error('Invalid credentials.');
    }

    // Success: reset attempts & update lastLogin
    this.resetRateLimit(ip);
    db.update<UserRecord>('_users', user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    AuditLogger.log({
      action: 'auth.login.success',
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: 'success',
    });

    return this.createSession(user, ip, userAgent);
  }

  public static createSession(user: UserRecord, ip: string, userAgent: string): AuthResult {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000).toISOString();

    const session: SessionRecord = {
      id: generateUUID(),
      userId: user.id,
      tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt,
      ip,
      userAgent,
    };

    db.insert<SessionRecord>('_sessions', session);

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return {
      user: safeUser,
      token,
      expiresAt,
    };
  }

  public static authenticateToken(rawToken: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: SessionRecord } | null {
    if (!rawToken) return null;

    const tokenHash = this.hashToken(rawToken);
    const sessionRes = db.query<SessionRecord>('_sessions', {
      filters: [{ field: 'tokenHash', operator: 'eq', value: tokenHash }],
    });

    const session = sessionRes.data[0];
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      db.delete('_sessions', session.id);
      return null;
    }

    const user = db.findById<UserRecord>('_users', session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return { user: safeUser, session };
  }

  public static logout(rawToken: string): void {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    const session = db.query<SessionRecord>('_sessions', {
      filters: [{ field: 'tokenHash', operator: 'eq', value: tokenHash }],
    });

    if (session.data[0]) {
      db.delete('_sessions', session.data[0].id);
      AuditLogger.log({
        action: 'auth.logout',
        userId: session.data[0].userId,
        ip: session.data[0].ip,
        userAgent: session.data[0].userAgent,
        status: 'success',
      });
    }
  }

  public static deleteUser(userId: string, requestingUser: any): void {
    if (!this.hasPermission(requestingUser, 'users:manage')) {
      throw new Error('Access denied: Unauthorized to manage users.');
    }
    if (requestingUser.id === userId) {
      throw new Error('Cannot delete your own active administrator account.');
    }
    const target = db.findById<UserRecord>('_users', userId);
    if (!target) throw new Error('User not found.');
    if (target.role === 'super_admin' && requestingUser.role !== 'super_admin') {
      throw new Error('Only a super administrator can delete another super administrator.');
    }

    db.delete('_users', userId);
    const sessions = db.query<SessionRecord>('_sessions', {
      filters: [{ field: 'userId', operator: 'eq', value: userId }],
    });
    sessions.data.forEach((s) => db.delete('_sessions', s.id));

    AuditLogger.log({
      action: 'user.deleted',
      userId,
      username: target.username,
      status: 'success',
      details: { deletedBy: requestingUser.username },
    });
  }

  public static listAllActiveSessions(): (SessionRecord & { username?: string; role?: string })[] {
    const sessions = db.query<SessionRecord>('_sessions').data;
    const now = Date.now();
    return sessions
      .filter((s) => new Date(s.expiresAt).getTime() > now)
      .map((s) => {
        const u = db.findById<UserRecord>('_users', s.userId);
        return {
          ...s,
          username: u?.username || 'Unknown',
          role: u?.role || 'member',
        };
      });
  }

  public static listActiveSessions(): (SessionRecord & { username?: string; role?: string })[] {
    return this.listAllActiveSessions();
  }

  public static listUsers(): Omit<UserRecord, 'passwordHash' | 'salt'>[] {
    const users = db.query<UserRecord>('_users').data;
    return users.map(({ passwordHash, salt, ...safe }) => safe);
  }

  public static createUser(params: {
    username: string;
    password: string;
    email?: string;
    role?: UserRole;
  }): Omit<UserRecord, 'passwordHash' | 'salt'> {
    const cleanUser = params.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      throw new Error('Username must be at least 3 characters alphanumeric.');
    }
    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const existing = db.query<UserRecord>('_users', {
      filters: [{ field: 'username', operator: 'eq', value: cleanUser }],
    });
    if (existing.total > 0) throw new Error('Username already taken.');

    const { hash, salt } = this.hashPassword(params.password);
    const user: UserRecord = {
      id: generateUUID(),
      username: cleanUser,
      email: params.email?.trim() || `${cleanUser}@local.lan`,
      passwordHash: hash,
      salt,
      role: params.role || 'standard_user',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.insert<UserRecord>('_users', user);
    AuditLogger.log({
      action: 'user.created',
      userId: user.id,
      username: user.username,
      status: 'success',
      details: { role: user.role },
    });

    const { passwordHash: _, salt: __, ...safe } = user;
    return safe;
  }

  public static updateUserRole(userId: string, role: string, requestingUserId: string): Omit<UserRecord, 'passwordHash' | 'salt'> {
    const validRoles: UserRole[] = ['super_admin', 'admin', 'standard_user', 'member', 'readonly'];
    if (!validRoles.includes(role as UserRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const target = db.findById<UserRecord>('_users', userId);
    if (!target) throw new Error('User not found.');

    const updated = db.update<UserRecord>('_users', userId, { role: role as UserRole });
    AuditLogger.log({
      action: 'user.role_updated',
      userId,
      username: target.username,
      status: 'success',
      details: { oldRole: target.role, newRole: role, updatedBy: requestingUserId },
    });

    const { passwordHash: _, salt: __, ...safe } = updated;
    return safe;
  }

  public static revokeSession(sessionId: string, requestingUser?: any): boolean {
    const s = db.findById<SessionRecord>('_sessions', sessionId);
    if (!s) return false;
    db.delete('_sessions', sessionId);
    AuditLogger.log({
      action: 'auth.session.revoked',
      userId: s.userId,
      status: 'success',
      details: { sessionId, revokedBy: requestingUser?.username || 'admin' },
    });
    return true;
  }

  public static changePassword(
    userId: string,
    oldPass: string,
    newPass: string,
    ip: string,
    userAgent: string
  ): void {
    const user = db.findById<UserRecord>('_users', userId);
    if (!user) throw new Error('User not found.');

    const isValid = this.verifyPassword(oldPass, user.passwordHash, user.salt);
    if (!isValid) throw new Error('Current password does not match.');

    if (newPass.length < 8) throw new Error('New password must be at least 8 characters long.');

    const { hash, salt } = this.hashPassword(newPass);
    db.update<UserRecord>('_users', user.id, {
      passwordHash: hash,
      salt,
    });

    // Revoke all existing sessions for security
    const sessions = db.query<SessionRecord>('_sessions', {
      filters: [{ field: 'userId', operator: 'eq', value: user.id }],
    });
    sessions.data.forEach((s) => db.delete('_sessions', s.id));

    AuditLogger.log({
      action: 'auth.password_changed',
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: 'success',
    });
  }
}
