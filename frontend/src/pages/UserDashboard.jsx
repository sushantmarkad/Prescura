import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
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
    window.open(`${apiUrl}/api/export?uid=${currentUser.uid}`);
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
                  {audits.map(audit => {
                    const classification = audit.finalClassification || audit.classification || 'PENDING';
                    
                    // Handle Firestore Timestamp (which serializes as an object with _seconds)
                    let dateString = 'Invalid Date';
                    if (audit.createdAt) {
                      if (audit.createdAt._seconds) {
                        dateString = new Date(audit.createdAt._seconds * 1000).toLocaleDateString();
                      } else if (typeof audit.createdAt === 'string') {
                        dateString = new Date(audit.createdAt).toLocaleDateString();
                      }
                    }

                    return (
                      <tr 
                        key={audit.id} 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onClick={() => navigate(`/audit-review/${audit.id}`)}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-color)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem' }}>{dateString}</td>
                        <td style={{ padding: '0.75rem' }}>{audit.department || 'General'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${classification === 'RATIONAL' ? 'badge-rational' : classification === 'PENDING' ? 'badge-pending' : 'badge-irrational'}`}>
                            {classification}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
