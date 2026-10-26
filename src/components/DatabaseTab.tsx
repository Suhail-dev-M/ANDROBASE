/**
 * AndroBase - Database Management & Table Browser Tab
 * Interactive Schema Viewer, Record CRUD & Safe Parameterized Queries
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, Table as TableIcon, Plus, Trash2, Edit3, Search, 
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle2, Shield
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

  // Modals state
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({});
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState<{ name: string; type: string; required: boolean }[]>([
    { name: 'title', type: 'string', required: true },
    { name: 'value', type: 'string', required: false },
  ]);

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

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Database View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Selector Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tables ({tables.length})</span>
            </h3>
            <button
              onClick={() => setIsCreateTableOpen(true)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
              title="Create Custom Table"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto no-scrollbar">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedTable === t.name
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {t.schema?.isSystem ? (
                    <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : (
                    <TableIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{t.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
            <span>System tables (<code className="text-slate-400">_*</code>) handle auth & sessions. User tables hold your app state.</span>
          </div>
        </div>

        {/* Records & Table Content */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">{selectedTable}</h3>
                  {currentSchema?.isSystem && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      System Protected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {totalRecords} records • Primary key:{' '}
                  <code className="text-emerald-400 font-mono">{currentSchema?.primaryKey || 'id'}</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadRecords(selectedTable, page)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  title="Reload Records"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsInsertOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Row</span>
                </button>
              </div>
            </div>

            {/* Schema Columns Preview */}
            {currentSchema && (
              <div className="py-3 flex items-center gap-2 overflow-x-auto text-[11px] font-mono border-b border-slate-800/60 no-scrollbar">
                <span className="text-slate-500 uppercase text-[10px] font-sans font-semibold">Columns:</span>
                {currentSchema.columns.map((col) => (
                  <span
                    key={col.name}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1"
                  >
                    <span>{col.name}</span>
                    <span className="text-emerald-400 text-[10px]">({col.type})</span>
                  </span>
                ))}
              </div>
            )}

            {/* Records Table */}
            <div className="mt-4 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-400" />
                  Loading table data...
                </div>
              ) : tableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                  <Database className="w-8 h-8 mb-2 text-slate-600" />
                  <p>No records found in table "{selectedTable}".</p>
                  <button
                    onClick={() => setIsInsertOpen(true)}
                    className="mt-2 text-emerald-400 hover:underline"
                  >
                    Insert the first record
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/40">
                    <tr>
                      {currentSchema?.columns.slice(0, 6).map((col) => (
                        <th key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                          {col.name}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {tableData.map((row, idx) => {
                      const pk = currentSchema?.primaryKey || 'id';
                      const recordId = row[pk];
                      return (
                        <tr key={recordId || idx} className="hover:bg-slate-800/30 text-slate-300">
                          {currentSchema?.columns.slice(0, 6).map((col) => {
                            const val = row[col.name];
                            let displayVal = val;
                            if (typeof val === 'object' && val !== null) {
                              displayVal = JSON.stringify(val);
                            }
                            return (
                              <td key={col.name} className="py-2 px-3 max-w-[200px] truncate" title={String(val)}>
                                {displayVal !== undefined ? String(displayVal) : <span className="text-slate-600">null</span>}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleDeleteRecord(recordId)}
                              title="Delete record"
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages} ({totalRecords} records)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Insert Record */}
      {isInsertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold mb-1">Insert Record into "{selectedTable}"</h3>
            <p className="text-xs text-slate-400 mb-4">Provide values for table columns</p>

            <form onSubmit={handleInsertRecord} className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {currentSchema?.columns
                .filter((c) => c.name !== 'id' && c.name !== 'created_at')
                .map((col) => (
                  <div key={col.name}>
                    <label className="block text-slate-300 font-medium mb-1">
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
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInsertOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold mb-1">Create Custom Database Table</h3>
            <p className="text-xs text-slate-400 mb-4">Define a new schema on the mobile server</p>

            <form onSubmit={handleCreateTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. inventory_items"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Columns</label>
                <div className="space-y-2">
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
                        className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const updated = [...newColumns];
                          updated[idx].type = e.target.value;
                          setNewColumns(updated);
                        }}
                        className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100"
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
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewColumns([...newColumns, { name: '', type: 'string', required: false }])}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    + Add Column
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTableOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
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
