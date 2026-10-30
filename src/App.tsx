/**
 * AndroBase - Complete Home Server Management Platform
 * Main Web Management Console Application
 * Clean, Modular, Production-Quality Architecture
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Database, HardDrive, Cpu, 
  Archive, Wifi, Users, Terminal, Sparkles, CheckCircle2,
  Layers, Box, ShieldCheck, Clock, Film, Sliders
} from 'lucide-react';
import { Header } from './components/Header.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { DatabaseTab } from './components/DatabaseTab.tsx';
import { FileManagerTab } from './components/FileManagerTab.tsx';
import { AppsManagerTab } from './components/AppsManagerTab.tsx';
import { ContainersTab } from './components/ContainersTab.tsx';
import { ProcessesTab } from './components/ProcessesTab.tsx';
import { SecurityCenterTab } from './components/SecurityCenterTab.tsx';
import { TaskSchedulerTab } from './components/TaskSchedulerTab.tsx';
import { MediaServerTab } from './components/MediaServerTab.tsx';
import { DevToolsTab } from './components/DevToolsTab.tsx';
import { ModulesTab } from './components/ModulesTab.tsx';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isBootstrapOpen, setIsBootstrapOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchStatus = async () => {
    try {
      const data = await ApiClient.getStatus();
      setStatus(data);
      // Auto-trigger bootstrap modal if no admin is configured yet
      if (!data.hasAdmin && !currentUser && !sessionStorage.getItem('androbase_auto_bootstrap_shown')) {
        sessionStorage.setItem('androbase_auto_bootstrap_shown', 'true');
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
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      try {
        const logs = await ApiClient.getSecurityLogs(50);
        setAuditLogs(logs);
      } catch {
        // Safe to ignore if not authorized
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCapabilities();

    const handleAuthChange = () => {
      const user = ApiClient.getStoredUser();
      setCurrentUser(user);
      if (user) {
        showToast(`Welcome back, ${user.username}!`);
      }
      fetchAuditLogs();
    };
    window.addEventListener('androbase_auth_changed', handleAuthChange);

    const interval = setInterval(() => {
      fetchStatus();
      if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') fetchAuditLogs();
    }, 10000);

    return () => {
      window.removeEventListener('androbase_auth_changed', handleAuthChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await ApiClient.logout();
    setCurrentUser(null);
    showToast('Signed out of session');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-16 md:pb-0">
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
              showToast('System status refreshed');
            }}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenBootstrap={() => setIsBootstrapOpen(true)}
          />
        )}

        {(activeTab === 'files' || activeTab === 'storage') && <FileManagerTab />}

        {activeTab === 'apps' && <AppsManagerTab />}

        {activeTab === 'database' && <DatabaseTab />}

        {activeTab === 'containers' && <ContainersTab />}

        {activeTab === 'processes' && <ProcessesTab />}

        {activeTab === 'security' && <SecurityCenterTab />}

        {activeTab === 'tasks' && <TaskSchedulerTab />}

        {activeTab === 'media' && <MediaServerTab />}

        {activeTab === 'network' && <NetworkTab />}

        {activeTab === 'devtools' && <DevToolsTab />}

        {activeTab === 'backups' && <BackupsTab />}

        {activeTab === 'users' && <UsersTab currentUser={currentUser} />}

        {activeTab === 'modules' && <ModulesTab />}

        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            report={report}
            onRefresh={() => {
              fetchCapabilities();
              showToast('Hardware re-inspected');
            }}
            loading={loading}
          />
        )}

        {activeTab === 'api' && <ApiExplorerTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 bg-slate-950/80 py-5 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
              [HB]
            </span>
            <span className="font-semibold text-slate-300">AndroBase</span>
            <span>•</span>
            <span>Self-Hosted Home Server Management Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>
              Profile:{' '}
              <strong className="text-emerald-400 font-bold">
                {status?.profileName?.split('—')[0]?.trim() || 'Profile C'}
              </strong>
            </span>
            <span>•</span>
            <span className="tabular-nums">
              Uptime: {Math.floor((status?.uptimeSeconds || 0) / 60)}m {(status?.uptimeSeconds || 0) % 60}s
            </span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="text-slate-400 hover:text-emerald-400 transition-colors underline font-sans"
            >
              Hardware Matrix
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around md:hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'overview' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'files' || activeTab === 'storage' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Files</span>
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'apps' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Apps</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'database' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'security' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security</span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'modules' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 shadow-2xl flex items-center gap-2 animate-cute-fade">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <BootstrapModal
        isOpen={isBootstrapOpen}
        onClose={() => setIsBootstrapOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchStatus();
          fetchAuditLogs();
          showToast(`Admin account initialized! Welcome, ${user.username}`);
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
