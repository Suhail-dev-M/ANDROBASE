/**
 * AndroBase - Interactive REST API Explorer & Live Playground
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, ExternalLink, Code } from 'lucide-react';
import { ApiClient } from '../api.ts';

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requiresAuth: boolean;
  sampleBody?: any;
}

const AVAILABLE_ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health',
    description: 'Check server liveness, memory usage, and uptime.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/status',
    description: 'Get detailed system status, active profile, and database counts.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/capabilities',
    description: 'Inspect full hardware and runtime capability checks.',
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/api/v1/database/tables',
    description: 'List all database schemas and row counts.',
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/database/query/notes',
    description: 'Query records from table "notes" with parameterized options.',
    requiresAuth: true,
    sampleBody: {
      limit: 10,
      sortField: 'created_at',
      sortDirection: 'desc',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/files',
    description: 'List private files stored on the smartphone.',
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/network/interfaces',
    description: 'Inspect host network interfaces and SSH tunnel options.',
    requiresAuth: false,
  },
];

export const ApiExplorerTab: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(AVAILABLE_ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(
    selectedEndpoint.sampleBody ? JSON.stringify(selectedEndpoint.sampleBody, null, 2) : ''
  );
  const [responseOutput, setResponseOutput] = useState<string>('Click "Execute Request" to test endpoint live.');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.sampleBody ? JSON.stringify(ep.sampleBody, null, 2) : '');
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseOutput('Executing request...');

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
      const data = await res.json().catch(() => ({}));
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseOutput(`Error: ${err.message}`);
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Interactive REST API Sandbox</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Test and inspect versioned JSON endpoints directly against the mobile backend. Copy production-ready cURL commands.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint Selector Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Available Endpoints
          </h4>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto no-scrollbar">
            {AVAILABLE_ENDPOINTS.map((ep, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-colors border ${
                  selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate">{ep.path}</span>
                </div>
                <p className="text-[11px] font-sans text-slate-400 truncate">{ep.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Request / Response Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded font-bold bg-blue-950 text-blue-400 border border-blue-800">
                {selectedEndpoint.method}
              </span>
              <span className="text-slate-200 font-semibold">{selectedEndpoint.path}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCurl}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans flex items-center gap-1.5 transition-colors"
                title="Copy cURL snippet"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy cURL'}</span>
              </button>
              <button
                onClick={handleExecute}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? 'Running...' : 'Execute Request'}</span>
              </button>
            </div>
          </div>

          {selectedEndpoint.method !== 'GET' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                JSON Request Body
              </label>
              <textarea
                rows={4}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Live Response Output
              </label>
              <span className="text-[10px] text-slate-500 font-mono">application/json</span>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed">
              {responseOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
