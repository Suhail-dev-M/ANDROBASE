import React, { useState, useEffect } from 'react';
import {
  Clock, Play, Plus, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, Terminal, Power
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { ScheduledTaskItem } from '../types.ts';

export const TaskSchedulerTab: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New task modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [cronExpression, setCronExpression] = useState('0 3 * * *');
  const [taskType, setTaskType] = useState<ScheduledTaskItem['taskType']>('cleanup');
  const [target, setTarget] = useState('temp_files');

  // Execution result log
  const [activeTaskLog, setActiveTaskLog] = useState<{ name: string; log: string } | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.listTasks();
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    try {
      await ApiClient.createTask({
        name: taskName.trim(),
        cronExpression,
        taskType,
        target,
        enabled: true,
      });
      setIsNewTaskOpen(false);
      setTaskName('');
      setSuccessMsg('Scheduled task configured successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleTask = async (task: ScheduledTaskItem) => {
    try {
      await ApiClient.updateTask(task.id, { enabled: !task.enabled });
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteTask = async (id: string, name: string) => {
    if (!window.confirm(`Delete task "${name}"?`)) return;
    try {
      await ApiClient.deleteTask(id);
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRunTask = async (task: ScheduledTaskItem) => {
    try {
      const outcome = await ApiClient.runTask(task.id);
      setActiveTaskLog({ name: task.name, log: outcome.log });
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Task Scheduler & Automation</h1>
              <p className="text-xs text-slate-400">
                Automate recurring server maintenance, automated snapshots, and cleanup jobs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Scheduled Task</span>
            </button>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Task List Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No scheduled automation tasks configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Cron Schedule</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Type</th>
                  <th className="py-3 px-4 hidden md:table-cell">Last Executed</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{task.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        Target: {task.target}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-orange-400 font-semibold">
                      {task.cronExpression}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {task.taskType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                      {task.lastRunAt ? (
                        <div>
                          <div>{new Date(task.lastRunAt).toLocaleTimeString()}</div>
                          <span
                            className={`text-[10px] font-bold ${
                              task.lastStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {task.lastStatus?.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          task.enabled ? 'bg-orange-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRunTask(task)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-orange-400"
                          title="Run Task Now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id, task.name)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <span>Configure Automation Task</span>
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nightly Temp Cleanup, Hourly Ping"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cron Expression (or */minutes)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0 3 * * * or */30 * * * *"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Action Type
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="cleanup">System Cache & Temp Cleanup</option>
                  <option value="backup">Automated Database Snapshot</option>
                  <option value="ping_check">Network Ping Heartbeat</option>
                  <option value="app_restart">Application Health Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Parameter
                </label>
                <input
                  type="text"
                  placeholder="e.g. temp_files, 1.1.1.1, all_tables"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Execution Output Modal */}
      {activeTaskLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-400" />
                <span>Execution Log: {activeTaskLog.name}</span>
              </h4>
              <button
                onClick={() => setActiveTaskLog(null)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                Close
              </button>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 whitespace-pre-wrap">
              {activeTaskLog.log}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
