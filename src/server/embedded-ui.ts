/**
 * AndroBase - Open-Source Mobile Server Platform
 * Self-Contained Embedded Web Management Console (Profile A & Low-Resource Hosts)
 * Maximum Supportable Features Suite: Telemetry, Relational WAL DB, Storage, File Manager, Backups, Diagnostics, API Sandbox
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEmbeddedDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AndroBase — Mobile Cloud Server (Profile A Console)</title>
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
      font-size: 1.35rem;
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
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      text-decoration: none;
      font-family: inherit;
    }
    .btn-primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #059669, #047857);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }
    .badge-info {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: #38bdf8;
    }
    .banner {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 14px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 14, 0.85);
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
    .input-group input, .input-group select, .input-group textarea {
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
    .input-group input:focus, .input-group select:focus, .input-group textarea:focus {
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
      <span class="badge badge-success" id="hdr-profile">Profile A</span>
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
    <button class="tab-btn" onclick="switchTab('filemanager')">🗂️ File Manager</button>
    <button class="tab-btn" onclick="switchTab('apps')">🚀 Apps &amp; Hosting</button>
    <button class="tab-btn" onclick="switchTab('diagnostics')">⚡ Diagnostics</button>
    <button class="tab-btn" onclick="switchTab('backups')">🛡️ Backups</button>
    <button class="tab-btn" onclick="switchTab('api')">💻 API Sandbox</button>
  </nav>

  <main>
    <!-- Server Locked Banner (Every visit requirement) -->
    <div id="lock-screen-card" class="cute-card hidden" style="border-color:rgba(245,158,11,0.4); background:rgba(245,158,11,0.06); margin-bottom:1.5rem; text-align:center; padding:1.75rem 1.25rem;">
      <div style="font-size:2.2rem; margin-bottom:0.5rem;">🔒</div>
      <h2 style="font-size:1.2rem; font-weight:800; color:#f8fafc; margin-bottom:0.35rem;">AndroBase Access Locked</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); max-width:480px; margin:0 auto 1.25rem; line-height:1.5;">Administrator authentication is required on every visit. Sign in below to unlock database tables, file downloads, and backups.</p>
      <form onsubmit="submitQuickLogin(event)" style="display:flex; flex-wrap:wrap; gap:0.6rem; justify-content:center; max-width:480px; margin:0 auto;">
        <input type="text" id="ql-user" required placeholder="Username or email" style="flex:1; min-width:130px; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:10px; padding:0.55rem 0.85rem; color:#fff; font-size:0.85rem;" />
        <input type="password" id="ql-pass" required placeholder="Password" style="flex:1; min-width:130px; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:10px; padding:0.55rem 0.85rem; color:#fff; font-size:0.85rem;" />
        <button type="submit" class="btn btn-primary" id="btn-quick-login">Sign In &amp; Unlock</button>
      </form>
    </div>

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
          <h3>Active Profile</h3>
          <div class="val" style="color:#38bdf8;" id="stat-profile">Profile A</div>
          <div class="sub" id="stat-tier">Legacy &amp; Lightweight Mobile</div>
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
        <h3 style="margin-bottom:1rem; color:#fff;">Profile A Supported Features (Maximum Lightweight Suite)</h3>
        <ul id="capabilities-list" style="list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:0.65rem; font-size:0.85rem; color:#cbd5e1;">
          <li>✅ Embedded File-Backed Database (WAL Engine)</li>
          <li>✅ Local REST &amp; RBAC Authentication Service</li>
          <li>✅ Secure Private File Storage &amp; Blob Downloads</li>
          <li>✅ Sandboxed File Manager &amp; System Directory Browser</li>
          <li>✅ Application &amp; Web Hosting Supervisor</li>
          <li>✅ Native Mobile Wakelock &amp; Battery Saver Protection</li>
          <li>✅ Automated SHA-256 Backups &amp; Snapshots</li>
          <li>✅ Hardware Inspection &amp; Profile Simulator</li>
          <li>✅ Interactive Live REST API Explorer</li>
        </ul>
      </div>
    </div>

    <!-- DATABASE TAB -->
    <div id="tab-database" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
          <h3 style="color:#fff;">Database Tables</h3>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="openCreateTableModal()">🛠️ New Table</button>
            <button class="btn btn-primary" onclick="openInsertRowModal()">➕ Insert Row</button>
            <button class="btn btn-secondary" onclick="loadTables()">🔄 Refresh</button>
          </div>
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
      <!-- File Upload Card -->
      <div class="cute-card" style="margin-bottom:1.25rem;">
        <h3 style="color:#fff; margin-bottom:0.75rem;">📤 Upload File to Smartphone</h3>
        <form onsubmit="submitFileUpload(event)" style="display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center;">
          <input type="file" id="file-picker" required style="background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.45rem; color:#fff; font-size:0.85rem;" />
          <input type="text" id="file-desc" placeholder="File description (optional)..." style="flex:1; min-width:180px; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.55rem 0.85rem; color:#fff; font-size:0.85rem;" />
          <button type="submit" class="btn btn-primary" id="btn-upload">Upload File</button>
        </form>
      </div>

      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="color:#fff;">Stored Files &amp; Assets</h3>
          <button class="btn btn-secondary" onclick="loadFiles()">Refresh Files</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>File Name</th><th>Size</th><th>Created</th><th>MIME</th><th>Action</th></tr></thead>
            <tbody id="files-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading files...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FILE MANAGER TAB (Profile A Feature) -->
    <div id="tab-filemanager" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h3 style="color:#fff;">Server File Browser</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);" id="fm-current-path">Browsing: /</p>
          </div>
          <button class="btn btn-secondary" onclick="loadFileManager('/')">Refresh Directory</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th>Actions</th></tr></thead>
            <tbody id="fm-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading directory...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- APPS TAB (Profile A Feature) -->
    <div id="tab-apps" class="hidden">
      <div class="cute-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <h3 style="color:#fff;">Hosted Web Applications</h3>
          <button class="btn btn-secondary" onclick="loadApps()">Refresh Apps</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>App Name</th><th>Type</th><th>Port</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="apps-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading apps...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DIAGNOSTICS & PROFILE SIMULATOR TAB -->
    <div id="tab-diagnostics" class="hidden">
      <!-- Hardware Profile Switcher -->
      <div class="cute-card" style="margin-bottom:1.25rem;">
        <h3 style="color:#fff; margin-bottom:0.5rem;">🔄 Hardware Profile Simulator</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.85rem;">Switch between hardware tiers to test Profile A, Profile B, and Profile C maximum features dynamically.</p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="switchProfile('profile_a')">Profile A (Lightweight Mobile)</button>
          <button class="btn btn-secondary" onclick="switchProfile('profile_b')">Profile B (Standard Server)</button>
          <button class="btn btn-secondary" onclick="switchProfile('profile_c')">Profile C (High Performance)</button>
          <button class="btn btn-secondary" onclick="switchProfile('auto')">Auto-Detect</button>
        </div>
      </div>

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
            <thead><tr><th>Backup ID</th><th>Filename</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
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
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/storage/files')">GET /api/v1/storage/files</button>
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
          <input type="text" id="bs-token" required placeholder="Found in .androbase_data/.bootstrap_token" />
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
          <a href="javascript:void(0)" onclick="closeLoginModal(); openBootstrapModal();" style="color:#10b981; font-size:0.8rem; text-decoration:none; font-weight:600;">
            🔑 First time here? Click to set up admin account
          </a>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeLoginModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Insert Row Modal -->
  <div id="insert-row-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">➕</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Insert Table Record</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Insert a new JSON row record into your portable database.</p>
      <form onsubmit="submitInsertRow(event)">
        <div class="input-group">
          <label>Target Table</label>
          <select id="ins-table-select"></select>
        </div>
        <div class="input-group">
          <label>Record Data (JSON)</label>
          <textarea id="ins-record-json" rows="6" required style="font-family:'JetBrains Mono',monospace; font-size:0.85rem; color:#34d399;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeInsertRowModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Create Table Modal -->
  <div id="create-table-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
        <span style="font-size:1.2rem;">🛠️</span>
        <h2 style="font-size:1.15rem; font-weight:700;">Create Custom Table</h2>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Define a new relational schema on your smartphone.</p>
      <form onsubmit="submitCreateTable(event)">
        <div class="input-group">
          <label>Table Name</label>
          <input type="text" id="new-tbl-name" required placeholder="e.g. notes, telemetry, items" />
        </div>
        <div class="input-group">
          <label>Primary Key Column</label>
          <input type="text" id="new-tbl-pk" required value="id" />
        </div>
        <div class="input-group">
          <label>Columns (JSON Array: name, type)</label>
          <textarea id="new-tbl-cols" rows="5" required style="font-family:'JetBrains Mono',monospace; font-size:0.85rem; color:#38bdf8;">[
  { "name": "title", "type": "string", "required": true },
  { "name": "status", "type": "string" },
  { "name": "created_at", "type": "date" }
]</textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeCreateTableModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Table</button>
        </div>
      </form>
    </div>
  </div>

  <!-- View Rows Modal -->
  <div id="view-rows-modal" class="modal-backdrop hidden">
    <div class="modal-card" style="max-width:760px; max-height:85vh; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h2 style="font-size:1.15rem; font-weight:700;" id="vr-title">Table Records</h2>
          <p style="font-size:0.8rem; color:var(--text-muted);" id="vr-subtitle">Showing records</p>
        </div>
        <button class="btn btn-secondary" onclick="closeViewRowsModal()">Close</button>
      </div>
      <div style="overflow:auto; flex:1;" id="vr-content">
        <p style="color:var(--text-muted);">Loading rows...</p>
      </div>
    </div>
  </div>

  <script>
    // In-memory token cache to guard against mobile/iframe storage partitioning
    let _memoryToken = '';
    let _memoryUser = null;

    function getStoredToken() {
      if (_memoryToken) return _memoryToken;
      try {
        const s = sessionStorage.getItem('androbase_auth_token') || sessionStorage.getItem('androbase_jwt');
        if (s) { _memoryToken = s; return s; }
      } catch(e) {}
      try {
        const l = localStorage.getItem('androbase_auth_token') || localStorage.getItem('androbase_jwt');
        if (l) { _memoryToken = l; return l; }
      } catch(e) {}
      if (document.cookie) {
        const m = document.cookie.match(/(?:^|;\s*)androbase_token=([^;]+)/);
        if (m) {
          const val = decodeURIComponent(m[1]);
          _memoryToken = val;
          return val;
        }
      }
      return '';
    }

    function setStoredToken(token, user) {
      _memoryToken = token || '';
      _memoryUser = user || null;
      if (!token) {
        try {
          sessionStorage.removeItem('androbase_auth_token');
          sessionStorage.removeItem('androbase_jwt');
          sessionStorage.removeItem('androbase_auth_user');
        } catch(e) {}
        try {
          localStorage.removeItem('androbase_auth_token');
          localStorage.removeItem('androbase_jwt');
          localStorage.removeItem('androbase_auth_user');
        } catch(e) {}
        try {
          document.cookie = 'androbase_token=; path=/; max-age=0; SameSite=Lax';
        } catch(e) {}
        return;
      }
      try {
        sessionStorage.setItem('androbase_auth_token', token);
        sessionStorage.setItem('androbase_jwt', token);
        if (user) sessionStorage.setItem('androbase_auth_user', JSON.stringify(user));
      } catch(e) {}
      try {
        localStorage.setItem('androbase_auth_token', token);
        localStorage.setItem('androbase_jwt', token);
        if (user) localStorage.setItem('androbase_auth_user', JSON.stringify(user));
      } catch(e) {}
      try {
        document.cookie = 'androbase_token=' + encodeURIComponent(token) + '; path=/; SameSite=Lax; max-age=259200';
      } catch(e) {}
    }

    function getHeaders() {
      const h = { 'Content-Type': 'application/json' };
      const token = getStoredToken();
      if (token) {
        h['Authorization'] = 'Bearer ' + token;
        h['x-auth-token'] = token;
        h['x-access-token'] = token;
      }
      return h;
    }

    async function api(path, opts = {}) {
      const token = getStoredToken();
      opts.headers = Object.assign(getHeaders(), opts.headers || {});
      if (token && !path.includes('token=')) {
        const sep = path.includes('?') ? '&' : '?';
        path = path + sep + 'token=' + encodeURIComponent(token);
      }
      const res = await fetch(path, opts);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (data.requiresLogin || data.tokenInvalid || String(data.error || '').includes('expired') || String(data.error || '').includes('Authentication required') || path.includes('/auth/me')) {
          setStoredToken('', null);
          updateAuthUI();
          if (!path.includes('/auth/login') && !path.includes('/auth/bootstrap')) {
            openLoginModal();
          }
        }
      }
      return data;
    }

    // Authenticated Blob File Downloader: Works in all iframes and mobile webviews
    async function downloadFileWithAuth(url, filename) {
      const token = getStoredToken();
      if (!token) {
        alert('Authentication required to download this file. Please sign in with your username and password.');
        openLoginModal();
        return;
      }

      const sep = url.includes('?') ? '&' : '?';
      const fetchUrl = token && !url.includes('token=') ? (url + sep + 'token=' + encodeURIComponent(token)) : url;
      const headers = {};
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
        headers['x-auth-token'] = token;
        headers['x-access-token'] = token;
      }

      try {
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 401) {
            alert(errData.error || 'Authentication required to download. Please sign in.');
            openLoginModal();
          } else {
            alert('Download failed: ' + (errData.error || res.statusText));
          }
          return;
        }

        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objectUrl;
        a.download = filename || 'download';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
          document.body.removeChild(a);
        }, 1000);
      } catch (err) {
        alert('Download request failed: ' + err.message);
      }
    }

    let currentTab = 'overview';

    function switchTab(tabId) {
      currentTab = tabId;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('main > div[id^="tab-"]').forEach(d => d.classList.add('hidden'));
      if (event && event.target && event.target.classList) {
        event.target.classList.add('active');
      }
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.remove('hidden');

      const token = getStoredToken();
      if (['database', 'storage', 'filemanager', 'apps', 'backups'].includes(tabId) && !token) {
        // Will show locked prompt in the table area
      }

      if (tabId === 'database') loadTables();
      if (tabId === 'storage') loadFiles();
      if (tabId === 'filemanager') loadFileManager('/');
      if (tabId === 'apps') loadApps();
      if (tabId === 'diagnostics') loadDiagnostics();
      if (tabId === 'backups') loadBackups();
    }

    function updateAuthUI() {
      const token = getStoredToken();
      const btnAuth = document.getElementById('btn-auth-action');
      const userDisplay = document.getElementById('user-display');
      const lockCard = document.getElementById('lock-screen-card');

      if (token) {
        btnAuth.textContent = 'Logout';
        let username = 'Admin';
        try {
          const uRaw = sessionStorage.getItem('androbase_auth_user') || localStorage.getItem('androbase_auth_user');
          if (uRaw) username = JSON.parse(uRaw).username || 'Admin';
        } catch(e) {}
        userDisplay.style.display = 'inline-flex';
        userDisplay.textContent = username;
        if (lockCard) lockCard.classList.add('hidden');
      } else {
        btnAuth.textContent = 'Login';
        userDisplay.style.display = 'none';
        if (serverHasAdmin && lockCard) {
          lockCard.classList.remove('hidden');
        }
      }
    }

    let serverHasAdmin = false;

    async function refreshStatus() {
      try {
        const d = await api('/api/v1/status');
        document.getElementById('stat-status').textContent = d.status === 'online' ? 'Online' : (d.status || 'Active');
        document.getElementById('stat-uptime').textContent = 'Uptime: ' + Math.floor((d.uptimeSeconds || 0) / 60) + 'm ' + ((d.uptimeSeconds || 0) % 60) + 's';

        const profileStr = d.profileName || d.profile || 'Profile A';
        document.getElementById('stat-profile').textContent = profileStr.split('—')[0].trim();
        document.getElementById('stat-tier').textContent = profileStr.includes('—') ? profileStr.split('—')[1].trim() : 'Legacy & Lightweight Mobile';
        document.getElementById('hdr-profile').textContent = profileStr.split('—')[0].trim();

        const freeMb = (d.device && d.device.freeMemoryMb != null) ? d.device.freeMemoryMb : (d.memory ? d.memory.freeMb : '--');
        const totalMb = (d.device && d.device.totalMemoryMb != null) ? d.device.totalMemoryMb : (d.memory ? d.memory.totalMb : '--');
        const heapLimit = (d.device && d.device.heapLimitMb != null) ? d.device.heapLimitMb : 256;
        document.getElementById('stat-mem').textContent = freeMb + ' / ' + totalMb + ' MB';
        document.getElementById('stat-mem-sub').textContent = 'V8 Limit: ' + heapLimit + ' MB';

        const lanIp = (d.network && d.network.lanIps && d.network.lanIps[0]) ? d.network.lanIps[0] : '127.0.0.1';
        const port = (d.network && d.network.port) || 3000;
        document.getElementById('stat-lan').textContent = lanIp + ':' + port;

        serverHasAdmin = !!d.hasAdmin;
        const banner = document.getElementById('bootstrap-banner');
        const btnSetup = document.getElementById('btn-setup-admin');
        const cardSetup = document.getElementById('overview-setup-card');
        const lockCard = document.getElementById('lock-screen-card');

        if (!serverHasAdmin) {
          if (banner) banner.classList.remove('hidden');
          if (btnSetup) btnSetup.style.display = 'inline-flex';
          if (cardSetup) cardSetup.classList.remove('hidden');
          if (lockCard) lockCard.classList.add('hidden');
          if (!sessionStorage.getItem('androbase_auto_bootstrap_shown')) {
            sessionStorage.setItem('androbase_auto_bootstrap_shown', 'true');
            openBootstrapModal();
          }
        } else {
          if (banner) banner.classList.add('hidden');
          if (btnSetup) btnSetup.style.display = 'none';
          if (cardSetup) cardSetup.classList.add('hidden');
          const token = getStoredToken();
          if (!token && lockCard) {
            lockCard.classList.remove('hidden');
          } else if (lockCard) {
            lockCard.classList.add('hidden');
          }
        }

        updateAuthUI();
      } catch (e) {
        console.error('Failed to load status', e);
      }
    }

    let currentViewingTable = '';

    async function loadTables() {
      const token = getStoredToken();
      const tb = document.getElementById('tables-tbody');
      if (!token) {
        if (tb) tb.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 Server Locked. Administrator sign in required to view database tables.</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to View Database</button></td></tr>';
        return;
      }
      try {
        const d = await api('/api/v1/db/tables');
        if (d.error && (d.requiresLogin || String(d.error).includes('Authentication required') || String(d.error).includes('expired'))) {
          if (tb) tb.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 ' + d.error + '</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Server</button></td></tr>';
          return;
        }
        const list = Array.isArray(d) ? d : (d.tables || d.data || []);
        const sel = document.getElementById('ins-table-select');
        if (sel) {
          sel.innerHTML = list.map(t => '<option value="' + t.name + '">' + t.name + '</option>').join('');
        }

        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">No tables created yet. Click "New Table" above to create one.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(t => '<tr><td><strong>' + t.name + '</strong></td><td>' + (t.rowCount != null ? t.rowCount : (t.recordCount || 0)) + ' rows</td><td><div style="display:flex; gap:0.4rem; align-items:center;"><button class="btn btn-secondary" onclick="viewTable(\\'' + t.name + '\\')">Query Rows</button><button class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="openInsertRowModal(\\'' + t.name + '\\')">➕ Add Row</button>' + (t.name.startsWith('_') ? '' : '<button class="btn btn-secondary" style="color:#f43f5e; padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="dropTable(\\'' + t.name + '\\')">🗑️</button>') + '</div></td></tr>').join('');
      } catch (e) {
        if (tb) tb.innerHTML = '<tr><td colspan="3" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load tables: ' + e.message + '</td></tr>';
      }
    }

    async function viewTable(name) {
      currentViewingTable = name;
      document.getElementById('view-rows-modal').classList.remove('hidden');
      document.getElementById('vr-title').textContent = 'Table: ' + name;
      document.getElementById('vr-subtitle').textContent = 'Loading records...';
      const c = document.getElementById('vr-content');
      c.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Fetching records from mobile database...</p>';

      try {
        const d = await api('/api/v1/db/' + name + '/query', { method: 'POST', body: JSON.stringify({ limit: 50 }) });
        const records = d.records || d.data || (Array.isArray(d) ? d : []);
        const total = d.total != null ? d.total : records.length;
        document.getElementById('vr-subtitle').textContent = 'Showing ' + records.length + ' of ' + total + ' records';

        if (records.length === 0) {
          c.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);"><p>No records in table "' + name + '".</p><button class="btn btn-primary" style="margin-top:0.75rem;" onclick="closeViewRowsModal(); openInsertRowModal(\\'' + name + '\\');">➕ Insert First Record</button></div>';
          return;
        }

        const keys = Object.keys(records[0]);
        let html = '<div style="overflow-x:auto;"><table><thead><tr>';
        keys.forEach(k => { html += '<th>' + k + '</th>'; });
        html += '<th style="text-align:right;">Actions</th></tr></thead><tbody>';
        records.forEach(r => {
          html += '<tr>';
          keys.forEach(k => {
            const val = typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k] != null ? r[k] : '');
            html += '<td style="font-family:monospace; font-size:0.8rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + val.replace(/"/g, '&quot;') + '">' + val + '</td>';
          });
          const id = r.id || r._id || r[keys[0]];
          html += '<td style="text-align:right;"><button class="btn btn-secondary" style="color:#f43f5e; padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="deleteRow(\\'' + name + '\\', \\'' + id + '\\')">Delete</button></td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        c.innerHTML = html;
      } catch (e) {
        c.innerHTML = '<div style="color:#ef4444; padding:1rem;">Error querying table: ' + e.message + '</div>';
      }
    }

    function closeViewRowsModal() {
      document.getElementById('view-rows-modal').classList.add('hidden');
    }

    async function deleteRow(tableName, id) {
      if (!confirm('Are you sure you want to delete this row?')) return;
      try {
        await api('/api/v1/db/records/' + tableName + '/' + id, { method: 'DELETE' });
        viewTable(tableName);
        loadTables();
      } catch (e) {
        alert('Failed to delete row: ' + e.message);
      }
    }

    function openInsertRowModal(tableName) {
      document.getElementById('insert-row-modal').classList.remove('hidden');
      if (tableName) {
        const sel = document.getElementById('ins-table-select');
        if (sel) sel.value = tableName;
      }
      const t = document.getElementById('ins-table-select').value;
      if (t === 'notes') {
        document.getElementById('ins-record-json').value = JSON.stringify({
          title: "My Note on Phone",
          content: "Stored on Android smartphone via AndroBase Profile A!",
          tags: ["android", "mobile", "database"]
        }, null, 2);
      } else {
        document.getElementById('ins-record-json').value = JSON.stringify({
          title: "Sample entry",
          status: "active",
          created_at: new Date().toISOString()
        }, null, 2);
      }
    }

    function closeInsertRowModal() {
      document.getElementById('insert-row-modal').classList.add('hidden');
    }

    async function submitInsertRow(e) {
      e.preventDefault();
      const tableName = document.getElementById('ins-table-select').value;
      const rawJson = document.getElementById('ins-record-json').value;
      let record;
      try {
        record = JSON.parse(rawJson);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
        return;
      }

      try {
        await api('/api/v1/db/records/' + tableName, {
          method: 'POST',
          body: JSON.stringify(record)
        });
        alert('Record inserted successfully into table "' + tableName + '"!');
        closeInsertRowModal();
        loadTables();
        if (currentViewingTable === tableName) {
          viewTable(tableName);
        }
      } catch (err) {
        alert('Failed to insert record: ' + err.message);
      }
    }

    function openCreateTableModal() {
      document.getElementById('create-table-modal').classList.remove('hidden');
    }

    function closeCreateTableModal() {
      document.getElementById('create-table-modal').classList.add('hidden');
    }

    async function submitCreateTable(e) {
      e.preventDefault();
      const name = document.getElementById('new-tbl-name').value.trim();
      const primaryKey = document.getElementById('new-tbl-pk').value.trim() || 'id';
      let columns;
      try {
        columns = JSON.parse(document.getElementById('new-tbl-cols').value);
      } catch (err) {
        alert('Invalid Columns JSON: ' + err.message);
        return;
      }

      try {
        await api('/api/v1/db/tables', {
          method: 'POST',
          body: JSON.stringify({ name, primaryKey, columns })
        });
        alert('Table "' + name + '" created successfully!');
        closeCreateTableModal();
        loadTables();
      } catch (err) {
        alert('Failed to create table: ' + err.message);
      }
    }

    async function dropTable(name) {
      if (!confirm('Are you sure you want to drop table "' + name + '" and delete all records?')) return;
      try {
        await api('/api/v1/db/tables/' + name, { method: 'DELETE' });
        alert('Table "' + name + '" dropped.');
        loadTables();
      } catch (err) {
        alert('Failed to drop table: ' + err.message);
      }
    }

    async function submitFileUpload(e) {
      e.preventDefault();
      const token = getStoredToken();
      if (!token) {
        alert('Please sign in to upload files.');
        openLoginModal();
        return;
      }

      const picker = document.getElementById('file-picker');
      const desc = document.getElementById('file-desc').value;
      const btn = document.getElementById('btn-upload');

      if (!picker.files || !picker.files[0]) {
        alert('Please choose a file to upload.');
        return;
      }

      const file = picker.files[0];
      const formData = new FormData();
      formData.append('file', file);
      if (desc) formData.append('description', desc);

      btn.disabled = true;
      btn.textContent = 'Uploading...';

      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
          headers['x-auth-token'] = token;
          headers['x-access-token'] = token;
        }
        const uploadUrl = token ? ('/api/v1/storage/files?token=' + encodeURIComponent(token)) : '/api/v1/storage/files';
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers,
          body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          alert('File "' + file.name + '" uploaded successfully!');
          picker.value = '';
          document.getElementById('file-desc').value = '';
          loadFiles();
        } else {
          if (res.status === 401) {
            alert(data.error || 'Authentication required to upload. Please sign in.');
            openLoginModal();
          } else {
            alert('Upload failed: ' + (data.error || 'Server error'));
          }
        }
      } catch (err) {
        alert('Upload request failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload File';
      }
    }

    async function deleteFile(id, name) {
      if (!confirm('Are you sure you want to delete file "' + name + '"?')) return;
      try {
        await api('/api/v1/storage/files/' + id, { method: 'DELETE' });
        alert('File deleted.');
        loadFiles();
      } catch (err) {
        alert('Failed to delete file: ' + err.message);
      }
    }

    async function loadFiles() {
      const token = getStoredToken();
      const tb = document.getElementById('files-tbody');
      if (!token) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 Server Locked. Administrator sign in required to access files.</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In with Username &amp; Password</button></td></tr>';
        return;
      }
      try {
        const d = await api('/api/v1/storage/files');
        if (d.error && (d.requiresLogin || String(d.error).includes('Authentication required') || String(d.error).includes('expired'))) {
          if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 ' + d.error + '</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Server</button></td></tr>';
          return;
        }
        const list = Array.isArray(d) ? d : (d.files || d.data || []);
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No files uploaded yet. Use the upload box above to add files.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(f => {
          const name = f.originalName || f.name || 'file';
          const safeName = name.replace(/'/g, "\\'");
          return '<tr><td><strong>' + name + '</strong></td><td>' + ((f.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (f.uploadedAt || f.createdAt || '').split('T')[0] + '</td><td><code>' + (f.mimeType || 'unknown') + '</code></td><td><div style="display:flex; gap:0.4rem; align-items:center;"><button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="downloadFileWithAuth(\\'/api/v1/storage/' + f.id + '\\', \\'' + safeName + '\\')">⬇️ Download</button><button class="btn btn-secondary" style="color:#f43f5e; padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="deleteFile(\\'' + f.id + '\\', \\'' + safeName + '\\')">🗑️</button></div></td></tr>';
        }).join('');
      } catch (e) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load files: ' + e.message + '</td></tr>';
      }
    }

    async function loadFileManager(dirPath = '/') {
      const token = getStoredToken();
      const tb = document.getElementById('fm-tbody');
      const pathEl = document.getElementById('fm-current-path');
      if (pathEl) pathEl.textContent = 'Browsing: ' + dirPath;

      if (!token) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 Server Locked. Administrator sign in required to browse files.</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Browse Files</button></td></tr>';
        return;
      }
      try {
        const d = await api('/api/v1/files/list?path=' + encodeURIComponent(dirPath));
        if (d.error) {
          if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:2rem;">' + d.error + '</td></tr>';
          return;
        }
        const entries = d.entries || [];
        if (entries.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Empty directory.</td></tr>';
          return;
        }
        tb.innerHTML = entries.map(e => {
          const isDir = e.type === 'directory';
          const icon = isDir ? '📁' : '📄';
          const safePath = e.path.replace(/'/g, "\\'");
          const safeName = e.name.replace(/'/g, "\\'");
          return '<tr><td>' + icon + ' <strong>' + e.name + '</strong></td><td><code>' + e.type + '</code></td><td>' + (isDir ? '--' : ((e.size || 0) / 1024).toFixed(1) + ' KB') + '</td><td>' + (e.modifiedAt || '').split('T')[0] + '</td><td><div style="display:flex; gap:0.4rem; align-items:center;">' + (isDir ? '<button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="loadFileManager(\\'' + safePath + '\\')">Open</button>' : '<button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="downloadFileWithAuth(\\'/api/v1/files/download?path=' + encodeURIComponent(e.path) + '\\', \\'' + safeName + '\\')">⬇️ Download</button>') + '</div></td></tr>';
        }).join('');
      } catch (e) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to list directory: ' + e.message + '</td></tr>';
      }
    }

    async function loadApps() {
      const token = getStoredToken();
      const tb = document.getElementById('apps-tbody');
      if (!token) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 Server Locked. Administrator sign in required to manage apps.</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Manage Apps</button></td></tr>';
        return;
      }
      try {
        const d = await api('/api/v1/apps');
        const list = Array.isArray(d) ? d : (d.apps || []);
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No web applications registered. Standard Profile A services running cleanly.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(a => '<tr><td><strong>' + a.name + '</strong></td><td><code>' + a.type + '</code></td><td>:' + a.port + '</td><td><span class="badge badge-success">' + a.status + '</span></td><td><button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;">Manage</button></td></tr>').join('');
      } catch (e) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load apps: ' + e.message + '</td></tr>';
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

    async function switchProfile(p) {
      const token = getStoredToken();
      if (!token) {
        alert('Administrator sign in required to change hardware profile simulation.');
        openLoginModal();
        return;
      }
      try {
        const res = await api('/api/v1/system/profile', {
          method: 'POST',
          body: JSON.stringify({ profile: p })
        });
        alert(res.message || 'Profile updated successfully.');
        refreshStatus();
        loadDiagnostics();
      } catch (e) {
        alert('Failed to switch profile: ' + e.message);
      }
    }

    async function loadBackups() {
      const token = getStoredToken();
      const tb = document.getElementById('backups-tbody');
      if (!token) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 Server Locked. Administrator sign in required to manage backups.</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Manage Backups</button></td></tr>';
        return;
      }
      try {
        const d = await api('/api/v1/backups');
        if (d.error && (d.requiresLogin || String(d.error).includes('Authentication required') || String(d.error).includes('expired'))) {
          if (tb) tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem;"><div style="color:var(--text-muted); font-size:0.95rem; margin-bottom:0.75rem;">🔒 ' + d.error + '</div><button class="btn btn-primary" onclick="openLoginModal()">Sign In to Server</button></td></tr>';
          return;
        }
        const list = Array.isArray(d) ? d : (d.backups || d.data || []);
        if (list.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No snapshot backups created yet.</td></tr>';
          return;
        }
        tb.innerHTML = list.map(b => {
          const safeFn = b.filename.replace(/'/g, "\\'");
          return '<tr><td><code>' + (b.id ? b.id.substring(0,8) : '--') + '</code></td><td><strong>' + b.filename + '</strong></td><td>' + ((b.sizeBytes || 0) / 1024).toFixed(1) + ' KB</td><td>' + (b.createdAt || '').split('T')[0] + '</td><td><div style="display:flex; gap:0.4rem; align-items:center;"><button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="downloadFileWithAuth(\\'/api/v1/backup/download/' + safeFn + '\\', \\'' + safeFn + '\\')">⬇️ Export</button></div></td></tr>';
        }).join('');
      } catch (e) {
        if (tb) tb.innerHTML = '<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load backups: ' + e.message + '</td></tr>';
      }
    }

    async function createBackup() {
      const token = getStoredToken();
      if (!token) {
        alert('Please sign in to create backups.');
        openLoginModal();
        return;
      }
      try {
        const d = await api('/api/v1/backups', { method: 'POST', body: JSON.stringify({ label: 'manual' }) });
        alert('Snapshot created successfully! Archive: ' + (d.backup ? d.backup.filename : 'snapshot.json'));
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
    function openLoginModal() { document.getElementById('login-modal').classList.remove('hidden'); }
    function closeLoginModal() { document.getElementById('login-modal').classList.add('hidden'); }

    function toggleAuthModal() {
      const token = getStoredToken();
      if (token) {
        setStoredToken('', null);
        updateAuthUI();
        refreshStatus();
        switchTab(currentTab);
      } else {
        openLoginModal();
      }
    }

    async function submitQuickLogin(e) {
      e.preventDefault();
      const username = document.getElementById('ql-user').value.trim();
      const password = document.getElementById('ql-pass').value;
      const btn = document.getElementById('btn-quick-login');
      btn.disabled = true;
      btn.textContent = 'Verifying...';

      try {
        const res = await api('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: username, username, password })
        });
        if (res.token) {
          setStoredToken(res.token, res.user);
          document.getElementById('ql-pass').value = '';
          updateAuthUI();
          refreshStatus();
          switchTab(currentTab);
        } else {
          alert('Login failed: ' + (res.error || 'Invalid credentials'));
        }
      } catch (err) {
        alert('Login request failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In & Unlock';
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
          setStoredToken(res.token, res.user);
          closeLoginModal();
          document.getElementById('lg-pass').value = '';
          updateAuthUI();
          refreshStatus();
          switchTab(currentTab);
        } else {
          alert('Login failed: ' + (res.error || 'Invalid credentials'));
        }
      } catch (err) {
        alert('Login request failed: ' + err.message);
      }
    }

    async function submitBootstrap(e) {
      e.preventDefault();
      const token = document.getElementById('bs-token').value.trim();
      const username = document.getElementById('bs-user').value.trim();
      const password = document.getElementById('bs-pass').value;
      try {
        const res = await api('/api/v1/auth/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ bootstrapToken: token, username, password })
        });
        if (res.token) {
          setStoredToken(res.token, res.user);
          alert('Admin initialized successfully!');
          closeBootstrapModal();
          updateAuthUI();
          refreshStatus();
          switchTab(currentTab);
        } else {
          alert('Bootstrap error: ' + (res.error || 'Failed'));
        }
      } catch (err) {
        alert('Bootstrap request failed: ' + err.message);
      }
    }

    // Initial load
    refreshStatus();
    setInterval(refreshStatus, 10000);
  </script>
</body>
</html>`;
}
