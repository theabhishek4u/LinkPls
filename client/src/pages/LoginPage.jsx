import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/UI/Button';
import './LoginPage.css';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
        setSuccess('Account created! Check your email for verification.');
        setIsSignup(false);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-page__bg">
        <div className="login-page__orb login-page__orb--1" />
        <div className="login-page__orb login-page__orb--2" />
        <div className="login-page__orb login-page__orb--3" />
      </div>

      {/* Login Card */}
      <div className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo">⚡</div>
          <h1 className="login-card__title gradient-text">InAutoDm</h1>
          <p className="login-card__desc">
            {isSignup ? 'Create your account' : 'Welcome back, commander'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-form__error">{error}</div>}
          {success && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: 'var(--success)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
            }}>
              {success}
            </div>
          )}

          <div className="login-form__group">
            <label className="login-form__label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              id="login-email"
            />
          </div>

          <div className="login-form__group">
            <label className="login-form__label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              id="login-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            size="lg"
          >
            {isSignup ? 'Create Account' : 'Sign In'}
          </Button>

          <div className="login-form__divider">or</div>

          <div className="login-form__footer">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(!isSignup); setError(''); }}>
              {isSignup ? 'Sign in' : 'Sign up'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
