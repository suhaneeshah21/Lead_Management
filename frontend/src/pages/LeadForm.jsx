import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const propertyTypes = ['1BHK', '2BHK', '3BHK', 'Plot', 'Villa', 'Commercial', 'Other'];
const sources = ['Facebook', 'Google', 'Referral', 'Walk-in', 'Website', 'Other'];
const initial = {
  name: '',
  phone: '',
  email: '',
  budget: '',
  location: '',
  propertyType: 'Other',
  source: 'Other',
  assignedAgent: '',
  followUpDate: '',
};

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api
      .get('/users/directory')
      .then((response) => setAgents(response.data.data.users))
      .catch(() => setError('Unable to load agents'));
    if (id)
      api
        .get(`/leads/${id}`)
        .then((response) => setForm({ ...initial, ...response.data.data.lead }))
        .catch(() => setError('Unable to load lead'));
  }, [id]);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const location = form.location.trim();

    if (!name) errors.name = 'Name is required';
    else if (name.length > 100) errors.name = 'Name must not exceed 100 characters';
    if (!phone) errors.phone = 'Phone is required';
    else if (phone.length > 20) errors.phone = 'Phone must not exceed 20 characters';
    else if (!/^[+\d][\d\s().-]*$/.test(phone) || phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Enter a valid phone number with at least 10 digits';
    }
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
    if (form.budget !== '' && (!Number.isFinite(Number(form.budget)) || Number(form.budget) < 0)) {
      errors.budget = 'Budget must be zero or greater';
    }
    if (!propertyTypes.includes(form.propertyType)) errors.propertyType = 'Select a valid property type';
    if (!sources.includes(form.source)) errors.source = 'Select a valid source';
    if (location.length > 200) errors.location = 'Location must not exceed 200 characters';
    if (id && form.followUpDate && Number.isNaN(new Date(form.followUpDate).getTime())) {
      errors.followUpDate = 'Enter a valid follow-up date';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please correct the highlighted fields');
      return;
    }

    const payload = {
      name,
      phone,
      email,
      budget: form.budget === '' ? undefined : Number(form.budget),
      location: location || undefined,
      propertyType: form.propertyType,
      source: form.source,
      ...(form.assignedAgent
        ? { assignedAgent: form.assignedAgent?._id || form.assignedAgent }
        : {}),
      ...(id && form.followUpDate ? { followUpDate: form.followUpDate } : {}),
    };

    setSaving(true);
    try {
      const response = id
        ? await api.put(`/leads/${id}`, payload)
        : await api.post('/leads', payload);
      navigate(`/leads/${response.data.data.lead._id || id}`);
    } catch (requestError) {
      const details =
        requestError.response?.data?.error?.details || requestError.response?.data?.errors;
      if (Array.isArray(details)) {
        setFieldErrors(
          details.reduce((result, item) => ({ ...result, [item.path || item.param]: item.msg }), {})
        );
      }
      setError(requestError.response?.data?.error?.message || 'Unable to save lead');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="panel lead-form" onSubmit={submit}>
      <p className="eyebrow">{id ? 'EDIT LEAD' : 'NEW RECORD'}</p>
      <h2>{id ? 'Edit lead' : 'Add lead'}</h2>
      {[
        ['name', 'Full name'],
        ['phone', 'Phone'],
        ['email', 'Email'],
        ['budget', 'Budget'],
        ['location', 'Location'],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            required={['name', 'phone', 'email'].includes(key)}
            value={form[key] || ''}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
          {fieldErrors[key] && <small className="field-error">{fieldErrors[key]}</small>}
        </label>
      ))}
      <label>
        Property type
        <select
          value={form.propertyType}
          onChange={(event) => setForm({ ...form, propertyType: event.target.value })}
        >
          {propertyTypes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
          {fieldErrors.propertyType && <small className="field-error">{fieldErrors.propertyType}</small>}
      </label>
      <label>
        Source
        <select
          value={form.source}
          onChange={(event) => setForm({ ...form, source: event.target.value })}
        >
          {sources.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
          {fieldErrors.source && <small className="field-error">{fieldErrors.source}</small>}
      </label>
      <label>
        Assigned agent
        <select
          value={form.assignedAgent?._id || form.assignedAgent || ''}
          onChange={(event) => setForm({ ...form, assignedAgent: event.target.value })}
        >
          <option value="">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} · {agent.email}
            </option>
          ))}
        </select>
      </label>
      {id && (
        <label>
          Follow-up date
          <input
            type="date"
            value={form.followUpDate ? form.followUpDate.slice(0, 10) : ''}
            onChange={(event) => setForm({ ...form, followUpDate: event.target.value })}
          />
          {fieldErrors.followUpDate && <small className="field-error">{fieldErrors.followUpDate}</small>}
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={saving}>
        {saving ? 'Saving...' : 'Save lead'}
      </button>
    </form>
  );
}
