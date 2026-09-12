import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// import { db } from '../config/firebase'; // Removed as we route via backend now
// import { doc, deleteDoc } from 'firebase/firestore'; // Removed

/* ─── Portal Delete Modal ─── */
function DeleteModal({ onCancel, onConfirm, isDeleting }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: '1.5rem',
        animation: 'overlayIn 0.2s ease forwards',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onCancel(); }}
    >
      <div style={{
        background: 'var(--surface-color)', border: '1px solid var(--border-color)',
        borderRadius: '20px', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: '380px', padding: '2rem 1.75rem',
        textAlign: 'center', animation: 'modalUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 1.25rem' }}>🗑️</div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>Delete Prescription?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.75rem' }}>
          This prescription audit will be <strong>permanently deleted</strong>. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onCancel} disabled={isDeleting} style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', opacity: isDeleting ? 0.5 : 1 }}>Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--danger-color)', color: '#fff', opacity: isDeleting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            {isDeleting ? (<><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Deleting...</>) : 'Delete'}
          </button>
        </div>
      </div>
      <style>{`@keyframes overlayIn{from{opacity:0}to{opacity:1}}@keyframes modalUp{from{opacity:0;transform:translateY(28px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>,
    document.body
  );
}

/* ─── Portal Toast ─── */
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <div style={{ position: 'fixed', bottom: 'max(1.5rem, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards', pointerEvents: 'none' }}>
      <div style={{ background: type === 'error' ? 'var(--danger-color)' : '#10b981', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
        {type === 'error' ? '⚠️' : '✅'} {message}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>,
    document.body
  );
}

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & sort state
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'RATIONAL' | 'IRRATIONAL'
  const [deleteAuditId, setDeleteAuditId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        const statsRes = await fetch(`${apiUrl}/api/stats`);
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats({
            totalAudited: statsData.stats.totalAudited || 0,
            rational: statsData.stats.rational || 0,
            irrational: statsData.stats.irrational || 0,
            pending: statsData.stats.pending || 0
          });
        }

        if (currentUser?.uid) {
          const auditsRes = await fetch(`${apiUrl}/api/user/audits/${currentUser.uid}`);
          const auditsData = await auditsRes.json();
          if (auditsData.success && auditsData.audits) {
            setAudits(auditsData.audits);
          }
        }
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const getTimestamp = (dateObj) => {
    if (!dateObj) return 0;
    if (dateObj._seconds) return dateObj._seconds * 1000;
    return new Date(dateObj).getTime();
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...audits];

    // Split by tab
    if (activeTab === 'pending') {
      result = result.filter(a => a.status === 'PENDING_REVIEW');
    } else {
      result = result.filter(a => a.status !== 'PENDING_REVIEW');
      // Filter within completed
      if (filterStatus !== 'all') {
        result = result.filter(a => a.finalClassification === filterStatus);
      }
    }

    // Sort
    result.sort((a, b) => {
      const tA = getTimestamp(a.createdAt);
      const tB = getTimestamp(b.createdAt);
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });

    return result;
  }, [audits, activeTab, sortOrder, filterStatus]);

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setDeleteAuditId(id);
  };

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
      console.error('Delete Error:', err);
      setDeleteAuditId(null);
      showToast(err.message || 'Failed to delete. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredAndSorted.length === 0) {
      showToast('No records to export with current filters.', 'error');
      return;
    }

    const headers = [
      'Audit ID', 'Patient Name', 'Status', 'Classification', 'Date',
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
      'B1', 'B2', 'B3', 'B4',
      'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
      'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
      'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7',
      'F1', 'F2', 'F3', 'F4'
    ];

    const rows = filteredAndSorted.map(a => {
      const audit = a.auditResults || a.extractedData?.audit || {};
      const getAnswer = (key) => (audit[key]?.answer || audit[key] || '');
      return [
        a.id,
        a.extractedData?.patientName || 'Unknown',
        a.status || '',
        a.finalClassification || '',
        formatDate(a.createdAt),
        getAnswer('A1'), getAnswer('A2'), getAnswer('A3'), getAnswer('A4'), getAnswer('A5'), getAnswer('A6'),
        getAnswer('B1'), getAnswer('B2'), getAnswer('B3'), getAnswer('B4'),
        getAnswer('C1'), getAnswer('C2'), getAnswer('C3'), getAnswer('C4'), getAnswer('C5'),
        getAnswer('C6'), getAnswer('C7'), getAnswer('C8'), getAnswer('C9'), getAnswer('C10'),
        getAnswer('D1'), getAnswer('D2'), getAnswer('D3'), getAnswer('D4'), getAnswer('D5'), getAnswer('D6'), getAnswer('D7'),
        getAnswer('E1'), getAnswer('E2'), getAnswer('E3'), getAnswer('E4'), getAnswer('E5'), getAnswer('E6'), getAnswer('E7'),
        getAnswer('F1'), getAnswer('F2'), getAnswer('F3'), getAnswer('F4'),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prescura_audit_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status, finalClassification) => {
    if (status === 'PENDING_REVIEW') return <span className="badge badge-pending">Review Pending</span>;
    if (finalClassification === 'RATIONAL') return <span className="badge badge-rational">Rational</span>;
    if (finalClassification === 'IRRATIONAL') return <span className="badge badge-irrational" style={{ backgroundColor: 'var(--danger-color)' }}>Irrational</span>;
    return <span className="badge">{status}</span>;
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'Unknown Date';
    if (dateObj._seconds) return new Date(dateObj._seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return new Date(dateObj).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: '🟢 Rational', value: 'RATIONAL' },
    { label: '🔴 Irrational', value: 'IRRATIONAL' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {currentUser?.email || 'User'}. Role: <span className="badge badge-pending">{userRole || 'VIEWER'}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>＋</span> Upload New
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-4" style={{ marginBottom: '3rem' }}>
        {[
          { label: 'Total Audited', value: stats.totalAudited, color: 'var(--text-primary)' },
          { label: 'Rational', value: stats.rational, color: 'var(--success-color)' },
          { label: 'Irrational', value: stats.irrational, color: 'var(--danger-color)' },
          { label: 'Pending Review', value: stats.pending, color: 'var(--accent-color)' },
        ].map(s => (
          <div key={s.label} className="glass-card">
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: s.color }}>{loading ? '...' : s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer',
            color: activeTab === 'pending' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pending' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: activeTab === 'pending' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          Pending Review
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer',
            color: activeTab === 'completed' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'completed' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: activeTab === 'completed' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          Completed
        </button>
      </div>

      {/* Toolbar: Sort + Filter + Export */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
        marginBottom: '1.5rem', padding: '1rem 1.25rem',
        background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)'
      }}>
        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sort:</span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            style={{
              background: 'var(--bg-color)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '0.4rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <option value="newest">📅 Newest First</option>
            <option value="oldest">📅 Oldest First</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        {/* Filter buttons (only for Completed tab) */}
        {activeTab === 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter:</span>
            {filterButtons.map(fb => (
              <button
                key={fb.value}
                onClick={() => setFilterStatus(fb.value)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem',
                  cursor: 'pointer', border: '1px solid',
                  borderColor: filterStatus === fb.value ? 'var(--accent-color)' : 'var(--border-color)',
                  background: filterStatus === fb.value ? 'var(--accent-color)' : 'transparent',
                  color: filterStatus === fb.value ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  fontWeight: filterStatus === fb.value ? '600' : '400'
                }}
              >
                {fb.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem',
              cursor: 'pointer', border: '1px solid var(--success-color)',
              background: 'transparent', color: 'var(--success-color)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s', fontWeight: '600'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--success-color)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--success-color)'; }}
          >
            ⬇ Export CSV ({filteredAndSorted.length})
          </button>
        </div>
      </div>

      {/* Heading */}
      <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {filteredAndSorted.length} Result{filteredAndSorted.length !== 1 ? 's' : ''}
      </h3>

      {/* Audit Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading your prescriptions...</p>
      ) : filteredAndSorted.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {audits.length === 0 ? "You haven't audited any prescriptions yet." : "No prescriptions match the selected filter."}
          </p>
          {audits.length === 0 && (
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload Prescription</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {filteredAndSorted.map(audit => (
            <div
              key={audit.id}
              className="glass-card"
              style={{ cursor: 'pointer', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--border-color)' }}
              onClick={() => navigate(`/audit-review/${audit.id}`)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ height: '200px', width: '100%', backgroundColor: 'var(--surface-color)', position: 'relative' }}>
                {audit.imageUrl
                  ? <img src={audit.imageUrl} alt="Prescription" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>No Image</div>
                }
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {getStatusBadge(audit.status, audit.finalClassification)}
                  <button 
                    onClick={(e) => handleDeleteClick(e, audit.id)}
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-color)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                    title="Delete Audit"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div style={{ padding: '1rem 1.1rem' }}>
                <h4 style={{ margin: '0 0 0.35rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {audit.extractedData?.patientName || 'Unknown Patient'}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(audit.createdAt)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '600' }}>Review →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Portal-rendered Delete Modal */}
      {deleteAuditId && (
        <DeleteModal
          onCancel={() => !isDeleting && setDeleteAuditId(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Portal-rendered Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
