import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Zap, Server, Settings, CheckCircle2, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, setCustomApiUrl } from '../services/api';
import { Modal } from '../components/common/Modal';
import axios from 'axios';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Server URL Settings
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl().replace(/\/api\/?$/, ''));
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSaveServerUrl = () => {
    setCustomApiUrl(serverUrlInput.trim());
    setIsServerModalOpen(false);
    setError(null);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);
    try {
      const base = serverUrlInput.trim().replace(/\/+$/, '');
      const testUrl = `${base}/health`;
      const res = await axios.get(testUrl, { timeout: 6000 });
      if (res.status === 200) {
        setTestStatus('success');
        setTestMessage('✅ Connection successful! Backend server is active & responsive.');
      } else {
        setTestStatus('error');
        setTestMessage(`Received status ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Unable to reach backend. Check URL & ensure CORS is allowed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Background Glows */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '25%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67, 97, 238, 0.25) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '25%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(114, 9, 183, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 10,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(67, 97, 238, 0.15)',
        }}
      >
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4361EE, #7209B7)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(67, 97, 238, 0.4)',
            }}
          >
            <Zap size={30} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Insplit Operations
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Sign in with an Administrator account to access the control center.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              fontSize: '13px',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={17}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="email"
                className="input-control"
                placeholder="admin@insplit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="password"
                className="input-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: '13px', marginTop: '8px', width: '100%', fontSize: '15px' }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Dashboard</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Tip / Footer */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsServerModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', marginBottom: '14px', width: '100%', gap: '6px' }}
          >
            <Server size={14} color="var(--accent-cyan)" />
            <span>API Server: <strong>{getApiBaseUrl().replace(/\/api\/?$/, '')}</strong></span>
            <Settings size={12} style={{ marginLeft: 'auto' }} />
          </button>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            To promote your account to Admin, run: <br />
            <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>npm run seed:admin your-email@gmail.com</code>
          </p>
        </div>
      </div>

      {/* Server Endpoint Configuration Modal */}
      <Modal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        title="Configure Backend API Server"
        subtitle="Set the API host URL for this web dashboard session (supports HTTPS endpoints, Render, Railway, ngrok)."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Backend Server URL
            </label>
            <div style={{ position: 'relative' }}>
              <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="https://your-backend-app.onrender.com"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              💡 If deployed on Netlify, browsers require an <strong>HTTPS</strong> backend URL (or an HTTPS tunnel like ngrok) to avoid mixed-content blocking.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="btn btn-secondary"
            style={{ width: '100%', gap: '8px' }}
          >
            <Zap size={14} />
            <span>{testStatus === 'testing' ? 'Testing Connection...' : 'Test Backend Connection (/health)'}</span>
          </button>

          {testMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: testStatus === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                border: `1px solid ${testStatus === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                color: testStatus === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              }}
            >
              {testStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => {
                setServerUrlInput(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
                setCustomApiUrl(null);
                setTestStatus('idle');
                setTestMessage(null);
              }}
              className="btn btn-secondary"
            >
              Reset to Default
            </button>
            <button onClick={handleSaveServerUrl} className="btn btn-primary">
              Save & Apply
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
