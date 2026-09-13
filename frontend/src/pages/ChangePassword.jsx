import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.newPassword.length < 8 || form.newPassword !== form.confirmPassword) {
      setError('New passwords must match and contain at least 8 characters');
      return;
    }
    try {
      await api.put('/auth/change-password', form);
      updateUser({ ...user, mustChangePassword: false });
      navigate('/');
    } catch (requestError) {
      setError(
        requestError.response?.status === 401
          ? 'Current password is incorrect'
          : 'Unable to change password'
      );
    }
  }

  return (
    <form className="login-form centered-form" onSubmit={submit}>
      <p className="eyebrow">ACCOUNT SECURITY</p>
      <h2>Change password</h2>
      <label>
        Current password
        <input
          type="password"
          required
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
        />
      </label>
      <label>
        New password
        <input
          type="password"
          minLength="8"
          required
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          minLength="8"
          required
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary">Update password</button>
    </form>
  );
}
