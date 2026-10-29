/**
 * AndroBase - Open-Source Mobile Server Platform
 * Security & Authentication Engine
 * Features: PBKDF2 Password Hashing, Session Management, RBAC, Rate Limiting, Local Admin Bootstrap
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { db } from '../db/portable-db.ts';
import { config } from '../config.ts';
import { UserRecord, SessionRecord } from '../types.ts';
import { AuditLogger } from '../audit/logger.ts';
import { generateUUID } from '../utils/id.ts';

export interface AuthResult {
  user: Omit<UserRecord, 'passwordHash' | 'salt'>;
  token: string;
  expiresAt: string;
}

export class AuthService {
  // In-memory rate limiting map: ip -> { attempts, resetAt }
  private static loginAttempts: Map<string, { count: number; resetAt: number }> = new Map();
  private static MAX_ATTEMPTS = 5;
  private static LOCKOUT_MS = 15 * 60 * 1000; // 15 mins

  public static hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    // Profile-adaptive iterations (10,000 is optimal balance on ARMv7 mobile CPU without freezing event loop)
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
    const admins = db.query<UserRecord>('_users', {
      filters: [{ field: 'role', operator: 'eq', value: 'admin' }],
    });
    return admins.total > 0;
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
      role: 'admin',
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
      role?: 'member' | 'readonly';
    },
    createdByAdmin?: UserRecord,
    clientInfo?: { ip: string; userAgent: string }
  ): Promise<Omit<UserRecord, 'passwordHash' | 'salt'>> {
    const username = params.username.trim().toLowerCase();
    const email = params.email.trim().toLowerCase();

    // Check duplicate
    const existing = db.query<UserRecord>('_users', {
      filters: [
        { field: 'username', operator: 'eq', value: username },
      ],
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
      role: params.role || 'member',
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
      details: { createdBy: createdByAdmin?.username || 'self' },
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
    // Generate high-entropy 32-byte session token
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
    }).data[0];

    if (session) {
      db.delete('_sessions', session.id);
      AuditLogger.log({
        action: 'auth.logout',
        userId: session.userId,
        ip: session.ip,
        userAgent: session.userAgent,
        status: 'success',
      });
    }
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
