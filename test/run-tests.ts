/**
 * AndroBase - Open-Source Mobile Server Platform
 * Automated Test Suite: Unit Tests, Integration Tests, Security & Traversal Tests
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, PortableDatabase } from '../src/server/db/portable-db.ts';
import { AuthService } from '../src/server/security/auth.ts';
import { CapabilityDetector } from '../src/server/detector.ts';
import { FileStorageService } from '../src/server/storage/file-storage.ts';
import { BackupManager } from '../src/server/backup/manager.ts';
import { config } from '../src/server/config.ts';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('  🧪 RUNNING ANDROBASE AUTOMATED TEST SUITE');
  console.log('============================================================\n');

  // Initialize DB
  await db.initialize();

  console.log('--- 1. UNIT TESTS: Configuration & Capability Detection ---');
  await test('Configuration loads safe defaults for mobile constraints', () => {
    assert.ok(config.port > 0, 'Port must be a positive integer');
    assert.ok(config.maxUploadBytes > 0, 'Upload size must be bounded');
    assert.ok(fs.existsSync(config.dataDir), 'Data directory must exist');
  });

  await test('CapabilityDetector categorizes environment into Profile A, B, or C', async () => {
    const report = await CapabilityDetector.detect();
    assert.ok(['profile_a', 'profile_b', 'profile_c'].includes(report.detectedProfile));
    assert.ok(report.checks.length >= 5, 'Must run hardware, runtime, and security checks');
    assert.ok(report.device.cpuCores > 0, 'CPU core count detected');
  });

  await test('Cryptographic randomness and PBKDF2 function correctly', () => {
    const { hash, salt } = AuthService.hashPassword('SuperSecret123!');
    assert.strictEqual(salt.length, 32, 'Salt should be 16 bytes hex (32 chars)');
    assert.strictEqual(hash.length, 64, 'PBKDF2 SHA-256 derived key should be 32 bytes hex');
    const valid = AuthService.verifyPassword('SuperSecret123!', hash, salt);
    assert.strictEqual(valid, true, 'Valid password verification');
    const invalid = AuthService.verifyPassword('WrongPassword', hash, salt);
    assert.strictEqual(invalid, false, 'Invalid password rejection');
  });

  console.log('\n--- 2. INTEGRATION TESTS: Database Engine & Transactions ---');
  await test('Database inserts, queries, updates, and deletes records safely', () => {
    const testNote = db.insert('notes', {
      title: 'Termux Quickstart',
      content: 'Run node server.ts inside Termux environment',
      tags: ['android', 'server'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.ok((testNote as any).id, 'Record must be assigned a UUID primary key');

    const queried = db.query('notes', {
      filters: [{ field: 'title', operator: 'eq', value: 'Termux Quickstart' }],
    });
    assert.strictEqual(queried.total >= 1, true, 'Query filter finds created record');

    const updated = db.update('notes', (testNote as any).id, {
      title: 'Termux Quickstart V2',
    });
    assert.strictEqual((updated as any).title, 'Termux Quickstart V2');

    const deleted = db.delete('notes', (testNote as any).id);
    assert.strictEqual(deleted, true, 'Record deleted successfully');
  });

  await test('Database transactions rollback cleanly on error', () => {
    const initialCount = db.query('notes').total;
    db.beginTransaction();
    db.insert('notes', {
      title: 'Temporary Note In Transaction',
      content: 'This should be discarded upon rollback',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    db.rollback();
    const afterRollbackCount = db.query('notes').total;
    assert.strictEqual(afterRollbackCount, initialCount, 'Rollback restores pre-transaction snapshot');
  });

  console.log('\n--- 3. SECURITY TESTS: Authentication, Rate Limiting & Admin Bootstrap ---');
  await test('Admin bootstrap rejects invalid bootstrap tokens', async () => {
    let threw = false;
    try {
      await AuthService.bootstrapAdmin({
        username: 'fakeadmin',
        email: 'fake@example.com',
        password: 'Password123!',
        bootstrapToken: 'WRONG_INVALID_TOKEN',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Must reject incorrect bootstrap token');
  });

  await test('Rate limiter triggers lock after consecutive failed login attempts', () => {
    const testIp = '192.168.1.99';
    AuthService.resetRateLimit(testIp);

    for (let i = 0; i < 5; i++) {
      AuthService.recordFailedAttempt(testIp);
    }

    const check = AuthService.checkRateLimit(testIp);
    assert.strictEqual(check.allowed, false, 'Rate limiter must block after 5 attempts');
    assert.strictEqual(check.remainingAttempts, 0);
    AuthService.resetRateLimit(testIp);
  });

  console.log('\n--- 4. SECURITY TESTS: Path Traversal & Executable Upload Guards ---');
  await test('File storage sanitizes malicious paths and blocks directory traversal', () => {
    const maliciousName = '../../../../etc/passwd';
    const sanitized = FileStorageService.sanitizeFilename(maliciousName);
    assert.strictEqual(sanitized.includes('..'), false, 'Sanitized filename must not contain dot-dot');
    assert.strictEqual(sanitized.includes('/'), false, 'Sanitized filename must not contain forward slashes');

    let traversalDetected = false;
    try {
      FileStorageService.validatePathSafe('../../../secret.key');
    } catch {
      traversalDetected = true;
    }
    assert.strictEqual(traversalDetected, true, 'validatePathSafe must reject traversal sequences');
  });

  await test('File storage disallows executable uploads (.apk, .sh, .dex, .so)', () => {
    assert.strictEqual(FileStorageService.isExtensionAllowed('payload.apk'), false);
    assert.strictEqual(FileStorageService.isExtensionAllowed('script.sh'), false);
    assert.strictEqual(FileStorageService.isExtensionAllowed('exploit.dex'), false);
    assert.strictEqual(FileStorageService.isExtensionAllowed('library.so'), false);
    assert.strictEqual(FileStorageService.isExtensionAllowed('document.pdf'), true);
    assert.strictEqual(FileStorageService.isExtensionAllowed('photo.jpg'), true);
    assert.strictEqual(FileStorageService.isExtensionAllowed('data.json'), true);
  });

  console.log('\n--- 5. INTEGRATION TESTS: Backup, Snapshot & Restore Integrity ---');
  await test('BackupManager creates timestamped snapshot with SHA256 integrity hash', async () => {
    const backup = await BackupManager.createBackup('test-suite');
    assert.ok(backup.id, 'Backup ID generated');
    assert.ok(backup.sha256.length === 64, 'Valid SHA256 checksum');
    assert.ok(backup.sizeBytes > 0, 'Backup file has non-zero size');

    const verify = BackupManager.verifyBackupIntegrity(backup.filename);
    assert.strictEqual(verify.valid, true, 'Backup passes integrity verification');
  });

  console.log('\n============================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
