import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAudited: 0, rational: 0, irrational: 0, pending: 0 });
  const [users, setUsers] = useState([]);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
        
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
      const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
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
      const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
      const res = await fetch(`${apiUrl}/api/admin/users/${uid}`, { method: 'DELETE' });
      if (res.ok) setUsers(users.filter(u => u.uid !== uid));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
    window.open(`${apiUrl}/api/export`);
  };

  return (
    <div className="animate-fade-in">
      <style>{`
        .admin-header {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .admin-actions {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .admin-kpi-val {
          font-size: 2.5rem;
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.25rem;
          }
          .admin-actions {
            width: 100%;
          }
          .admin-actions .btn {
            flex: 1 1 calc(50% - 0.3rem);
            font-size: 0.82rem;
          }
          .admin-kpi-val {
            font-size: 1.8rem;
          }
        }
        @media (max-width: 480px) {
          .admin-actions .btn {
            flex: 1 1 100%;
          }
          .admin-kpi-val {
            font-size: 1.5rem;
          }
        }
      `}</style>
      <div className="admin-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            System overview. Role: <span className="badge badge-pending">{userRole}</span>
          </p>
        </div>
        <div className="admin-actions">
          <button 
            className="btn btn-primary" 
            style={{ background: 'linear-gradient(135deg, #059669, #0ea5e9)' }}
            onClick={() => navigate('/final-report')}
          >
            <span>📑</span> Final NABH Report
          </button>
          <button 
            className={`btn ${maintenance ? 'btn-danger' : 'btn-secondary'}`} 
            onClick={toggleMaintenance}
          >
            {maintenance ? '🔴 Maintenance Mode ON' : '⚙️ Enable Maintenance'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Export Hospital Data
          </button>
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Audited</h3>
          <div className="admin-kpi-val" style={{ color: 'var(--text-primary)' }}>{loading ? '...' : stats.totalAudited.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rational</h3>
          <div className="admin-kpi-val" style={{ color: 'var(--success-color)' }}>{loading ? '...' : stats.rational.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Irrational</h3>
          <div className="admin-kpi-val" style={{ color: 'var(--danger-color)' }}>{loading ? '...' : stats.irrational.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Review</h3>
          <div className="admin-kpi-val" style={{ color: 'var(--accent-color)' }}>{loading ? '...' : stats.pending.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem' }}>User Management</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '420px', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }} onClick={() => deleteUser(u.uid)}>
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
