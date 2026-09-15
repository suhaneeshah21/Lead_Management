import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  function load() {
    api
      .get('/users')
      .then((response) => setUsers(response.data.data.users))
      .catch(() => setError('Unable to load users'));
  }
  useEffect(load, []);
  async function create(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    const errors = {};
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) errors.name = 'Name is required';
    else if (name.length < 2 || name.length > 100) errors.name = 'Name must be 2-100 characters';
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!['admin', 'agent'].includes(form.role)) errors.role = 'Select a valid role';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError('Please correct the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', { ...form, name, email });
      setForm({ name: '', email: '', password: '', role: 'agent' });
      load();
    } catch (requestError) {
      const details =
        requestError.response?.data?.error?.details || requestError.response?.data?.errors;
      if (Array.isArray(details)) {
        setFieldErrors(
          details.reduce((result, item) => ({ ...result, [item.path || item.param]: item.msg }), {})
        );
      }
      setError(requestError.response?.data?.error?.message || 'Unable to create user');
    } finally {
      setSaving(false);
    }
  }
  async function toggle(user) {
    await api.put(`/users/${user.id}`, { isActive: !user.isActive });
    load();
  }
  async function reset(user) {
    const temporaryPassword = window.prompt('Temporary password (8+ characters)');
    if (temporaryPassword) {
      await api.post(`/users/${user.id}/reset-password`, { temporaryPassword });
    }
  }
  async function remove(user) {
    if (window.confirm(`Delete ${user.name}?`)) {
      await api.delete(`/users/${user.id}`);
      load();
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Team directory</h1>
        </div>
      </header>
      <form className="toolbar" onSubmit={create}>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
        <input
          required
          minLength="8"
          placeholder="Temporary password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        {fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}
        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
        {fieldErrors.role && <small className="field-error">{fieldErrors.role}</small>}
        <button className="primary" disabled={saving}>
          {saving ? 'Adding...' : 'Add user'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.role === 'agent' ? (
                    <Link to={`/users/${user.id}?assignedAgent=${user.id}`}>{user.name}</Link>
                  ) : (
                    user.name
                  )}
                </td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    disabled={user.id === currentUser.id}
                    title={
                      user.id === currentUser.id ? 'You cannot change your own role' : undefined
                    }
                    onChange={(event) =>
                      api.put(`/users/${user.id}`, { role: event.target.value }).then(load)
                    }
                  >
                    <option>agent</option>
                    <option>admin</option>
                  </select>
                </td>
                <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <button onClick={() => toggle(user)}>Toggle</button>
                  <button onClick={() => reset(user)}>Reset</button>
                  <button onClick={() => remove(user)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
