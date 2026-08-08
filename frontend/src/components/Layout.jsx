import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>AI Audit System</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prescription Safety</span>
        </div>
        
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/">Dashboard</Link>
              {(userRole === 'ADMIN' || userRole === 'PHARMACOLOGIST' || userRole === 'AUDITOR') && (
                <Link to="/upload">Upload</Link>
              )}
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{currentUser.email}</div>
                <div className="badge badge-pending" style={{ fontSize: '0.65rem' }}>{userRole}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Logout</button>
            </div>
          </div>
        )}
      </header>

      <main className="container" style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} AI Prescription Audit & Medication Safety System
      </footer>
    </div>
  );
}
