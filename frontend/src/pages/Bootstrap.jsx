import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Bootstrap() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', key: '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      await api.post(
        '/auth/bootstrap',
        { name: form.name, email: form.email, password: form.password },
        { headers: { 'x-bootstrap-key': form.key } }
      );
      navigate('/login');
    } catch (requestError) {
      setError(
        requestError.response?.status === 403
          ? requestError.response.data?.error?.message || 'Admin setup is not available'
          : requestError.response?.data?.error?.message || 'Unable to create admin'
      );
    }
  }
  return (
    <form className="login-form centered-form" onSubmit={submit}>
      <p className="eyebrow">FIRST-TIME SETUP</p>
      <h2>Create admin</h2>
      <label>
        Name
        <input
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </label>
      <label>
        Password
        <input
          required
          minLength="8"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
      </label>
      <label>
        Bootstrap key
        <input
          required
          type="password"
          value={form.key}
          onChange={(event) => setForm({ ...form, key: event.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary">Create administrator</button>
      <Link to="/login">Back to sign in</Link>
    </form>
  );
}
