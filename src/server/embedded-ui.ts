/**
 * AndroBase - Open-Source Mobile Server Platform
 * Self-Contained Embedded Web Management Console
 * Cute, Modern & Production-Quality Fallback GUI for Android Smartphones
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEmbeddedDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AndroBase — Mobile Cloud Server</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2'><rect width='14' height='20' x='5' y='2' rx='2'/><path d='M12 18h.01'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card: rgba(17, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --emerald: #10b981;
      --emerald-hover: #059669;
      --cyan: #06b6d4;
      --purple: #a855f7;
      --amber: #f59e0b;
      --rose: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }
    header {
      background: rgba(11, 17, 32, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 0.85rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2));
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .nav-tabs {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding: 0.75rem 1.5rem;
      background: rgba(13, 21, 38, 0.6);
      border-bottom: 1px solid var(--card-border);
      scrollbar-width: none;
    }
    .nav-tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    .tab-btn.active {
      color: #34d399;
      background: rgba(16,185,129,0.12);
      border-color: rgba(16,185,129,0.3);
    }
    main {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
      flex: 1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .cute-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.25rem;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.4);
      transition: border-color 0.2s;
    }
    .cute-card:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .cute-card h3 {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .cute-card .val {
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
    }
    .cute-card .sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn:active {
      transform: scale(0.97);
    }
    .btn-primary {
      background: var(--emerald);
      color: #042f2e;
      box-shadow: 0 2px 10px rgba(16,185,129,0.25);
    }
    .btn-primary:hover {
      background: #34d399;
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.8);
      color: var(--text);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.9);
      border-color: rgba(255,255,255,0.2);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .banner {
      background: linear-gradient(90deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08));
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 14px;
      padding: 1.1rem 1.35rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th {
      background: rgba(13, 21, 38, 0.8);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: var(--text);
    }
    tr:hover td {
      background: rgba(255,255,255,0.03);
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 14, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 1rem;
    }
    .modal-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px;
      width: 100%;
      max-width: 440px;
      padding: 1.75rem;
      box-shadow: 0 25px 35px -5px rgba(0,0,0,0.6);
    }
    .input-group {
      margin-bottom: 1rem;
    }
    .input-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text-muted);
    }
    .input-group input {
      width: 100%;
      background: #090d16;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 0.6rem 0.85rem;
      color: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .input-group input:focus {
      outline: none;
      border-color: var(--emerald);
    }
    .hidden { display: none !important; }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.2rem 0.4rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #34d399;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">🤖</div>
      <span>ANDROBASE</span>
      <span class="badge badge-success" id="hdr-profile">Profile C</span>
    </div>
    <div style="display:flex; align-items:center; gap:0.75rem;">
      <button class="btn btn-primary" id="btn-setup-admin" onclick="openBootstrapModal()">🔑 Set Up Admin</button>
      <span id="user-display" class="badge badge-warning" style="display:none;">Admin</span>
      <button class="btn btn-secondary" id="btn-auth-action" onclick="toggleAuthModal()">Login</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">✨ Overview</button>
    <button class="tab-btn" onclick="switchTab('database')">📦 Database</button>
    <button class="tab-btn" onclick="switchTab('storage')">📁 Storage</button>
    <button class="tab-btn" onclick="switchTab('diagnostics')">⚡ Diagnostics</button>
    <button class="tab-btn" onclick="switchTab('backups')">🛡️ Backups</button>
    <button class="tab-btn" onclick="switchTab('api')">💻 API Sandbox</button>
  </nav>

  <main>
    <!-- Admin Setup Alert Banner -->
    <div id="bootstrap-banner" class="banner hidden">
      <div>
        <strong style="color:#10b981; font-size:0.95rem;">🔑 Admin Account Setup Required</strong>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">This server has no admin configured. Check Termux console or run <code>cat ~/.androbase/.bootstrap_token</code> to complete initial setup.</p>
      </div>
      <button class="btn btn-primary" onclick="openBootstrapModal()">Set Up Admin</button>
    </div>

    <!-- OVERVIEW TAB -->
    <div id="tab-overview">
      <div id="overview-setup-card" class="cute-card hidden" style="border-color:rgba(16,185,129,0.4); background:rgba(16,185,129,0.06); margin-bottom:1.5rem;">
        <h3 style="color:#34d399; font-size:0.95rem; text-transform:none;">🚀 First-Time Mobile Cloud Setup</h3>
        <p style="font-size:0.85rem; color:#cbd5e1; margin-top:0.35rem; line-height:1.5;">Initialize your administrator account to unlock database tables, private file storage, and snapshot backups on this smartphone.</p>
        <button class="btn btn-primary" style="margin-top:0.85rem;" onclick="openBootstrapModal()">🔑 Click Here to Set Up Admin</button>
      </div>

      <div class="grid">
        <div class="cute-card">
          <h3>Server Status</h3>
          <div class="val" style="color:#34d399;" id="stat-status">Healthy</div>
          <div class="sub" id="stat-uptime">Uptime: 0m</div>
        </div>
        <div class="cute-card">
          <h3>Device Profile</h3>
          <div class="val" style="color:#38bdf8;" id="stat-profile">Profile C</div>
          <div class="sub" id="stat-tier">Android 12+ / 64-bit</div>
        </div>
        <div class="cute-card">
          <h3>System Memory</h3>
          <div class="val" id="stat-mem">-- / -- MB</div>
          <div class="sub" id="stat-mem-sub">V8 Heap: -- MB</div>
        </div>
        <div class="cute-card">
          <h3>Active Network</h3>
          <div class="val" id="stat-lan" style="font-size:1.15rem; word-break:break-all;">127.0.0.1:3000</div>
          <div class="sub">LAN Access Enabled</div>
        </div>
      </div>

      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Enabled Platform Capabilities</h3>
        <ul id="capabilities-list" style="list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.65rem; font-size:0.85rem; color:#cbd5e1;">
          <li>✅ Embedded File-Backed Database (WAL)</li>
          <li>✅ Local REST &amp; Auth Service</li>
          <li>✅ Quota-Bounded Storage Engine</li>
          <li>✅ Native Mobile Wakelock Protection</li>
          <li>✅ Automated SHA-256 Backups</li>
          <li>✅ LAN Dashboard Management</li>
        </ul>
      </div>
    </div>

    <!-- DATABASE TAB -->
    <div id="tab-database" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Database Tables</h3>
          <button class="btn btn-primary" onclick="loadTables()">Refresh Tables</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Table Name</th><th>Record Count</th><th>Actions</th></tr></thead>
            <tbody id="tables-tbody"><tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading tables...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- STORAGE TAB -->
    <div id="tab-storage" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Stored Files &amp; Assets</h3>
          <button class="btn btn-primary" onclick="loadFiles()">Refresh Files</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>File Name</th><th>Size</th><th>Created</th><th>MIME</th><th>Action</th></tr></thead>
            <tbody id="files-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading files...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DIAGNOSTICS TAB -->
    <div id="tab-diagnostics" class="hidden">
      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Hardware &amp; Environment Inspection</h3>
        <div id="diagnostics-content" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
          <div style="color:var(--text-muted);">Loading diagnostic report...</div>
        </div>
      </div>
    </div>

    <!-- BACKUPS TAB -->
    <div id="tab-backups" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Database Snapshots</h3>
          <button class="btn btn-primary" onclick="createBackup()">Create Snapshot</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Backup ID</th><th>Filename</th><th>Size</th><th>Created</th><th>SHA-256</th></tr></thead>
            <tbody id="backups-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading backups...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- API EXPLORER TAB -->
    <div id="tab-api" class="hidden">
      <div class="cute-card">
        <h3 style="margin-bottom:1rem; color:#fff;">Live REST API Explorer</h3>
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/health')">GET /api/v1/health</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/status')">GET /api/v1/status</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/capabilities')">GET /api/v1/capabilities</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/db/tables')">GET /api/v1/db/tables</button>
        </div>
        <pre id="api-output" style="background:#090d16; padding:1.2rem; border-radius:12px; border:1px solid rgba(255,255,255,0.08); overflow:auto; max-height:400px; font-size:0.8rem; font-family:'JetBrains Mono', monospace; color:#38bdf8;">Click an endpoint above to run a live query.</pre>
      </div>
    </div>
  </main>

  <!-- Bootstrap Modal -->
  <div id="bootstrap-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">🔑</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Admin Bootstrap Setup</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Enter the bootstrap token printed to your Termux console during initial startup.</p>
      <form onsubmit="submitBootstrap(event)">
        <div class="input-group">
          <label>Bootstrap Token</label>
          <input type="text" id="bs-token" required placeholder="Found in .androbase/.bootstrap_token" />
        </div>
        <div class="input-group">
          <label>Admin Username</label>
          <input type="text" id="bs-user" required value="admin" />
        </div>
        <div class="input-group">
          <label>Admin Password</label>
          <input type="password" id="bs-pass" required placeholder="Min 8 characters" minlength="8" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeBootstrapModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Initialize Admin</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Login Modal -->
  <div id="login-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">🔐</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Admin Sign In</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Authenticate to manage files, tables, and snapshots.</p>
      <form onsubmit="submitLogin(event)">
        <div class="input-group">
          <label>Username</label>
          <input type="text" id="lg-user" required />
        </div>
        <div class="input-group">
          <label>Password</label>
          <input type="password" id="lg-pass" required />
        </div>
        <div style="margin-top:0.85rem; text-align:center;">
          <a href="javascript:void(0)" onclick="toggleAuthModal(); openBootstrapModal();" style="color:#10b981; font-size:0.8rem; text-decoration:none; font-weight:600;">
            🔑 First time here? Click to set up admin account
          </a>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="toggleAuthModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let authToken = localStorage.getItem('androbase_auth_token') || localStorage.getItem('androbase_jwt') || '';
    let currentUser = null;

    function getHeaders() {
      const h = { 'Content-Type': 'application/json' };
      if (authToken) h['Authorization'] = 'Bearer ' + authToken;
      return h;
    }

    async function api(path, opts = {}) {
      opts.headers = Object.assign(getHeaders(), opts.headers || {});
      const res = await fetch(path, opts);
      return res.json();
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('main > div[id^="tab-"]').forEach(d => d.classList.add('hidden'));
      event.target.classList.add('active');
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.remove('hidden');

      if (tabId === 'database') loadTables();
      if (tabId === 'storage') loadFiles();
      if (tabId === 'diagnostics') loadDiagnostics();
      if (tabId === 'backups') loadBackups();
    }

    async function refreshStatus() {
      try {
        const d = await api('/api/v1/status');
        document.getElementById('stat-status').textContent = d.status === 'online' ? 'Online' : (d.status || 'Active');
        document.getElementById('stat-uptime').textContent = 'Uptime: ' + Math.floor((d.uptimeSeconds || 0) / 60) + 'm ' + ((d.uptimeSeconds || 0) % 60) + 's';

        const profileStr = d.profileName || d.profile || 'Profile C';
        document.getElementById('stat-profile').textContent = profileStr.split('—')[0].trim();
        document.getElementById('stat-tier').textContent = profileStr.includes('—') ? profileStr.split('—')[1].trim() : (d.device ? d.device.arch + ' / ' + d.device.nodeVersion : 'Standard Mobile');
        document.getElementById('hdr-profile').textContent = profileStr.split('—')[0].trim();

        const freeMb = (d.device && d.device.freeMemoryMb != null) ? d.device.freeMemoryMb : (d.memory ? d.memory.freeMb : '--');
        const totalMb = (d.device && d.device.totalMemoryMb != null) ? d.device.totalMemoryMb : (d.memory ? d.memory.totalMb : '--');
        const heapLimit = (d.device && d.device.heapLimitMb != null) ? d.device.heapLimitMb : 256;
        document.getElementById('stat-mem').textContent = freeMb + ' / ' + totalMb + ' MB';
        document.getElementById('stat-mem-sub').textContent = 'V8 Limit: ' + heapLimit + ' MB';

        const lanIp = (d.network && d.network.lanIps && d.network.lanIps[0]) ? d.network.lanIps[0] : '127.0.0.1';
        const port = (d.network && d.network.port) || 3000;
        document.getElementById('stat-lan').textContent = lanIp + ':' + port;

        const hasAdmin = !!d.hasAdmin;
        const banner = document.getElementById('bootstrap-banner');
        const btnSetup = document.getElementById('btn-setup-admin');
        const cardSetup = document.getElementById('overview-setup-card');

        if (!hasAdmin) {
          if (banner) banner.classList.remove('hidden');
          if (btnSetup) btnSetup.style.display = 'inline-flex';
          if (cardSetup) cardSetup.classList.remove('hidden');

          if (!sessionStorage.getItem('androbase_auto_bootstrap_shown')) {
            sessionStorage.setItem('androbase_auto_bootstrap_shown', 'true');
            openBootstrapModal();
          }
        } else {
          if (banner) banner.classList.add('hidden');
          if (btnSetup) btnSetup.style.display = 'none';
          if (cardSetup) cardSetup.classList.add('hidden');
        }

        const userRaw = localStorage.getItem('androbase_auth_user');
        if (authToken) {
          document.getElementById('btn-auth-action').textContent = 'Logout';
          if (userRaw) {
            try {
              const u = JSON.parse(userRaw);
              document.getElementById('user-display').style.display = 'inline-flex';
              document.getElementById('user-display').textContent = u.username;
            } catch(e) {}
          }
        }
      } catch (e) {
        console.error('Failed to load status', e);
      }
    }

    async function loadTables() {
      try {
        const d = await api('/api/v1/db/tables');
        const list = Array.isArray(d) ? d : (d.tables || d.data || []);
        const tb = document.getElementById('tables-tbody');
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">No tables created yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(t => '<tr><td><strong>' + t.name + '</strong></td><td>' + (t.rowCount != null ? t.rowCount : (t.recordCount || 0)) + ' rows</td><td><button class="btn btn-secondary" onclick="viewTable(\\'' + t.name + '\\')">Query Rows</button></td></tr>').join('');
      } catch (e) {
        document.getElementById('tables-tbody').innerHTML = '<tr><td colspan="3" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load tables. Sign in to view database.</td></tr>';
      }
    }

    async function viewTable(name) {
      try {
        const d = await api('/api/v1/db/' + name + '/query', { method: 'POST', body: JSON.stringify({ limit: 10 }) });
        alert('Table ' + name + ' (' + (d.total || (d.records && d.records.length) || 0) + ' total records):\\n' + JSON.stringify(d.records || d.data || d, null, 2));
      } catch (e) {
        alert('Error querying table: ' + e.message);
      }
    }

    async function loadFiles() {
      try {
        const d = await api('/api/v1/storage/files');
        const list = Array.isArray(d) ? d : (d.files || d.data || []);
        const tb = document.getElementById('files-tbody');
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No files uploaded yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(f => '<tr><td>' + (f.originalName || f.name) + '</td><td>' + ((f.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (f.uploadedAt || f.createdAt || '').split('T')[0] + '</td><td><code>' + (f.mimeType || 'unknown') + '</code></td><td><a href="/api/v1/storage/' + f.id + '" target="_blank" class="btn btn-secondary">Download</a></td></tr>').join('');
      } catch (e) {
        document.getElementById('files-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load files. Sign in to view storage.</td></tr>';
      }
    }

    async function loadDiagnostics() {
      try {
        const d = await api('/api/v1/capabilities');
        const c = document.getElementById('diagnostics-content');
        const checks = d.checks || [];
        c.innerHTML = checks.map(k => '<div class="cute-card"><h3>' + k.name + '</h3><div style="font-weight:700; font-size:1.05rem; margin-top:0.25rem; font-family:\\'JetBrains Mono\\', monospace;">' + k.value + '</div><p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.35rem; line-height:1.4;">' + k.message + '</p></div>').join('');
      } catch (e) {
        document.getElementById('diagnostics-content').innerHTML = '<div style="color:#ef4444; padding:1rem;">Failed to load diagnostic details.</div>';
      }
    }

    async function loadBackups() {
      try {
        const d = await api('/api/v1/backups');
        const list = Array.isArray(d) ? d : (d.backups || d.data || []);
        const tb = document.getElementById('backups-tbody');
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No snapshot backups created yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(b => '<tr><td><code>' + (b.id ? b.id.substring(0,8) : '--') + '</code></td><td>' + b.filename + '</td><td>' + ((b.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (b.createdAt || '').split('T')[0] + '</td><td><code>' + (b.sha256 ? b.sha256.substring(0, 16) : '') + '...</code></td></tr>').join('');
      } catch (e) {
        document.getElementById('backups-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load backups. Sign in to manage snapshots.</td></tr>';
      }
    }

    async function createBackup() {
      try {
        const d = await api('/api/v1/backups', { method: 'POST', body: JSON.stringify({ label: 'manual' }) });
        alert('Snapshot created successfully! Archive: ' + d.backup.filename);
        loadBackups();
      } catch (e) {
        alert('Failed to create backup: ' + e.message);
      }
    }

    async function testEndpoint(p) {
      document.getElementById('api-output').textContent = 'Loading ' + p + '...';
      try {
        const res = await api(p);
        document.getElementById('api-output').textContent = JSON.stringify(res, null, 2);
      } catch (e) {
        document.getElementById('api-output').textContent = 'Error: ' + e.message;
      }
    }

    function openBootstrapModal() { document.getElementById('bootstrap-modal').classList.remove('hidden'); }
    function closeBootstrapModal() { document.getElementById('bootstrap-modal').classList.add('hidden'); }
    function toggleAuthModal() {
      if (authToken) {
        authToken = '';
        localStorage.removeItem('androbase_auth_token');
        localStorage.removeItem('androbase_jwt');
        localStorage.removeItem('androbase_auth_user');
        document.getElementById('btn-auth-action').textContent = 'Login';
        document.getElementById('user-display').style.display = 'none';
        refreshStatus();
      } else {
        document.getElementById('login-modal').classList.toggle('hidden');
      }
    }

    async function submitBootstrap(e) {
      e.preventDefault();
      const token = document.getElementById('bs-token').value.trim();
      const username = document.getElementById('bs-user').value.trim();
      const password = document.getElementById('bs-pass').value;
      try {
        const res = await api('/api/v1/auth/bootstrap', { method: 'POST', body: JSON.stringify({ bootstrapToken: token, username, password }) });
        if (res.token) {
          authToken = res.token;
          localStorage.setItem('androbase_auth_token', authToken);
          localStorage.setItem('androbase_jwt', authToken);
          localStorage.setItem('androbase_auth_user', JSON.stringify(res.user));
          alert('Admin initialized successfully!');
          closeBootstrapModal();
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
          loadTables();
          loadFiles();
        } else {
          alert('Bootstrap error: ' + (res.error || 'Failed'));
        }
      } catch (err) {
        alert('Bootstrap request failed: ' + err.message);
      }
    }

    async function submitLogin(e) {
      e.preventDefault();
      const username = document.getElementById('lg-user').value.trim();
      const password = document.getElementById('lg-pass').value;
      try {
        const res = await api('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: username, username, password })
        });
        if (res.token) {
          authToken = res.token;
          localStorage.setItem('androbase_auth_token', authToken);
          localStorage.setItem('androbase_jwt', authToken);
          localStorage.setItem('androbase_auth_user', JSON.stringify(res.user));
          document.getElementById('login-modal').classList.add('hidden');
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
          loadTables();
          loadFiles();
        } else {
          alert('Login failed: ' + (res.error || 'Invalid credentials'));
        }
      } catch (err) {
        alert('Login request failed: ' + err.message);
      }
    }

    // Initialize
    refreshStatus();
    setInterval(refreshStatus, 10000);
  </script>
</body>
</html>`;
}
