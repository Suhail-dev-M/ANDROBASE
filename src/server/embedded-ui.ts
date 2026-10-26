/**
 * AndroBase - Open-Source Mobile Server Platform
 * Self-Contained Embedded Web Management Console
 * Ensures the server provides a full GUI dashboard even when dist/ is not pre-compiled on the phone.
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEmbeddedDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AndroBase — Mobile Server Console</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2'><rect width='14' height='20' x='5' y='2' rx='2'/><path d='M12 18h.01'/></svg>">
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --card-border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #10b981;
      --accent-hover: #059669;
      --cyan: #06b6d4;
      --red: #ef4444;
      --yellow: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #0b1120; border-bottom: 1px solid var(--card-border); padding: 0.85rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 40; }
    .brand { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1.15rem; color: #fff; letter-spacing: -0.02em; }
    .brand-icon { width: 28px; height: 28px; background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .nav-tabs { display: flex; gap: 0.4rem; overflow-x: auto; padding: 0.75rem 1.5rem; background: #0d1526; border-bottom: 1px solid var(--card-border); }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 500; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .tab-btn.active { color: #fff; background: #1e293b; border-bottom: 2px solid var(--accent); }
    main { max-width: 1200px; width: 100%; margin: 0 auto; padding: 1.5rem; flex: 1; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 10px; padding: 1.25rem; }
    .card h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem; }
    .card .val { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .card .sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: #1f2937; color: var(--text); border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }
    .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.55rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .banner { background: linear-gradient(90deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1)); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; gap: 1rem; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    th { background: #0d1526; padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--card-border); color: var(--text-muted); font-weight: 600; }
    td { padding: 0.65rem 0.85rem; border-bottom: 1px solid #1a2234; color: var(--text); word-break: break-all; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
    .modal-card { background: #111827; border: 1px solid #374151; border-radius: 12px; width: 100%; max-width: 440px; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .input-group { margin-bottom: 1rem; }
    .input-group label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; color: var(--text-muted); }
    .input-group input { width: 100%; background: #0b1120; border: 1px solid #374151; border-radius: 6px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.9rem; }
    .input-group input:focus { outline: none; border-color: var(--accent); }
    .hidden { display: none !important; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0b1120; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">📱</div>
      <span>ANDROBASE</span>
      <span class="badge badge-success" id="hdr-profile">Profile C</span>
    </div>
    <div style="display:flex; align-items:center; gap:0.75rem;">
      <span id="user-display" class="badge badge-warning" style="display:none;">Admin</span>
      <button class="btn btn-secondary" id="btn-auth-action" onclick="toggleAuthModal()">Login</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
    <button class="tab-btn" onclick="switchTab('database')">Database</button>
    <button class="tab-btn" onclick="switchTab('storage')">Storage</button>
    <button class="tab-btn" onclick="switchTab('diagnostics')">Diagnostics</button>
    <button class="tab-btn" onclick="switchTab('backups')">Backups</button>
    <button class="tab-btn" onclick="switchTab('api')">API Explorer</button>
  </nav>

  <main>
    <!-- Admin Setup Alert -->
    <div id="bootstrap-banner" class="banner hidden">
      <div>
        <strong style="color:#10b981;">🔑 Admin Setup Required</strong>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">This server has no admin configured. Check Termux console or <code>.androbase/.bootstrap_token</code> to complete initial setup.</p>
      </div>
      <button class="btn btn-primary" onclick="openBootstrapModal()">Set Up Admin</button>
    </div>

    <!-- OVERVIEW TAB -->
    <div id="tab-overview">
      <div class="grid">
        <div class="card">
          <h3>Server Status</h3>
          <div class="val" style="color:#34d399;" id="stat-status">Healthy</div>
          <div class="sub" id="stat-uptime">Uptime: 0m</div>
        </div>
        <div class="card">
          <h3>Device Profile</h3>
          <div class="val" style="color:#38bdf8;" id="stat-profile">Profile C</div>
          <div class="sub" id="stat-tier">Android 12+ / 64-bit</div>
        </div>
        <div class="card">
          <h3>System Memory</h3>
          <div class="val" id="stat-mem">-- / -- MB</div>
          <div class="sub" id="stat-mem-sub">V8 Heap: -- MB</div>
        </div>
        <div class="card">
          <h3>Active Network</h3>
          <div class="val" id="stat-lan" style="font-size:1.15rem; word-break:break-all;">127.0.0.1:3000</div>
          <div class="sub">LAN Access Enabled</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:1rem;">Enabled Platform Capabilities</h3>
        <ul id="capabilities-list" style="list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.5rem; font-size:0.85rem;">
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
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3>Database Tables</h3>
          <button class="btn btn-primary" onclick="loadTables()">Refresh Tables</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Table Name</th><th>Record Count</th><th>Actions</th></tr></thead>
            <tbody id="tables-tbody"><tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Loading tables...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- STORAGE TAB -->
    <div id="tab-storage" class="hidden">
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3>Stored Files &amp; Assets</h3>
          <button class="btn btn-primary" onclick="loadFiles()">Refresh Files</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>File Name</th><th>Size</th><th>Created</th><th>MIME</th><th>Action</th></tr></thead>
            <tbody id="files-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Loading files...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DIAGNOSTICS TAB -->
    <div id="tab-diagnostics" class="hidden">
      <div class="card">
        <h3 style="margin-bottom:1rem;">Hardware &amp; Environment Inspection</h3>
        <div id="diagnostics-content" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1rem;">
          <div style="color:var(--text-muted);">Loading diagnostic report...</div>
        </div>
      </div>
    </div>

    <!-- BACKUPS TAB -->
    <div id="tab-backups" class="hidden">
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3>Database &amp; Data Snapshots</h3>
          <button class="btn btn-primary" onclick="createBackup()">Create Snapshot</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Backup ID</th><th>Filename</th><th>Size</th><th>Created</th><th>SHA-256</th></tr></thead>
            <tbody id="backups-tbody"><tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Loading backups...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- API EXPLORER TAB -->
    <div id="tab-api" class="hidden">
      <div class="card">
        <h3 style="margin-bottom:1rem;">Live REST API Explorer</h3>
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/health')">GET /api/v1/health</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/status')">GET /api/v1/status</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/capabilities')">GET /api/v1/capabilities</button>
          <button class="btn btn-secondary" onclick="testEndpoint('/api/v1/db/tables')">GET /api/v1/db/tables</button>
        </div>
        <pre id="api-output" style="background:#0b1120; padding:1rem; border-radius:8px; border:1px solid #1f2937; overflow:auto; max-height:400px; font-size:0.8rem; color:#38bdf8;">Click an endpoint above to run a live query.</pre>
      </div>
    </div>
  </main>

  <!-- Bootstrap Modal -->
  <div id="bootstrap-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <h2 style="font-size:1.15rem; margin-bottom:0.5rem;">🔑 Admin Bootstrap Setup</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Enter the bootstrap token printed to your Termux console during initial startup.</p>
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
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.25rem;">
          <button type="button" class="btn btn-secondary" onclick="closeBootstrapModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Initialize Admin</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Login Modal -->
  <div id="login-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <h2 style="font-size:1.15rem; margin-bottom:0.5rem;">🔐 Admin Login</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Authenticate to manage files, tables, and snapshots.</p>
      <form onsubmit="submitLogin(event)">
        <div class="input-group">
          <label>Username</label>
          <input type="text" id="lg-user" required />
        </div>
        <div class="input-group">
          <label>Password</label>
          <input type="password" id="lg-pass" required />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.25rem;">
          <button type="button" class="btn btn-secondary" onclick="toggleAuthModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let authToken = localStorage.getItem('androbase_jwt') || '';
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
        document.getElementById('stat-status').textContent = d.status === 'online' ? 'Online' : d.status;
        document.getElementById('stat-uptime').textContent = 'Uptime: ' + Math.floor(d.uptimeSeconds / 60) + 'm ' + (d.uptimeSeconds % 60) + 's';
        document.getElementById('stat-profile').textContent = d.profile.name;
        document.getElementById('stat-tier').textContent = d.profile.targetTier;
        document.getElementById('hdr-profile').textContent = d.profile.name.split('—')[0].trim();
        document.getElementById('stat-mem').textContent = d.memory.freeMb + ' / ' + d.memory.totalMb + ' MB';
        document.getElementById('stat-mem-sub').textContent = 'V8 Limit: ' + d.memory.heapLimitMb + ' MB';
        document.getElementById('stat-lan').textContent = d.network.lanIps[0] ? d.network.lanIps[0] + ':' + d.network.port : '127.0.0.1:' + d.network.port;

        if (!d.hasAdmin && !authToken) {
          document.getElementById('bootstrap-banner').classList.remove('hidden');
        } else {
          document.getElementById('bootstrap-banner').classList.add('hidden');
        }
      } catch (e) {
        console.error('Failed to load status', e);
      }
    }

    async function loadTables() {
      try {
        const d = await api('/api/v1/db/tables');
        const tb = document.getElementById('tables-tbody');
        if (!d.tables || d.tables.length === 0) {
          tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No tables created yet.</td></tr>';
          return;
        }
        tb.innerHTML = d.tables.map(t => '<tr><td><strong>' + t.name + '</strong></td><td>' + t.recordCount + ' rows</td><td><button class="btn btn-secondary" onclick="viewTable(\\'' + t.name + '\\')">Query Rows</button></td></tr>').join('');
      } catch (e) {
        document.getElementById('tables-tbody').innerHTML = '<tr><td colspan="3" style="color:#ef4444;">Failed to load tables. Login required.</td></tr>';
      }
    }

    async function viewTable(name) {
      try {
        const d = await api('/api/v1/db/' + name + '/query', { method: 'POST', body: JSON.stringify({ limit: 10 }) });
        alert('Table ' + name + ' (' + d.total + ' total records):\\n' + JSON.stringify(d.records, null, 2));
      } catch (e) {
        alert('Error querying table: ' + e.message);
      }
    }

    async function loadFiles() {
      try {
        const d = await api('/api/v1/storage/files');
        const tb = document.getElementById('files-tbody');
        if (!d.files || d.files.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No files uploaded yet.</td></tr>';
          return;
        }
        tb.innerHTML = d.files.map(f => '<tr><td>' + f.originalName + '</td><td>' + (f.sizeBytes / 1024).toFixed(1) + ' KB</td><td>' + f.uploadedAt.split('T')[0] + '</td><td><code>' + f.mimeType + '</code></td><td><a href="/api/v1/storage/' + f.id + '" target="_blank" class="btn btn-secondary">Download</a></td></tr>').join('');
      } catch (e) {
        document.getElementById('files-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444;">Failed to load files. Login required.</td></tr>';
      }
    }

    async function loadDiagnostics() {
      try {
        const d = await api('/api/v1/capabilities');
        const c = document.getElementById('diagnostics-content');
        c.innerHTML = d.checks.map(k => '<div class="card"><h3>' + k.name + '</h3><div style="font-weight:600; font-size:1.05rem; margin-top:0.25rem;">' + k.value + '</div><p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.35rem;">' + k.message + '</p></div>').join('');
      } catch (e) {
        document.getElementById('diagnostics-content').innerHTML = '<div style="color:#ef4444;">Failed to load diagnostic details.</div>';
      }
    }

    async function loadBackups() {
      try {
        const d = await api('/api/v1/backups');
        const tb = document.getElementById('backups-tbody');
        if (!d.backups || d.backups.length === 0) {
          tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No snapshot backups created yet.</td></tr>';
          return;
        }
        tb.innerHTML = d.backups.map(b => '<tr><td><code>' + b.id + '</code></td><td>' + b.filename + '</td><td>' + (b.sizeBytes / 1024).toFixed(1) + ' KB</td><td>' + b.createdAt.split('T')[0] + '</td><td><code>' + b.sha256.substring(0, 16) + '...</code></td></tr>').join('');
      } catch (e) {
        document.getElementById('backups-tbody').innerHTML = '<tr><td colspan="5" style="color:#ef4444;">Failed to load backups. Login required.</td></tr>';
      }
    }

    async function createBackup() {
      try {
        const d = await api('/api/v1/backups', { method: 'POST', body: JSON.stringify({ label: 'manual' }) });
        alert('Snapshot created successfully! File: ' + d.backup.filename);
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
        localStorage.removeItem('androbase_jwt');
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
          localStorage.setItem('androbase_jwt', authToken);
          alert('Admin initialized successfully!');
          closeBootstrapModal();
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
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
        const res = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        if (res.token) {
          authToken = res.token;
          localStorage.setItem('androbase_jwt', authToken);
          document.getElementById('login-modal').classList.add('hidden');
          document.getElementById('btn-auth-action').textContent = 'Logout';
          document.getElementById('user-display').style.display = 'inline-flex';
          document.getElementById('user-display').textContent = res.user.username;
          refreshStatus();
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
