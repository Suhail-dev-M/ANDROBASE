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
import { getEmbeddedDashboardHtml } from './src/server/embedded-ui.ts';
import { SystemMetricsCollector } from './src/server/modules/system/metrics.ts';
import { AppHostingManager } from './src/server/modules/apps/manager.ts';

// Universal directory resolution compatible with CommonJS bundles and TS loaders
const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = config.port;

  // 1. Initialize embedded database engine
  await db.initialize();
  console.log('[AndroBase] Embedded Portable Database initialized.');

  // 1b. Initialize subsystems
  SystemMetricsCollector.initialize();
  await AppHostingManager.initialize();
  console.log('[AndroBase] System metrics collector & App hosting manager initialized.');

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
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));

  if (isProd) {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req: Request, res: Response) => {
      const htmlFile = path.resolve(distPath, 'index.html');
      if (fs.existsSync(htmlFile)) {
        res.sendFile(htmlFile);
      } else {
        res.status(200).type('html').send(getEmbeddedDashboardHtml());
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      } else {
        app.get('*', (req: Request, res: Response) => {
          res.status(200).type('html').send(getEmbeddedDashboardHtml());
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
