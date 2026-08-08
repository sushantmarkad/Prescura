import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(isLogin ? 'Failed to log in. Check credentials.' : 'Failed to create account.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>{isLogin ? 'System Login' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI Prescription Audit & Safety</p>
        </div>

        {error && (
          <div style={{ padding: '0.8rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Creating...') : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
        
        {import.meta.env.VITE_MOCK_AUTH === 'true' && (
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Mock Auth Enabled. Any credentials will work.
          </div>
        )}
      </div>
    </div>
  );
}
