/**
 * AndroBase - Open-Source Mobile Server Platform
 * Configuration Management
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  host: string;
  port: number;
  dataDir: string;
  dbPath: string;
  storageDir: string;
  backupsDir: string;
  logsDir: string;
  jwtSecret: string;
  adminBootstrapToken: string;
  allowLan: boolean;
  maxUploadBytes: number;
  maxMemoryMb: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  sessionTtlHours: number;
  logRetentionDays: number;
  version: string;
}

// Default data directory inside project workspace or termux $HOME/.androbase
const getDefaultDataDir = (): string => {
  if (process.env.ANDROBASE_DATA_DIR) {
    return path.resolve(process.env.ANDROBASE_DATA_DIR);
  }
  // Check if running inside Termux
  if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')) {
    const termuxHome = process.env.HOME || '/data/data/com.termux/files/home';
    return path.join(termuxHome, '.androbase');
  }
  return path.resolve(process.cwd(), '.androbase_data');
};

const dataDir = getDefaultDataDir();
const storageDir = path.join(dataDir, 'storage');
const backupsDir = path.join(dataDir, 'backups');
const logsDir = path.join(dataDir, 'logs');
const dbPath = path.join(dataDir, 'androbase.db.json');

// Ensure base directories exist with safe permissions
[dataDir, storageDir, backupsDir, logsDir].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  } catch (err) {
    console.error(`[AndroBase Config] Failed to create directory: ${dir}`, err);
  }
});

// Admin bootstrap token file for initial setup
const bootstrapTokenPath = path.join(dataDir, '.bootstrap_token');
let bootstrapToken = '';
if (fs.existsSync(bootstrapTokenPath)) {
  bootstrapToken = fs.readFileSync(bootstrapTokenPath, 'utf8').trim();
} else {
  // Generate random 16-byte hex token for first-run admin initialization
  bootstrapToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  try {
    fs.writeFileSync(bootstrapTokenPath, bootstrapToken, { mode: 0o600 });
  } catch {
    // Fallback in-memory
  }
}

export const config: ServerConfig = {
  env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  host: process.env.HOST || '0.0.0.0', // Dev server binds to 0.0.0.0 for preview container, with security middleware
  port: parseInt(process.env.PORT || '3000', 10),
  dataDir,
  dbPath,
  storageDir,
  backupsDir,
  logsDir,
  jwtSecret: process.env.ANDROBASE_JWT_SECRET || 'androbase-dev-secret-change-in-prod-777',
  adminBootstrapToken: bootstrapToken,
  allowLan: process.env.ANDROBASE_ALLOW_LAN === 'true',
  maxUploadBytes: parseInt(process.env.ANDROBASE_MAX_UPLOAD_BYTES || '20971520', 10), // 20 MB default safe limit
  maxMemoryMb: parseInt(process.env.ANDROBASE_MAX_MEMORY_MB || '256', 10), // Conservative 256MB for phones
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
  sessionTtlHours: 72,
  logRetentionDays: 7,
  version: '1.0.0-rc1',
};
