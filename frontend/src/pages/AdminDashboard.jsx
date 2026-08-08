import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [users, setUsers] = useState([]);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Fetch stats
        const statsRes = await fetch(`${apiUrl}/api/stats`);
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) setStats(statsData.stats);
        
        // Fetch users
        const usersRes = await fetch(`${apiUrl}/api/admin/users`);
        const usersData = await usersRes.json();
        if (usersData.success) setUsers(usersData.users);
        
        // Fetch settings
        const settingsRes = await fetch(`${apiUrl}/api/admin/settings`);
        const settingsData = await settingsRes.json();
        if (settingsData.success) setMaintenance(settingsData.settings.maintenanceMode);
        
      } catch (e) {
        console.error("Failed to fetch admin data:", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const toggleMaintenance = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/admin/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenance })
      });
      if (res.ok) setMaintenance(!maintenance);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (uid) => {
    if (!window.confirm("Are you sure? This will anonymize their data and delete their account.")) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/admin/users/${uid}`, { method: 'DELETE' });
      if (res.ok) setUsers(users.filter(u => u.uid !== uid));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.open(`${apiUrl}/api/export`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Super Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            System overview. Role: <span className="badge badge-pending">{userRole}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${maintenance ? 'btn-danger' : 'btn-secondary'}`} 
            onClick={toggleMaintenance}
          >
            {maintenance ? '🔴 Maintenance Mode ON' : '⚙️ Enable Maintenance'}
          </button>
          <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Export Hospital Data
          </button>
        </div>
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
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem' }}>User Management</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem' }}><span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-rational' : 'badge-pending'}`}>{u.role}</span></td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.role !== 'SUPER_ADMIN' && (
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => deleteUser(u.uid)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
