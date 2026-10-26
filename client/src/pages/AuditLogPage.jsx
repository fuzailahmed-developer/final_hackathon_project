import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, Filter, X, ChevronLeft, ChevronRight, Search, Clock, User, Tag, Database, Eye } from 'lucide-react';
import { API_BASE } from '../api/client';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('hcm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

const ACTION_COLORS = {
  CREATE: { bg: '#d1fae5', color: '#065f46' },
  UPDATE: { bg: '#dbeafe', color: '#1e40af' },
  DELETE: { bg: '#fee2e2', color: '#991b1b' },
  APPROVE: { bg: '#d1fae5', color: '#065f46' },
  REJECT: { bg: '#fee2e2', color: '#991b1b' },
  GENERATE: { bg: '#ede9fe', color: '#5b21b6' },
  FINALIZE: { bg: '#fef3c7', color: '#92400e' }
};

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action] || { bg: 'var(--neutral-100)', color: 'var(--neutral-600)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 700,
      backgroundColor: c.bg,
      color: c.color,
      letterSpacing: '0.3px'
    }}>
      {action}
    </span>
  );
}

function JsonDisplay({ data, label }) {
  if (data === null || data === undefined) {
    return <span style={{ color: 'var(--neutral-400)', fontStyle: 'italic', fontSize: '13px' }}>—</span>;
  }
  if (typeof data === 'object') {
    return (
      <div>
        {label && <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.4px' }}>{label}</div>}
        <pre style={{
          fontSize: '12px',
          backgroundColor: 'var(--neutral-50)',
          border: '1px solid var(--neutral-200)',
          borderRadius: '6px',
          padding: '10px 12px',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--neutral-700)',
          margin: 0,
          lineHeight: 1.6,
          fontFamily: "'Courier New', monospace"
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }
  return <span style={{ fontSize: '13px', color: 'var(--neutral-700)' }}>{String(data)}</span>;
}

function DetailDrawer({ log, onClose }) {
  if (!log) return null;

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end'
    }}>
      <div style={{
        width: '100%', maxWidth: '540px', height: '100vh',
        backgroundColor: 'var(--neutral-0)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 200ms ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--neutral-100)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neutral-900)' }}>Audit Detail</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--neutral-400)', padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Meta */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
            padding: '14px 16px', backgroundColor: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-100)'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Timestamp</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-700)' }}>{formatDate(log.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Action</div>
              <ActionBadge action={log.action} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Actor</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-700)' }}>
                {log.actor?.name || log.actorName || '—'}
                <span style={{ fontSize: '11px', color: 'var(--neutral-400)', marginLeft: '6px' }}>({log.role || '—'})</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Entity</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-700)' }}>{log.entity}</div>
            </div>
            {log.entityId && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Entity ID</div>
                <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontFamily: 'monospace' }}>{String(log.entityId)}</div>
              </div>
            )}
          </div>

          {/* Before */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              Before
            </div>
            <JsonDisplay data={log.before} />
          </div>

          {/* After */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              After
            </div>
            <JsonDisplay data={log.after} />
          </div>

          {/* Metadata */}
          {log.metadata && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                Metadata
              </div>
              <JsonDisplay data={log.metadata} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ action: '', entity: '', actor: '', startDate: '', endDate: '' });
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [distinct, setDistinct] = useState({ actions: [], entities: [] });

  const fetchLogs = useCallback(async (pg = 1, f = activeFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: 50 });
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await apiFetch(`/audit?${params.toString()}`);
      setLogs(res.data || []);
      setMeta(res.meta || { page: pg, total: 0, totalPages: 1 });
    } catch (err) {
      if (err.status === 403) {
        setError('Access denied. This page is restricted to Administrators only.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  const fetchDistinct = async () => {
    try {
      const res = await apiFetch('/audit/distinct');
      setDistinct(res.data || { actions: [], entities: [] });
    } catch (_) {}
  };

  useEffect(() => {
    fetchDistinct();
  }, []);

  useEffect(() => {
    fetchLogs(page, activeFilters);
  }, [page, activeFilters]);

  const applyFilters = () => {
    setActiveFilters({ ...filters });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ action: '', entity: '', actor: '', startDate: '', endDate: '' });
    setActiveFilters({});
    setPage(1);
  };

  const hasFilters = Object.values(activeFilters).some(Boolean);

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const inputStyle = {
    padding: '7px 10px',
    border: '1px solid var(--neutral-200)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    color: 'var(--neutral-700)',
    backgroundColor: 'var(--neutral-0)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Shield size={22} color="var(--primary-600)" />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>Audit Log</h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--neutral-500)', margin: 0 }}>
            Immutable record of all administrative actions in the system.
          </p>
        </div>
        {!loading && !error && (
          <div style={{ fontSize: '13px', color: 'var(--neutral-500)', padding: '6px 12px', backgroundColor: 'var(--neutral-100)', borderRadius: 'var(--radius-md)' }}>
            {meta.total.toLocaleString()} record{meta.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--neutral-0)', border: '1px solid var(--neutral-200)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={14} color="var(--neutral-500)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-600)' }}>Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{ fontSize: '12px', color: '#dc2626', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}>
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
          <select
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            style={inputStyle}
          >
            <option value="">All Actions</option>
            {distinct.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filters.entity}
            onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
            style={inputStyle}
          >
            <option value="">All Entities</option>
            {distinct.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            type="text"
            placeholder="Actor name..."
            value={filters.actor}
            onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
            style={inputStyle}
          />
          <input type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} style={inputStyle} />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} style={inputStyle} />
          <button
            onClick={applyFilters}
            style={{
              padding: '7px 16px', backgroundColor: 'var(--primary-600)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', transition: 'background-color 150ms'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-700)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-600)'; }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          border: '1px solid #fca5a5', backgroundColor: '#fef2f2',
          color: '#991b1b', fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Shield size={16} />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ height: '48px', borderRadius: '6px', backgroundColor: 'var(--neutral-100)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--neutral-0)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--neutral-200)' }}>
          <Database size={36} color="var(--neutral-300)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '6px' }}>No audit records found</div>
          <div style={{ fontSize: '13px', color: 'var(--neutral-400)' }}>
            {hasFilters ? 'Try adjusting your filters.' : 'Audit records will appear here as actions are performed.'}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && logs.length > 0 && (
        <div style={{
          backgroundColor: 'var(--neutral-0)',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Details'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: '11px', fontWeight: 700,
                        color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr
                    key={log._id}
                    style={{
                      borderBottom: i < logs.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 150ms'
                    }}
                    onClick={() => setSelected(log)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neutral-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--neutral-500)', whiteSpace: 'nowrap' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--neutral-700)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {log.actor?.name || log.actorName || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                        {log.role || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--neutral-700)', whiteSpace: 'nowrap' }}>
                      {log.entity}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '12px', color: 'var(--primary-600)', fontWeight: 500,
                          backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderTop: '1px solid var(--neutral-100)'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                Page {meta.page} of {meta.totalPages} &nbsp;·&nbsp; {meta.total} records
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--neutral-200)', backgroundColor: 'var(--neutral-0)',
                    color: page <= 1 ? 'var(--neutral-300)' : 'var(--neutral-600)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--neutral-200)', backgroundColor: 'var(--neutral-0)',
                    color: page >= meta.totalPages ? 'var(--neutral-300)' : 'var(--neutral-600)',
                    cursor: page >= meta.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {selected && <DetailDrawer log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
