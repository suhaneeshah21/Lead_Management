import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(credentials);
      navigate(user.mustChangePassword ? '/change-password' : '/');
    } catch (requestError) {
      setError(
        requestError.response?.status === 401 ? 'Invalid email or password' : 'Unable to sign in'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-art">
        <div className="brand">
          NEST<span>/CRM</span>
        </div>
        <h1>Every lead has a next move.</h1>
        <p>A calm command center for ambitious property teams.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">TEAM ACCESS</p>
        <h2>Welcome back</h2>
        <label>
          Email
          <input
            type="email"
            required
            value={credentials.email}
            onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={credentials.password}
            onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'} <span>→</span>
        </button>
        <Link to="/bootstrap">Create first admin</Link>
      </form>
    </div>
  );
}
