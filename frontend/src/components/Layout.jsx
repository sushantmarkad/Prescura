import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MoonIcon, SunIcon, MenuIcon, CloseIcon, DashboardIcon, PlusIcon, ReportIcon, LogoutIcon } from './Icons';

export default function Layout() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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
      <header className="glass-panel app-header" style={{ 
        padding: '0.75rem max(1rem, env(safe-area-inset-right)) 0.75rem max(1rem, env(safe-area-inset-left))',
        marginBottom: '1.25rem', 
        borderRadius: '0', 
        borderTop: 'none', 
        borderLeft: 'none', 
        borderRight: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: `max(0.75rem, env(safe-area-inset-top))`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
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
              fontSize: '1.2rem',
              flexShrink: 0
            }}>+</div>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Prescura</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>AI Audit System</span>
            </div>
          </Link>
          
          {currentUser && (
            <>
              {/* Desktop Nav */}
              <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <nav style={{ display: 'flex', gap: '1.25rem', fontWeight: 500, fontSize: '0.95rem' }}>
                  <Link to="/" style={{ color: isActive('/') }}>Dashboard</Link>
                  <Link to="/upload" style={{ color: isActive('/upload') }}>Audit New</Link>
                  <Link to="/final-report" style={{ color: isActive('/final-report') }}>Final Report</Link>
                </nav>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                  <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: '0.3rem' }} title="Toggle Theme" aria-label="Toggle Theme">
                    {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.email.split('@')[0]}</div>
                    <div className="badge badge-pending" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>{userRole}</div>
                  </div>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <LogoutIcon size={14} /> Logout
                  </button>
                </div>
              </div>

              {/* Mobile Nav Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="mobile-theme-btn"
                  onClick={toggleTheme}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.4rem', display: 'none', alignItems: 'center' }}
                  aria-label="Toggle Theme"
                >
                  {theme === 'light' ? <MoonIcon size={19} /> : <SunIcon size={19} />}
                </button>
                <button
                  className="mobile-menu-btn"
                  onClick={() => setMenuOpen(o => !o)}
                  style={{ 
                    background: 'none', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    color: 'var(--text-primary)', 
                    display: 'none',
                    width: '40px',
                    height: '40px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <CloseIcon size={18} /> : <MenuIcon size={20} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu Drawer */}
        {currentUser && menuOpen && (
          <div className="mobile-menu-drawer animate-fade-in" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border-color)', marginTop: '0.75rem',
            paddingTop: '0.5rem',
            paddingBottom: 'env(safe-area-inset-bottom, 0)'
          }}>
            <Link 
              to="/" 
              style={{ 
                padding: '0.85rem 1rem', 
                color: location.pathname === '/' ? 'var(--primary-color)' : 'var(--text-primary)', 
                fontWeight: 600, 
                borderRadius: '8px',
                background: location.pathname === '/' ? 'var(--primary-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                margin: '0.2rem 0'
              }}
            >
              <DashboardIcon size={18} /> Dashboard
            </Link>
            <Link 
              to="/upload" 
              style={{ 
                padding: '0.85rem 1rem', 
                color: location.pathname === '/upload' ? 'var(--primary-color)' : 'var(--text-primary)', 
                fontWeight: 600, 
                borderRadius: '8px',
                background: location.pathname === '/upload' ? 'var(--primary-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                margin: '0.2rem 0'
              }}
            >
              <PlusIcon size={18} /> Audit New
            </Link>
            <Link 
              to="/final-report" 
              style={{ 
                padding: '0.85rem 1rem', 
                color: location.pathname === '/final-report' ? 'var(--primary-color)' : 'var(--text-primary)', 
                fontWeight: 600, 
                borderRadius: '8px',
                background: location.pathname === '/final-report' ? 'var(--primary-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                margin: '0.2rem 0'
              }}
            >
              <ReportIcon size={18} /> Final NABH Report
            </Link>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.75rem', 
              padding: '0.85rem 1rem', 
              borderTop: '1px solid var(--border-color)',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.email}</div>
                  <div className="badge badge-pending" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', marginTop: '0.2rem' }}>{userRole}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={toggleTheme} 
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', minHeight: '34px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {theme === 'light' ? <><MoonIcon size={14} /> Dark</> : <><SunIcon size={14} /> Light</>}
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '34px', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <LogoutIcon size={13} /> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="container" style={{ flex: 1, paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      <footer style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        &copy; {new Date().getFullYear()} Prescura Medical Systems. All rights reserved.
      </footer>
      
      <style>{`
        @media (min-width: 821px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-theme-btn { display: none !important; }
        }
        @media (max-width: 820px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: inline-flex !important; }
          .mobile-theme-btn { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}
