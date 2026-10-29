/**
 * AndroBase - Interactive REST API Explorer & Live Playground
 * Cute, Modern & Production-Quality Developer Sandbox
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Terminal, Play, Copy, Check, ExternalLink, Code, 
  Sparkles, Lock, ShieldCheck, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { ApiClient } from '../api.ts';

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: 'System' | 'Database' | 'Storage' | 'Network';
  description: string;
  requiresAuth: boolean;
  sampleBody?: any;
}

const AVAILABLE_ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health',
    category: 'System',
    description: 'Check server liveness, memory utilization, and uptime.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/status',
    category: 'System',
    description: 'Detailed system status, active profile, and database counts.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/capabilities',
    category: 'System',
    description: 'Full smartphone hardware and runtime capability checks.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/db/tables',
    category: 'Database',
    description: 'List all database schemas and row counts.',
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/db/notes/query',
    category: 'Database',
    description: 'Query records from "notes" table with limit & sorting.',
    requiresAuth: true,
    sampleBody: {
      limit: 10,
      sortField: 'created_at',
      sortDirection: 'desc',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/storage/files',
    category: 'Storage',
    description: 'List sandboxed files stored on the phone.',
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/network/interfaces',
    category: 'Network',
    description: 'Inspect host network interfaces and SSH tunnel options.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/backups',
    category: 'System',
    description: 'List verified snapshots and integrity checksums.',
    requiresAuth: true,
  },
];

export const ApiExplorerTab: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(AVAILABLE_ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(
    selectedEndpoint.sampleBody ? JSON.stringify(selectedEndpoint.sampleBody, null, 2) : ''
  );
  const [responseOutput, setResponseOutput] = useState<string>(
    '{\n  "hint": "Click \\"Execute Request\\" above to test this endpoint live on your smartphone!"\n}'
  );
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.sampleBody ? JSON.stringify(ep.sampleBody, null, 2) : '');
    setResponseStatus(null);
    setResponseLatency(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseOutput('Executing request against mobile server...');
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = ApiClient.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.method !== 'GET' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(selectedEndpoint.path, options);
      const latency = Math.round(performance.now() - startTime);
      setResponseStatus(res.status);
      setResponseLatency(latency);

      const data = await res.json().catch(() => ({}));
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseStatus(0);
      setResponseLatency(Math.round(performance.now() - startTime));
      setResponseOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    const token = ApiClient.getToken();
    let cmd = `curl -X ${selectedEndpoint.method} "http://<PHONE_IP>:3000${selectedEndpoint.path}"`;
    if (token) {
      cmd += ` \\\n  -H "Authorization: Bearer ${token}"`;
    }
    if (selectedEndpoint.method !== 'GET' && requestBody.trim()) {
      cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
    }
    return cmd;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignore if not valid JSON yet
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="cute-card p-5 sm:p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-950/20 border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Terminal className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Interactive REST API Sandbox
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Live Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Test and inspect versioned JSON endpoints directly against the mobile daemon. Copy production-ready cURL commands for your frontend apps or scripts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint Selector Sidebar */}
        <div className="cute-card p-4 sm:p-5 bg-slate-900/60 border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Available Endpoints
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
              {AVAILABLE_ENDPOINTS.length} Endpoints
            </span>
          </div>

          <div className="space-y-1.5 max-h-[560px] overflow-y-auto no-scrollbar">
            {AVAILABLE_ENDPOINTS.map((ep, idx) => {
              const isSelected =
                selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-mono transition-all border ${
                    isSelected
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-300 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                          ep.method === 'GET'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="truncate font-semibold text-slate-200">{ep.path}</span>
                    </div>

                    {ep.requiresAuth && (
                      <span title="Requires Auth Bearer Token" className="text-slate-500">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-sans text-slate-400 line-clamp-1">
                    {ep.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Request / Response Panel */}
        <div className="lg:col-span-2 cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-bold ${
                  selectedEndpoint.method === 'GET'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <span className="text-slate-100 font-semibold">{selectedEndpoint.path}</span>
              {selectedEndpoint.requiresAuth ? (
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Auth Token Attached
                </span>
              ) : (
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  Public
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCurl}
                className="cute-pill-btn px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans flex items-center gap-1.5 transition-colors border border-slate-700/60"
                title="Copy cURL snippet"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy cURL'}</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={loading}
                className="cute-pill-btn px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? 'Running...' : 'Execute Request'}</span>
              </button>
            </div>
          </div>

          {/* Request Body (for POST/PUT) */}
          {selectedEndpoint.method !== 'GET' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold uppercase tracking-wider text-[11px]">
                  JSON Request Body
                </label>
                <button
                  type="button"
                  onClick={formatJson}
                  className="text-cyan-400 hover:underline text-[11px] font-medium"
                >
                  Prettify JSON
                </button>
              </div>
              <textarea
                rows={4}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          {/* Response Output View */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
                  Response Output
                </span>
                {responseStatus !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {responseStatus === 0 ? 'Network Error' : `${responseStatus} STATUS`}
                  </span>
                )}
                {responseLatency !== null && (
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {responseLatency}ms
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">application/json</span>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed select-all">
              {responseOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
