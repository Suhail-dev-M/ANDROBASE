/**
 * AndroBase - Users, Roles & Authentication Tab
 * Cute, Modern & Production-Quality Access Control Dashboard
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, KeyRound, Shield, CheckCircle2, 
  AlertCircle, RefreshCw, Lock, Eye, EyeOff, Crown,
  UserCheck, ShieldAlert, Sparkles, Clock
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { User } from '../types.ts';

interface UsersTabProps {
  currentUser: User | null;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<'member' | 'readonly'>('member');
  const [creatingUser, setCreatingUser] = useState(false);

  // Change Password Modal
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [currentUser]);

  // Handle ESC key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setIsChangePassOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatingUser(true);
    try {
      await ApiClient.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setSuccess(`User "${newUsername}" created successfully!`);
      setIsCreateOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setChangingPass(true);
    try {
      await ApiClient.changePassword(oldPassword, newPass);
      setSuccess('Password updated successfully. Stale sessions revoked.');
      setIsChangePassOpen(false);
      setOldPassword('');
      setNewPass('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {error && (
        <div className="cute-card p-4 bg-rose-950/40 border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-cute-fade">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-rose-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="cute-card p-4 bg-emerald-950/40 border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-cute-fade">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-emerald-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Security Policies Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="cute-card p-5 bg-slate-900/60 border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Password Security</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              PBKDF2-SHA256
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            10,000 HMAC-SHA256 iterations with unique 16-byte cryptographically secure random salt per user.
          </p>
        </div>

        <div className="cute-card p-5 bg-slate-900/60 border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Brute-Force Guard</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              Sliding Rate Limiter
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            5 consecutive failed login attempts trigger an automatic 15-minute lockout on the offending IP address.
          </p>
        </div>

        <div className="cute-card p-5 bg-slate-900/60 border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Session Architecture</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
              Hashed Bearer
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Stateless 72-hour JWT tokens with server-side revocation registry on password changes.
          </p>
        </div>
      </div>

      {/* User Management Section */}
      <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Registered Accounts</span>
              <span className="text-xs font-mono text-slate-400 font-normal">({users.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Role-Based Access Control on Android</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsChangePassOpen(true)}
              className="cute-pill-btn px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700/80 transition-all active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Change Password</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="cute-pill-btn px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            )}
          </div>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {currentUser?.role === 'admin'
              ? 'No other users found.'
              : 'Sign in as administrator to view and manage user accounts.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 text-slate-300 transition-colors">
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                          {u.username.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100">{u.username}</span>
                          {u.username === currentUser?.username && (
                            <span className="ml-2 text-[10px] text-emerald-400 font-mono font-bold">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{u.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-sans ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {u.role === 'admin' && <Crown className="w-3 h-3 text-purple-400" />}
                        {u.role === 'admin' ? 'Administrator' : 'Member'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] uppercase font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-cute-fade">
          <div className="cute-card bg-slate-900 border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <UserPlus className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100">Create User Account</h3>
                <p className="text-xs text-slate-400">Add an authorized member to this server</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. devuser"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@local.lan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role Permissions</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="member">Member (Read &amp; write database records and files)</option>
                  <option value="readonly">Read-Only (Viewer only, no edits allowed)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="cute-pill-btn px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="cute-pill-btn px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50 shadow-md transition-all active:scale-95"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-cute-fade">
          <div className="cute-card bg-slate-900 border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <KeyRound className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100">Change Your Password</h3>
                <p className="text-xs text-slate-400">Updates password and revokes previous tokens</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password (min 8 chars)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsChangePassOpen(false)}
                  className="cute-pill-btn px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="cute-pill-btn px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 shadow-md transition-all active:scale-95"
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
