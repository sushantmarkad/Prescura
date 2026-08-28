import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Fetch stats
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

        // Fetch user audits
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

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.open(`${apiUrl}/api/export?uid=${currentUser?.uid}`);
  };

  const getStatusBadge = (status, finalClassification) => {
      if (status === 'PENDING_REVIEW') return <span className="badge badge-pending" style={{boxShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>Review Pending</span>;
      if (finalClassification === 'RATIONAL') return <span className="badge badge-rational" style={{boxShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>Rational</span>;
      if (finalClassification === 'IRRATIONAL') return <span className="badge badge-irrational" style={{backgroundColor: 'var(--danger-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>Irrational</span>;
      return <span className="badge" style={{boxShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{status}</span>;
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'Unknown Date';
    // Handle Firebase Timestamp format {_seconds, _nanoseconds}
    if (dateObj._seconds) {
      return new Date(dateObj._seconds * 1000).toLocaleDateString();
    }
    return new Date(dateObj).toLocaleDateString();
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {currentUser?.email || 'User'}. Your role is <span className="badge badge-pending">{userRole || 'VIEWER'}</span>.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> Export to Excel
        </button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '3rem' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Audited</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{loading ? '...' : stats.totalAudited.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rational</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{loading ? '...' : stats.rational.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Irrational</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{loading ? '...' : stats.irrational.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Review</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{loading ? '...' : stats.pending.toLocaleString()}</div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Your Processed Prescriptions</h3>
      
      {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading your prescriptions...</p>
      ) : audits.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't audited any prescriptions yet.</p>
              <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload Prescription</button>
          </div>
      ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {audits.map(audit => (
                  <div 
                    key={audit.id} 
                    className="glass-card" 
                    style={{ cursor: 'pointer', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}
                    onClick={() => navigate(`/audit-review/${audit.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                      <div style={{ height: '220px', width: '100%', backgroundColor: 'var(--surface-color)', position: 'relative' }}>
                          {audit.imageUrl ? (
                              <img src={audit.imageUrl} alt="Prescription" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>No Image</div>
                          )}
                          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                              {getStatusBadge(audit.status, audit.finalClassification)}
                          </div>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                              {audit.extractedData?.patientName || 'Unknown Patient'}
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                {formatDate(audit.createdAt)}
                            </p>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>Review →</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
