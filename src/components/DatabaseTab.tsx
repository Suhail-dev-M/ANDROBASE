/**
 * AndroBase - Database Management & Table Browser Tab
 * Interactive Schema Viewer, Record CRUD & Safe Parameterized Queries
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, Table as TableIcon, Plus, Trash2, Edit3, Search, 
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle2, 
  ShieldCheck, X, Sparkles, Filter, Code2, ArrowUpDown
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { TableInfo } from '../types.ts';

export const DatabaseTab: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('notes');
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  // Multi-engine & SQL console
  const [engines, setEngines] = useState<any[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState('embedded');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM notes LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [queryRunning, setQueryRunning] = useState(false);

  // Modals state
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({});
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState<{ name: string; type: string; required: boolean }[]>([
    { name: 'title', type: 'string', required: true },
    { name: 'content', type: 'string', required: false },
  ]);

  const loadEngines = async () => {
    try {
      const data = await ApiClient.detectDatabaseEngines();
      setEngines(data);
    } catch {
      // Fallback
    }
  };

  const loadTables = async () => {
    try {
      const data = await ApiClient.listTables();
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].name);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryRunning(true);
    setError(null);
    try {
      const result = await ApiClient.executeDatabaseQuery(selectedEngine, sqlQuery);
      setSqlResult(result);
      if (selectedEngine === 'embedded') {
        loadTables();
        if (selectedTable) loadRecords(selectedTable, page);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQueryRunning(false);
    }
  };

  const loadRecords = async (table: string, currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * limit;
      const res = await ApiClient.queryTable(table, {
        limit,
        offset,
        sortField: 'created_at',
        sortDirection: 'desc',
      });
      setTableData(res.data);
      setTotalRecords(res.total);
    } catch (err: any) {
      setError(err.message);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    loadEngines();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      loadRecords(selectedTable, 1);
    }
  }, [selectedTable]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadRecords(selectedTable, newPage);
  };

  const currentSchema = tables.find((t) => t.name === selectedTable)?.schema;

  const handleInsertRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.insertRecord(selectedTable, {
        ...newRecordData,
        created_at: new Date().toISOString(),
      });
      setIsInsertOpen(false);
      setNewRecordData({});
      loadRecords(selectedTable, page);
      loadTables();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm(`Delete record with ID "${id}"?`)) return;
    try {
      await ApiClient.deleteRecord(selectedTable, id);
      loadRecords(selectedTable, page);
      loadTables();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createTable({
        name: newTableName,
        primaryKey: 'id',
        columns: [
          { name: 'id', type: 'string', required: true, unique: true },
          ...newColumns.map((c) => ({
            name: c.name,
            type: c.type as any,
            required: c.required,
          })),
        ],
      });
      setIsCreateTableOpen(false);
      setNewTableName('');
      await loadTables();
      setSelectedTable(newTableName);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filtered rows for client search
  const filteredRows = tableData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) => 
      String(val).toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Engine Detection Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Database Management Hub</h1>
              <p className="text-xs text-slate-400">
                Multi-engine detection, table browser, schema designer & SQL query console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Code2 className="w-4 h-4" />
              <span>{showConsole ? 'Hide SQL Console' : 'Open SQL Console'}</span>
            </button>
            <button
              onClick={() => {
                loadTables();
                loadEngines();
              }}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Detected Engine Badges */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {engines.map((eng) => (
            <div
              key={eng.type}
              className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 capitalize">{eng.type}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    eng.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : eng.status === 'offline'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {eng.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate font-mono">
                {eng.version || (eng.isInstalled ? 'Installed' : 'Not installed')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive SQL Console */}
      {showConsole && (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-400" />
              <span>Interactive SQL & Query Console</span>
            </h3>

            <div className="flex items-center gap-2">
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="embedded">Embedded WAL DB (Pure JS)</option>
                <option value="postgres">PostgreSQL (Local / Network)</option>
                <option value="sqlite">SQLite3 CLI</option>
                <option value="mysql">MySQL / MariaDB</option>
              </select>

              <button
                onClick={handleRunQuery}
                disabled={queryRunning}
                className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{queryRunning ? 'Running...' : 'Execute Query'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              rows={3}
              placeholder="Enter SQL statement (e.g. SELECT * FROM notes;)"
              className="w-full bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-y"
              spellCheck={false}
            />
          </div>

          {sqlResult && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 max-h-48 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap">
              {JSON.stringify(sqlResult, null, 2)}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Database Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Table Selector Sidebar */}
        <div className="cute-card p-4 space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Tables ({tables.length})</span>
            </h3>
            <button
              onClick={() => setIsCreateTableOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
              title="Create Custom Table"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto no-scrollbar">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  selectedTable === t.name
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`p-1 rounded-lg ${t.schema?.isSystem ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                    {t.schema?.isSystem ? <ShieldCheck className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="truncate">{t.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-slate-400 border border-white/[0.06] tabular-nums">
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 leading-relaxed">
            💡 Tables are stored safely as JSON/WAL records in phone storage.
          </div>
        </div>

        {/* Records & Table Content */}
        <div className="lg:col-span-3 cute-card p-5 flex flex-col justify-between">
          <div>
            {/* Table Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white tracking-tight">{selectedTable}</h3>
                  {currentSchema?.isSystem ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      System Table
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      User Table
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-mono text-slate-200 tabular-nums">{totalRecords}</span> records total • Primary key:{' '}
                  <code className="text-emerald-400 font-mono text-[11px] bg-black/30 px-1 py-0.5 rounded border border-emerald-500/20">
                    {currentSchema?.primaryKey || 'id'}
                  </code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search in table */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search rows..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950/70 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-36 sm:w-44 transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex p-0.5 rounded-xl bg-slate-950/80 border border-white/[0.08]">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Table view"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="JSON view"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => loadRecords(selectedTable, page)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/[0.08] transition-colors"
                  title="Reload Records"
                  aria-label="Refresh records"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setIsInsertOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Row</span>
                </button>
              </div>
            </div>

            {/* Schema Columns Preview Strip */}
            {currentSchema && (
              <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono border-b border-white/[0.06] no-scrollbar">
                <span className="text-slate-400 uppercase text-[10px] font-sans font-bold tracking-wider mr-1">Columns:</span>
                {currentSchema.columns.map((col) => (
                  <span
                    key={col.name}
                    className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.08] text-slate-300 flex items-center gap-1 shrink-0"
                  >
                    <span className="font-semibold text-slate-200">{col.name}</span>
                    <span className="text-emerald-400 text-[10px]">:{col.type}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Records Content View */}
            <div className="mt-4 min-h-[300px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-400" />
                  <span>Querying table records...</span>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-400 text-xs text-center p-6 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl mb-2">
                    📂
                  </div>
                  <p className="font-semibold text-slate-300">
                    {searchTerm ? 'No records match your search filter.' : `No records found in table "${selectedTable}".`}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {searchTerm ? 'Try clearing your search term.' : 'Click below to insert your first record.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setIsInsertOpen(true)}
                      className="mt-3 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-semibold text-xs transition-colors"
                    >
                      + Insert First Record
                    </button>
                  )}
                </div>
              ) : viewMode === 'json' ? (
                <pre className="p-4 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-96">
                  {JSON.stringify(filteredRows, null, 2)}
                </pre>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.08] bg-white/[0.02]">
                      <tr>
                        {currentSchema?.columns.slice(0, 6).map((col) => (
                          <th key={col.name} className="py-2.5 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{col.name}</span>
                              <span className="text-[9px] text-slate-500 font-mono font-normal">({col.type})</span>
                            </div>
                          </th>
                        ))}
                        <th className="py-2.5 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                      {filteredRows.map((row, idx) => {
                        const pk = currentSchema?.primaryKey || 'id';
                        const recordId = row[pk];
                        return (
                          <tr key={recordId || idx} className="hover:bg-white/[0.03] transition-colors text-slate-300">
                            {currentSchema?.columns.slice(0, 6).map((col) => {
                              const val = row[col.name];
                              let displayVal = val;
                              if (typeof val === 'object' && val !== null) {
                                displayVal = JSON.stringify(val);
                              }
                              return (
                                <td key={col.name} className="py-2.5 px-3.5 max-w-[200px] truncate" title={String(val)}>
                                  {displayVal !== undefined ? (
                                    <span>{String(displayVal)}</span>
                                  ) : (
                                    <span className="text-slate-600 font-sans italic">null</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 px-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteRecord(recordId)}
                                title="Delete record"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* Pagination Footer */}
          <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <strong className="text-slate-200 font-mono">{page}</strong> of <span className="font-mono">{totalPages}</span> ({totalRecords} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Insert Record */}
      {isInsertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Insert Record into "{selectedTable}"
                </h3>
                <p className="text-xs text-slate-400">Provide attribute values for this row</p>
              </div>
              <button
                onClick={() => setIsInsertOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertRecord} className="space-y-3.5 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {currentSchema?.columns
                .filter((c) => c.name !== 'id' && c.name !== 'created_at')
                .map((col) => (
                  <div key={col.name}>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {col.name} <span className="text-slate-500 font-mono">({col.type})</span>
                      {col.required && <span className="text-rose-400 ml-1">*</span>}
                    </label>
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      required={col.required}
                      value={newRecordData[col.name] ?? ''}
                      onChange={(e) =>
                        setNewRecordData({
                          ...newRecordData,
                          [col.name]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                      placeholder={`Enter ${col.name}...`}
                      className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                ))}

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsInsertOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Table */}
      {isCreateTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Create Custom Table</h3>
                <p className="text-xs text-slate-400">Define a new schema on the phone server</p>
              </div>
              <button
                onClick={() => setIsCreateTableOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. inventory_items"
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Columns</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newColumns.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => {
                          const updated = [...newColumns];
                          updated[idx].name = e.target.value;
                          setNewColumns(updated);
                        }}
                        placeholder="Column name"
                        className="flex-1 px-3 py-2 bg-slate-950/80 border border-white/[0.1] rounded-lg text-white text-xs"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const updated = [...newColumns];
                          updated[idx].type = e.target.value;
                          setNewColumns(updated);
                        }}
                        className="px-2.5 py-2 bg-slate-950/80 border border-white/[0.1] rounded-lg text-white text-xs"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="json">json</option>
                        <option value="date">date</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setNewColumns(newColumns.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewColumns([...newColumns, { name: '', type: 'string', required: false }])}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateTableOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
