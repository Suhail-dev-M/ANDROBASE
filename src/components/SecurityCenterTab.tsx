import React, { useState, useEffect } from 'react';
import {
  Shield, Key, Lock, AlertTriangle, CheckCircle2,
  Users, RefreshCw, Trash2, Eye, Activity
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { AuditLog } from '../types.ts';

export const SecurityCenterTab: React.FC = () => {
  const [auditData, setAuditData] = useState<{
    securityScore: number;
    activeSessionsCount: number;
    listeningPortsCount: number;
    failedLoginAttempts: number;
    securityWarnings: string[];
  } | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [audit, sess, auditLogs] = await Promise.all([
        ApiClient.getSecurityAudit(),
        ApiClient.listActiveSessions().catch(() => []),
        ApiClient.getSecurityLogs(40).catch(() => []),
      ]);
      setAuditData(audit);
      setSessions(sess);
      setLogs(auditLogs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to revoke this user session?')) return;
    try {
      await ApiClient.revokeSession(sessionId);
      setSuccessMsg('Session successfully revoked');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Security Centre</h1>
              <p className="text-xs text-slate-400">
                Audit logs, active session management, brute-force monitoring and security posture
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Audit Refresh</span>
          </button>
        </div>

        {successMsg && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Security Score & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Security Score</span>
            <div className={`text-3xl font-extrabold mt-1 ${getScoreColor(auditData?.securityScore ?? 100)}`}>
              {auditData?.securityScore ?? 100}%
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
            <Shield className={`w-6 h-6 ${getScoreColor(auditData?.securityScore ?? 100)}`} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Active Sessions</span>
            <div className="text-3xl font-extrabold text-white mt-1">
              {auditData?.activeSessionsCount ?? sessions.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Failed Logins</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-1">
              {auditData?.failedLoginAttempts ?? 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Open Ports</span>
            <div className="text-3xl font-extrabold text-blue-400 mt-1">
              {auditData?.listeningPortsCount ?? 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active User Sessions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Active Authenticated Sessions</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{sessions.length} sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No active sessions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 hidden md:table-cell">Client</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Created</th>
                  <th className="py-3 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300 font-medium truncate max-w-[120px]">
                      {s.id}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">{s.ip || '127.0.0.1'}</td>
                    <td className="py-3 px-4 font-sans text-slate-400 hidden md:table-cell truncate max-w-[200px]">
                      {s.userAgent || 'Web Browser'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                      {s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="Revoke Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Audit Event Log */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Security Audit Event Log</span>
          </h3>
          <span className="text-xs text-slate-500">Live tamper-resistant logging</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No audit log entries available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">User</th>
                  <th className="py-3 px-4 hidden md:table-cell">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isFailure = log.status === 'failure';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isFailure
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 hidden sm:table-cell">
                        {log.username || 'System'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                        {log.ip || 'Local'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
