import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Leads() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [query, setQuery] = useState(params.get('search') || '');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get('/users/directory')
      .then((response) => setAgents(response.data.data.users))
      .catch(() => setError('Unable to load agents'));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => load(), 400);
    return () => clearTimeout(timer);
  }, [params]);
  async function load() {
    try {
      const response = await api.get('/leads', { params: Object.fromEntries(params) });
      setResult(response.data.data);
      setError('');
    } catch {
      setError('Unable to load leads');
    }
  }
  function updateFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  function toggleMine() {
    updateFilter('assignedAgent', params.get('assignedAgent') ? '' : user.id);
  }
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">LEAD MANAGEMENT</p>
          <h1>
            Leads <small>{result?.pagination?.total || 0}</small>
          </h1>
        </div>
        <div className="head-actions">
          <button className={params.get('assignedAgent') ? 'selected' : ''} onClick={toggleMine}>
            ⌁ My Leads
          </button>
          <Link className="primary button-link" to="/leads/new">
            ＋ Add lead
          </Link>
          <button onClick={() => setShowImport(true)}>⇧ Import CSV</button>
          <button onClick={() => exportCsv(params)}>⇩ Export CSV</button>
        </div>
      </header>
      <div className="toolbar">
        <input
          placeholder="Search name, phone or email"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            updateFilter('search', event.target.value);
          }}
        />
        <select
          value={params.get('status') || ''}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {['New', 'Contacted', 'Site Visit', 'Closed'].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="button" className="download-link" onClick={downloadTemplate}>
          Download template
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {!result ? (
        <div className="loading">Loading leads...</div>
      ) : (
        <>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Source</th>
                  {user.role === 'admin' && <th>Agent</th>}
                  <th>Follow-up</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.leads.map((lead) => (
                  <tr key={lead._id}>
                    <td>
                      <Link to={`/leads/${lead._id}`}>
                        <strong>{lead.name}</strong>
                      </Link>
                      <small>{lead.email}</small>
                    </td>
                    <td>{lead.phone}</td>
                    <td>{lead.source}</td>
                    {user.role === 'admin' && (
                      <td>{lead.assignedAgent?.name || 'Unassigned'}</td>
                    )}
                    <td>
                      {lead.followUpDate
                        ? new Date(lead.followUpDate).toLocaleDateString()
                        : 'None'}
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            pagination={result.pagination}
            onPage={(page) => updateFilter('page', page)}
          />
        </>
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          summary={summary}
          setSummary={setSummary}
          reload={load}
        />
      )}{' '}
    </>
  );
}
function Pagination({ pagination, onPage }) {
  return (
    <div className="pagination">
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
        ←
      </button>
      <span>
        Page {pagination.page} of {pagination.pages || 1}
      </span>
      <button
        disabled={pagination.page >= pagination.pages}
        onClick={() => onPage(pagination.page + 1)}
      >
        →
      </button>
    </div>
  );
}
function ImportModal({ onClose, summary, setSummary, reload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await api.post('/leads/import', form);
      setSummary(response.data.data);
      reload();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="overlay">
      <div className="modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <h2>Import leads</h2>
        <button type="button" className="download-link" onClick={downloadTemplate}>
          Download template
        </button>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files[0])}
        />
        <button className="primary" onClick={submit} disabled={!file || loading}>
          {loading ? 'Importing...' : 'Upload CSV'}
        </button>
        {summary && (
          <div className="errors">
            <strong>
              {summary.imported} imported, {summary.skipped} skipped
            </strong>
            {summary.errors.map((item) => (
              <p key={item.row}>
                Row {item.row}: {item.reason}
              </p>
            ))}
            {summary.warnings?.map((item) => (
              <p key={`warning-${item.row}`}>Warning: {item.reason}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
async function downloadTemplate() {
  const response = await api.get('/leads/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lead-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
async function exportCsv(params) {
  const response = await api.get('/leads/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leads.csv';
  link.click();
  URL.revokeObjectURL(url);
}
