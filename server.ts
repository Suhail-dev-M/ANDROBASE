/**
 * AndroBase - Open-Source Mobile Server Platform
 * Main Server Entry Point
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from './src/server/config.ts';
import { db } from './src/server/db/portable-db.ts';
import { apiRouter } from './src/server/api/router.ts';
import { CapabilityDetector } from './src/server/detector.ts';
import { NetworkManager } from './src/server/network/manager.ts';
import { AuthService } from './src/server/security/auth.ts';

// Universal directory resolution compatible with CommonJS bundles and TS loaders
const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = config.port;

  // 1. Initialize embedded database engine
  await db.initialize();
  console.log('[AndroBase] Embedded Portable Database initialized.');

  // 2. Run capability detection
  const report = await CapabilityDetector.detect();
  console.log(`[AndroBase] Capability detection completed. Active Profile: ${report.profileDetails.name}`);

  // 3. Security Headers Middleware (anti-clickjacking, MIME type sniffing protection, strict referrers)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Remove Express finger-printing
    res.removeHeader('X-Powered-By');
    next();
  });

  // 4. Request Parsing with Mobile-Conscious Limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Mount Versioned REST API
  app.use('/api/v1', apiRouter);

  // Fallback for /api health ping
  app.get('/api/health', (req, res) => res.redirect('/api/v1/health'));

  // 6. Static production serving vs optional Vite middleware in development
  const distPath = path.resolve(appDir, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AndroBase — Server Running</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; max-width: 600px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 1.5rem; margin-top: 0; color: #38bdf8; }
    p { color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; background: #166534; color: #4ade80; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
    .code { background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; font-family: monospace; font-size: 0.9rem; color: #e2e8f0; border: 1px solid #334155; overflow-x: auto; margin: 1rem 0; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 1.25rem; color: #94a3b8; }
    li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● Server Active &amp; Healthy</div>
    <h1>📱 ANDROBASE Mobile Server</h1>
    <p>The AndroBase backend service is running successfully on this device!</p>
    <p><strong>Notice:</strong> The pre-compiled web dashboard bundle (<code>dist/index.html</code>) was not found in the project root.</p>
    <p>To enable the web dashboard, compile the client assets on your development machine and commit or copy the <code>dist/</code> folder:</p>
    <div class="code">npm run build</div>
    <p>In the meantime, all REST API endpoints are fully operational:</p>
    <ul>
      <li><a href="/api/v1/health">/api/v1/health</a> — System &amp; Hardware Health</li>
      <li><a href="/api/v1/status">/api/v1/status</a> — Telemetry &amp; Profile Information</li>
    </ul>
  </div>
</body>
</html>`;

  if (isProd) {
    if (hasDist) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[AndroBase] Production mode active but dist/index.html not found. Serving informative fallback.');
      app.get('*', (req: Request, res: Response) => {
        res.status(200).type('html').send(fallbackHtml);
      });
    }
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      console.warn('[AndroBase] Vite dev middleware not loaded. Serving static dist or fallback.');
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      } else {
        app.get('*', (req: Request, res: Response) => {
          res.status(200).type('html').send(fallbackHtml);
        });
      }
    }
  }

  // 7. Global Error Handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('[AndroBase Server Error]', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected server error occurred.',
    });
  });

  // 8. Start HTTP Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    const access = NetworkManager.getAccessUrls();
    const hasAdmin = AuthService.hasAdmin();

    console.log('\n============================================================');
    console.log('  📱 ANDROBASE — Open-Source Mobile Server Platform');
    console.log('============================================================');
    console.log(`  Local URL:        ${access.local}`);
    if (access.lan) {
      console.log(`  LAN URL:          ${access.lan}`);
    }
    console.log(`  Profile:          ${report.profileDetails.name}`);
    console.log(`  Target Tier:      ${report.profileDetails.targetTier}`);
    console.log(`  Storage Root:     ${config.dataDir}`);
    if (!hasAdmin) {
      console.log('\n  🔑 FIRST-RUN LOCAL BOOTSTRAP TOKEN:');
      console.log(`     ${config.adminBootstrapToken}`);
      console.log('     (Enter this token in the dashboard to set up your admin account)');
    } else {
      console.log('  🔒 Administrator account already configured.');
    }
    console.log('============================================================\n');
  });

  // 9. Graceful Shutdown & Battery Conservation
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[AndroBase] Received ${signal}. Flushing database buffers and shutting down cleanly...`);
    try {
      db.atomicSaveSync();
      console.log('[AndroBase] Database state synchronized to disk.');
    } catch (e) {
      console.error('[AndroBase] Error during database shutdown sync:', e);
    }

    server.close(() => {
      console.log('[AndroBase] HTTP server closed gracefully.');
      process.exit(0);
    });

    // Hard timeout after 5 seconds
    setTimeout(() => {
      console.warn('[AndroBase] Forced shutdown timeout reached.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[AndroBase] Unhandled promise rejection:', reason);
  });
}

startServer().catch((err) => {
  console.error('[AndroBase] Fatal error during startup:', err);
  process.exit(1);
});
