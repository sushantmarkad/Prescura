import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyAudits = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/user/audits/${currentUser.uid}`);
        const data = await res.json();
        
        if (data.success) {
          setAudits(data.audits);
        }
      } catch (e) {
        console.error("Failed to fetch user audits:", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser?.uid) {
      fetchMyAudits();
    }
  }, [currentUser]);

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // In a real app, you would pass the userId to the export endpoint to only download their data
    window.open(`${apiUrl}/api/export`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {currentUser?.email}. You have scanned <strong>{audits.length}</strong> prescriptions.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⬇️</span> Download My Data
        </button>
      </div>

      <div className="grid-cols-2">
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem' }}>My Scan History</h3>
          {loading ? (
            <p>Loading history...</p>
          ) : audits.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>You haven't scanned any prescriptions yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem' }}>Date</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map(audit => (
                    <tr key={audit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(audit.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>{audit.department}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${audit.classification === 'RATIONAL' ? 'badge-rational' : 'badge-irrational'}`}>
                          {audit.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
