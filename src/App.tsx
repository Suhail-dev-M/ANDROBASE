/**
 * AndroBase - Open-Source Mobile Server Platform
 * Main Web Management Console Application
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { DatabaseTab } from './components/DatabaseTab.tsx';
import { StorageTab } from './components/StorageTab.tsx';
import { UsersTab } from './components/UsersTab.tsx';
import { DiagnosticsTab } from './components/DiagnosticsTab.tsx';
import { BackupsTab } from './components/BackupsTab.tsx';
import { NetworkTab } from './components/NetworkTab.tsx';
import { ApiExplorerTab } from './components/ApiExplorerTab.tsx';
import { BootstrapModal } from './components/BootstrapModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ApiClient } from './api.ts';
import { ServerStatusResponse, CompatibilityReport, User, AuditLog } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [status, setStatus] = useState<ServerStatusResponse | null>(null);
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(ApiClient.getStoredUser());
  const [loading, setLoading] = useState(false);

  // Modals
  const [isBootstrapOpen, setIsBootstrapOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await ApiClient.getStatus();
      setStatus(data);
      // Auto-trigger bootstrap modal if no admin is configured yet
      if (!data.hasAdmin && !currentUser) {
        setIsBootstrapOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchCapabilities = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getCapabilities();
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch capabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (currentUser?.role === 'admin') {
      try {
        const logs = await ApiClient.getAuditLogs();
        setAuditLogs(logs);
      } catch {
        // Safe to ignore if not authorized
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCapabilities();

    // Listen for auth changes
    const handleAuthChange = () => {
      setCurrentUser(ApiClient.getStoredUser());
      fetchAuditLogs();
    };
    window.addEventListener('androbase_auth_changed', handleAuthChange);

    // Periodic telemetry ping every 10 seconds
    const interval = setInterval(() => {
      fetchStatus();
      if (currentUser?.role === 'admin') fetchAuditLogs();
    }, 10000);

    return () => {
      window.removeEventListener('androbase_auth_changed', handleAuthChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await ApiClient.logout();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        status={status}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenBootstrap={() => setIsBootstrapOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            status={status}
            report={report}
            auditLogs={auditLogs}
            onRefresh={() => {
              fetchStatus();
              fetchCapabilities();
              fetchAuditLogs();
            }}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenBootstrap={() => setIsBootstrapOpen(true)}
          />
        )}

        {activeTab === 'database' && <DatabaseTab />}

        {activeTab === 'storage' && <StorageTab />}

        {activeTab === 'users' && <UsersTab currentUser={currentUser} />}

        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            report={report}
            onRefresh={fetchCapabilities}
            loading={loading}
          />
        )}

        {activeTab === 'backups' && <BackupsTab />}

        {activeTab === 'network' && <NetworkTab />}

        {activeTab === 'api' && <ApiExplorerTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            AndroBase • Apache-2.0 Open-Source Mobile Server Platform
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Profile: <strong className="text-emerald-400">{status?.profileName || 'Active'}</strong></span>
            <span>•</span>
            <span>Uptime: {Math.floor((status?.uptimeSeconds || 0) / 60)}m</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="hover:text-slate-300 underline"
            >
              Hardware Matrix
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BootstrapModal
        isOpen={isBootstrapOpen}
        onClose={() => setIsBootstrapOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchStatus();
          fetchAuditLogs();
        }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchStatus();
          fetchAuditLogs();
        }}
        onOpenBootstrap={() => setIsBootstrapOpen(true)}
        hasAdmin={status?.hasAdmin ?? false}
      />
    </div>
  );
}
