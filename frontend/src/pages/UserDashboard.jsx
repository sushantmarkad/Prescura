import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// import { db } from '../config/firebase'; // Removed as we route via backend now
// import { doc, deleteDoc } from 'firebase/firestore'; // Removed

/* ─── SVG Icons ─── */
const Icons = {
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  ),
  download: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  activity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  inbox: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
};

/* ─── Delete Modal ─── */
function DeleteModal({ onCancel, onConfirm, isDeleting }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="ud-overlay" onClick={e => { if (e.target === e.currentTarget && !isDeleting) onCancel(); }}>
      <div className="ud-modal">
        <div className="ud-modal-icon">
          {Icons.trash}
        </div>
        <h3 className="ud-modal-title">Delete Prescription?</h3>
        <p className="ud-modal-body">
          This audit will be <strong>permanently deleted</strong> and cannot be recovered.
        </p>
        <div className="ud-modal-actions">
          <button className="ud-btn-cancel" onClick={onCancel} disabled={isDeleting}>Cancel</button>
          <button className="ud-btn-delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting
              ? <><span className="ud-spinner" /> Deleting…</>
              : <>{Icons.trash} Delete</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Toast ─── */
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <div className={`ud-toast ud-toast--${type}`}>
      <span className="ud-toast-icon">{type === 'error' ? Icons.warning : Icons.success}</span>
      {message}
    </div>,
    document.body
  );
}

/* ─── Helpers ─── */
function getTimestamp(createdAt) {
  if (!createdAt) return 0;
  if (createdAt._seconds) return createdAt._seconds * 1000;
  if (typeof createdAt === 'string') return new Date(createdAt).getTime();
  return 0;
}

function formatDateTime(createdAt) {
  const ts = getTimestamp(createdAt);
  if (!ts) return { date: 'Unknown', time: '' };
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

/* ─── Main Component ─── */
export default function UserDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [deleteAuditId, setDeleteAuditId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  useEffect(() => {
    const fetchMyAudits = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/user/audits/${currentUser.uid}`);
        const data = await res.json();
        if (data.success) setAudits(data.audits);
      } catch (e) {
        console.error('Failed to fetch user audits:', e);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser?.uid) fetchMyAudits();
  }, [currentUser]);

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.open(`${apiUrl}/api/export?uid=${currentUser.uid}`);
  };

  const handleDeleteClick = (e, id) => { e.stopPropagation(); setDeleteAuditId(id); };

  const confirmDelete = async () => {
    if (!deleteAuditId) return;
    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/audit/${deleteAuditId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete on server');
      }

      setAudits(prev => prev.filter(a => a.id !== deleteAuditId));
      setDeleteAuditId(null);
      showToast('Prescription deleted successfully.');
    } catch (err) {
      console.error(err);
      setDeleteAuditId(null);
      showToast(err.message || 'Failed to delete.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedAudits = useMemo(() =>
    [...audits].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)),
    [audits]
  );

  const filteredAudits = useMemo(() => sortedAudits.filter(a => {
    const cls = a.finalClassification || a.classification || 'PENDING';
    if (activeTab === 'pending') return cls === 'PENDING' || a.status === 'PENDING_REVIEW';
    return cls !== 'PENDING' && a.status !== 'PENDING_REVIEW';
  }), [sortedAudits, activeTab]);

  const stats = useMemo(() => ({
    total: audits.length,
    pending: audits.filter(a => (a.finalClassification || 'PENDING') === 'PENDING' || a.status === 'PENDING_REVIEW').length,
    rational: audits.filter(a => a.finalClassification === 'RATIONAL').length,
    irrational: audits.filter(a => a.finalClassification === 'IRRATIONAL').length,
  }), [audits]);

  return (
    <div className="ud-root animate-fade-in">
      <style>{`
        .ud-root { max-width: 1100px; margin: 0 auto; }

        /* ── Header ── */
        .ud-header { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .ud-title { font-size: clamp(1.5rem, 4vw, 2.1rem); font-weight: 800; letter-spacing: -0.04em; margin: 0 0 0.3rem; background: linear-gradient(135deg, var(--text-primary) 50%, var(--primary-color) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .ud-subtitle { color: var(--text-secondary); font-size: 0.875rem; margin: 0; }
        .ud-export-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, var(--primary-color), #6366f1); color: #fff; border: none; padding: 0.65rem 1.3rem; border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 14px rgba(14,165,233,0.35); white-space: nowrap; font-family: inherit; }
        .ud-export-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(14,165,233,0.45); }
        .ud-export-btn:active { transform: scale(0.97); }

        /* ── Stats ── */
        .ud-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .ud-stat { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 18px; padding: 1.1rem 1.25rem; display: flex; align-items: center; gap: 1rem; transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s; }
        .ud-stat:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,0,0,0.1); }
        .ud-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ud-stat--total .ud-stat-icon   { background: rgba(14,165,233,0.12); color: var(--primary-color); }
        .ud-stat--pending .ud-stat-icon { background: rgba(245,158,11,0.12); color: #d97706; }
        .ud-stat--rational .ud-stat-icon   { background: rgba(16,185,129,0.12); color: #059669; }
        .ud-stat--irrational .ud-stat-icon { background: rgba(239,68,68,0.12); color: var(--danger-color); }
        .ud-stat-body {}
        .ud-stat-val { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: var(--text-primary); }
        .ud-stat-lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); margin-top: 0.2rem; font-weight: 600; }

        /* ── Card ── */
        .ud-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 20px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }

        /* ── Tabs ── */
        .ud-tabs { display: flex; padding: 0 1.25rem; border-bottom: 1px solid var(--border-color); overflow-x: auto; gap: 0; }
        .ud-tab { background: none; border: none; border-bottom: 2.5px solid transparent; padding: 1rem 1.1rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: color 0.2s, border-color 0.2s; white-space: nowrap; font-family: inherit; display: inline-flex; align-items: center; gap: 0.5rem; }
        .ud-tab:hover { color: var(--text-primary); }
        .ud-tab.active { color: var(--accent-color); border-bottom-color: var(--accent-color); }
        .ud-tab-icon { opacity: 0.7; }
        .ud-tab-count { background: var(--bg-color); border-radius: 999px; padding: 0.1rem 0.5rem; font-size: 0.72rem; color: var(--text-secondary); font-weight: 700; }
        .ud-tab.active .ud-tab-count { background: rgba(245,158,11,0.12); color: var(--accent-color); }

        /* ── Table ── */
        .ud-table-wrap { overflow-x: auto; }
        .ud-table { width: 100%; border-collapse: collapse; }
        .ud-th { padding: 0.8rem 1rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); font-weight: 700; background: var(--bg-color); border-bottom: 1px solid var(--border-color); white-space: nowrap; text-align: left; }
        .ud-th--center { text-align: center; }
        .ud-row { border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.14s; }
        .ud-row:last-child { border-bottom: none; }
        .ud-row:hover { background: var(--bg-color); }
        .ud-row:hover .ud-chevron { opacity: 1; transform: translateX(2px); }
        .ud-td { padding: 0.85rem 1rem; vertical-align: middle; }

        /* ── Date cell ── */
        .ud-date-cell { display: flex; flex-direction: column; gap: 0.18rem; }
        .ud-date { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
        .ud-time { font-size: 0.72rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem; font-variant-numeric: tabular-nums; }

        /* ── Badge ── */
        .ud-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.65rem; border-radius: 6px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
        .ud-badge--rational   { background: rgba(16,185,129,0.12); color: #059669; }
        .ud-badge--irrational { background: rgba(239,68,68,0.12);  color: var(--danger-color); }
        .ud-badge--pending    { background: rgba(245,158,11,0.12);  color: #d97706; }
        .ud-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        /* ── Chevron ── */
        .ud-chevron { color: var(--text-secondary); opacity: 0; transition: opacity 0.15s, transform 0.15s; display: flex; align-items: center; }

        /* ── Delete button ── */
        .ud-del-btn { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .ud-del-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger-color); color: var(--danger-color); transform: scale(1.1); }
        .ud-del-btn:active { transform: scale(0.95); }

        /* ── Empty state ── */
        .ud-empty { padding: 4rem 1rem; text-align: center; }
        .ud-empty-icon { color: var(--border-color); display: flex; justify-content: center; margin-bottom: 1rem; }
        .ud-empty-text { color: var(--text-secondary); font-size: 0.9rem; }

        /* ── Skeleton ── */
        .ud-loading { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .ud-skeleton { height: 54px; border-radius: 10px; background: linear-gradient(90deg, var(--border-color) 25%, var(--bg-color) 50%, var(--border-color) 75%); background-size: 200% 100%; animation: ud-shimmer 1.5s infinite; }
        @keyframes ud-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        /* ── Modal ── */
        .ud-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem; animation: ud-fade 0.2s ease; }
        .ud-modal { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 24px; box-shadow: 0 40px 100px rgba(0,0,0,0.4); width: 100%; max-width: 360px; padding: 2rem 1.75rem; text-align: center; animation: ud-up 0.3s cubic-bezier(0.16,1,0.3,1); }
        .ud-modal-icon { width: 64px; height: 64px; border-radius: 18px; background: rgba(239,68,68,0.1); color: var(--danger-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
        .ud-modal-icon svg { width: 28px; height: 28px; }
        .ud-modal-title { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
        .ud-modal-body { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.65; margin: 0 0 1.75rem; }
        .ud-modal-actions { display: flex; gap: 0.75rem; }
        .ud-btn-cancel { flex: 1; padding: 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border-color); background: transparent; color: var(--text-primary); transition: background 0.18s; font-family: inherit; }
        .ud-btn-cancel:hover:not(:disabled) { background: var(--bg-color); }
        .ud-btn-delete { flex: 1; padding: 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; background: var(--danger-color); color: #fff; transition: background 0.18s, transform 0.18s; display: flex; align-items: center; justify-content: center; gap: 0.45rem; font-family: inherit; }
        .ud-btn-delete:hover:not(:disabled) { background: var(--danger-hover, #dc2626); transform: translateY(-1px); }
        .ud-btn-delete:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .ud-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: ud-spin 0.65s linear infinite; flex-shrink: 0; }

        /* ── Toast ── */
        .ud-toast { position: fixed; bottom: max(1.5rem, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); padding: 0.65rem 1.25rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: #fff; box-shadow: 0 8px 28px rgba(0,0,0,0.22); white-space: nowrap; z-index: 99999; pointer-events: none; animation: ud-toast-in 0.3s cubic-bezier(0.16,1,0.3,1); display: flex; align-items: center; gap: 0.5rem; }
        .ud-toast--success { background: #059669; }
        .ud-toast--error   { background: var(--danger-color); }
        .ud-toast-icon { display: flex; align-items: center; flex-shrink: 0; }

        /* ── Keyframes ── */
        @keyframes ud-fade   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ud-up     { from { opacity: 0; transform: translateY(24px) scale(0.94) } to { opacity: 1; transform: none } }
        @keyframes ud-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(10px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
        @keyframes ud-spin   { to { transform: rotate(360deg) } }

        /* ── Responsive ── */
        @media (max-width: 700px) {
          .ud-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .ud-stat { padding: 0.9rem 1rem; gap: 0.75rem; }
          .ud-table .ud-td--dept, .ud-table .ud-th--dept { display: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="ud-header">
        <div>
          <h1 className="ud-title">My Dashboard</h1>
          <p className="ud-subtitle">Logged in as <strong>{currentUser?.email}</strong></p>
        </div>
        <button className="ud-export-btn" onClick={handleExport}>
          {Icons.download} Export Data
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="ud-stats">
        {[
          { cls: 'total',      icon: Icons.activity,  val: stats.total,      lbl: 'Total Scanned' },
          { cls: 'pending',    icon: Icons.pending,   val: stats.pending,    lbl: 'Pending Review' },
          { cls: 'rational',   icon: Icons.check,     val: stats.rational,   lbl: 'Rational' },
          { cls: 'irrational', icon: Icons.x,         val: stats.irrational, lbl: 'Irrational' },
        ].map(s => (
          <div key={s.cls} className={`ud-stat ud-stat--${s.cls}`}>
            <div className="ud-stat-icon">{s.icon}</div>
            <div className="ud-stat-body">
              <div className="ud-stat-val">{loading ? '—' : s.val}</div>
              <div className="ud-stat-lbl">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Card ── */}
      <div className="ud-card">

        {/* Tabs */}
        <div className="ud-tabs">
          {[
            { key: 'pending',   icon: Icons.pending, label: 'Pending Review',    count: stats.pending },
            { key: 'completed', icon: Icons.check,   label: 'Completed Results', count: stats.rational + stats.irrational },
          ].map(t => (
            <button
              key={t.key}
              className={`ud-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="ud-tab-icon">{t.icon}</span>
              {t.label}
              <span className="ud-tab-count">{loading ? '…' : t.count}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="ud-loading">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="ud-skeleton" style={{ animationDelay: `${i * 0.08}s`, opacity: 1 - i * 0.1 }} />
            ))}
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="ud-empty">
            <div className="ud-empty-icon">{Icons.inbox}</div>
            <p className="ud-empty-text">No {activeTab === 'pending' ? 'pending' : 'completed'} prescriptions found.</p>
          </div>
        ) : (
          <div className="ud-table-wrap">
            <table className="ud-table">
              <thead>
                <tr>
                  <th className="ud-th">Date &amp; Time</th>
                  <th className="ud-th ud-th--dept">Department</th>
                  <th className="ud-th">Classification</th>
                  <th className="ud-th ud-th--center" style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((audit, idx) => {
                  const cls = audit.finalClassification || audit.classification || 'PENDING';
                  const { date, time } = formatDateTime(audit.createdAt);
                  return (
                    <tr
                      key={audit.id}
                      className="ud-row"
                      onClick={() => navigate(`/audit-review/${audit.id}`)}
                    >
                      <td className="ud-td">
                        <div className="ud-date-cell">
                          <span className="ud-date">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {Icons.calendar}{date}
                            </span>
                          </span>
                          {time && (
                            <span className="ud-time">
                              {Icons.clock}{time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="ud-td ud-td--dept" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {audit.department || 'General'}
                      </td>
                      <td className="ud-td">
                        <span className={`ud-badge ud-badge--${cls.toLowerCase()}`}>
                          <span className="ud-badge-dot" />
                          {cls}
                        </span>
                      </td>
                      <td className="ud-td" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <button
                            className="ud-del-btn"
                            onClick={e => handleDeleteClick(e, audit.id)}
                            title="Delete audit"
                          >
                            {Icons.trash}
                          </button>
                          <span className="ud-chevron">{Icons.chevronRight}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portals */}
      {deleteAuditId && (
        <DeleteModal
          onCancel={() => !isDeleting && setDeleteAuditId(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
