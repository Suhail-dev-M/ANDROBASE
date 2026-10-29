/**
 * AndroBase - Cross-Version Portable UUID / ID Generator
 * Ensures 100% compatibility with older Node.js versions on Android (e.g. Node 12.13.0 on Termux)
 * where crypto.randomUUID() does not natively exist.
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

export function generateUUID(): string {
  // Use native crypto.randomUUID if available (Node >= 15.6)
  if (typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }

  // RFC 4122 version 4 UUID fallback using cryptographically secure randomBytes (Node >= 0.10)
  const bytes = crypto.randomBytes(16);
  // Version 4: 0100xxxx
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Variant: 10xxxxxx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
