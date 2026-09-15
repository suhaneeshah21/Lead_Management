import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { StatsCards } from './Dashboard';
import Leads from './Leads';

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/users').then((response) => response.data.data.users.find((user) => user.id === id)),
      api
        .get('/dashboard/stats', { params: { assignedAgent: id } })
        .then((response) => response.data.data),
    ])
      .then(([nextAgent, nextStats]) => {
        if (!nextAgent) throw new Error('Agent not found');
        setAgent(nextAgent);
        setStats(nextStats);
      })
      .catch(() => setError('Unable to load agent details'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!agent || !stats) return <div className="loading">Loading agent details...</div>;

  return (
    <>
      <header className="page-head">
        <div>
          <Link to="/users">Team directory</Link>
          <p className="eyebrow">AGENT PROFILE</p>
          <h1>{agent.name}</h1>
        </div>
      </header>
      <section className="panel lead-information">
        <div className="lead-information-grid">
          <div className="lead-information-item">
            <span>Email</span>
            <strong>{agent.email}</strong>
          </div>
          <div className="lead-information-item">
            <span>Role</span>
            <strong>{agent.role}</strong>
          </div>
          <div className="lead-information-item">
            <span>Status</span>
            <strong>{agent.isActive ? 'Active' : 'Inactive'}</strong>
          </div>
        </div>
      </section>
      <StatsCards stats={stats} />
      <Leads fixedAssignedAgent={id} allowImport={false} />
    </>
  );
}
