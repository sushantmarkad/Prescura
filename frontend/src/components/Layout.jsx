import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'var(--primary-color)' : 'var(--text-secondary)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="glass-panel" style={{ 
        padding: '1rem', 
        marginBottom: '2rem', 
        borderRadius: '0', 
        borderTop: 'none', 
        borderLeft: 'none', 
        borderRight: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              backgroundColor: 'var(--primary-color)', 
              color: 'white', 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}>+</div>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Prescura</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>AI Audit System</span>
            </div>
          </div>
          
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <nav style={{ display: 'flex', gap: '1.25rem', fontWeight: 500, fontSize: '0.95rem' }}>
                <Link to="/" style={{ color: isActive('/') }}>Dashboard</Link>
                {/* Everyone can upload/audit now */}
                <Link to="/upload" style={{ color: isActive('/upload') }}>Audit New</Link>
              </nav>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                <button 
                  onClick={toggleTheme} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
                  title="Toggle Theme"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                
                <div style={{ textAlign: 'right', display: 'none' }} className="desktop-only">
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.email.split('@')[0]}</div>
                  <div className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{userRole}</div>
                </div>
                
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container" style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
        &copy; {new Date().getFullYear()} Prescura Medical Systems. All rights reserved.
      </footer>
      
      {/* Small inline style for desktop-only class without bloating global.css */}
      <style>{`
        @media (min-width: 640px) {
          .desktop-only { display: block !important; }
        }
      `}</style>
    </div>
  );
}
