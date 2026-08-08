import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a fully integrated app, fetch from backend:
    // fetch('http://localhost:5000/api/stats').then(r => r.json()).then(data => setStats(data.stats));
    
    // Using mock timeout for demo since backend might not be running
    setTimeout(() => {
      setStats({
        totalAudited: 1250,
        rational: 1100,
        irrational: 150,
        pending: 45
      });
      setLoading(false);
    }, 500);
  }, []);

  const handleExport = () => {
    // window.open('http://localhost:5000/api/export');
    alert("Export triggered! (In production this downloads the Excel file from backend)");
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

      <div className="grid-cols-2">
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}>Recent Audits</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <p>Database integration pending. This area will show the most recently processed prescriptions.</p>
          </div>
        </div>
        
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}>System Status</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span>AI Engine</span>
              <span className="badge badge-rational">Online</span>
            </li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Database Sync</span>
              <span className="badge badge-rational">Connected</span>
            </li>
            <li style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
              <span>Guideline Version</span>
              <span className="badge" style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>v2.4 (NABH)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
