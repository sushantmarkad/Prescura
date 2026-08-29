import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & sort state
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'RATIONAL' | 'IRRATIONAL' | 'PENDING_REVIEW'

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

    // Filter
    if (filterStatus !== 'all') {
      result = result.filter(a => {
        if (filterStatus === 'PENDING_REVIEW') return a.status === 'PENDING_REVIEW';
        return a.finalClassification === filterStatus;
      });
    }

    // Sort
    result.sort((a, b) => {
      const tA = getTimestamp(a.createdAt);
      const tB = getTimestamp(b.createdAt);
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });

    return result;
  }, [audits, sortOrder, filterStatus]);

  const handleExportCSV = () => {
    if (filteredAndSorted.length === 0) {
      alert('No records to export with current filters.');
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
    { label: '🟡 Pending', value: 'PENDING_REVIEW' },
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

        {/* Filter buttons */}
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
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  {getStatusBadge(audit.status, audit.finalClassification)}
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
    </div>
  );
}
