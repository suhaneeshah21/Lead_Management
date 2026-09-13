import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get(`/leads/${id}`)
      .then((response) => setLead(response.data.data.lead))
      .catch(() => setError('Unable to load lead'));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!lead) return <div className="loading">Loading lead...</div>;
  async function addNote(event) {
    event.preventDefault();
    const response = await api.post(`/leads/${id}/notes`, { content: note, createdBy: user.name });
    setLead(response.data.data.lead);
    setNote('');
  }
  async function changeStatus(event) {
    const response = await api.put(`/leads/${id}`, { status: event.target.value });
    setLead(response.data.data.lead);
  }
  async function remove() {
    if (window.confirm('Delete this lead?')) {
      await api.delete(`/leads/${id}`);
      navigate('/leads');
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <Link to="/leads">← Back to leads</Link>
          <h1>{lead.name}</h1>
          <p>
            {lead.email} · {lead.phone}
          </p>
        </div>
        <div className="head-actions">
          <Link className="button-link" to={`/leads/${id}/edit`}>
            Edit
          </Link>
          {user.role === 'admin' && <button onClick={remove}>Delete</button>}
          <StatusBadge status={lead.status} />
          <select value={lead.status} onChange={changeStatus}>
            {['New', 'Contacted', 'Site Visit', 'Closed'].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </header>
      <section className="panel lead-information">
        <h3>Lead information</h3>
        <div className="lead-information-grid">
          <InfoItem label="Budget" value={lead.budget ? `₹${lead.budget.toLocaleString()}` : 'Not specified'} />
          <InfoItem label="Property type" value={lead.propertyType || 'Not specified'} />
          <InfoItem label="Location" value={lead.location || 'Not specified'} />
          <InfoItem label="Source" value={lead.source || 'Not specified'} />
          <InfoItem
            label="Assigned agent"
            value={lead.assignedAgent?.name || 'Unassigned'}
          />
          <InfoItem
            label="Follow-up date"
            value={lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : 'Not scheduled'}
          />
        </div>
      </section>
      <section className="grid-two">
        <div className="panel">
          <h3>Notes</h3>
          <form onSubmit={addNote}>
            <textarea
              required
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note"
            />
            <button className="primary">Add note</button>
          </form>
          {lead.notes?.map((item) => (
            <div className="note" key={item._id}>
              <strong>{item.createdBy}</strong>
              <p>{item.content}</p>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Activity timeline</h3>
          {lead.activities?.map((activity, index) => (
            <div className="activity" key={`${activity.createdAt}-${index}`}>
              <b>{activity.action.replace('_', ' ')}</b>
              <span>
                {activity.detail} · {activity.performedBy}
              </span>
              <time dateTime={activity.createdAt}>
                {new Date(activity.createdAt).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="lead-information-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
