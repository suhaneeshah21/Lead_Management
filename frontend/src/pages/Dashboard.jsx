import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const colors = ['#e06b4d', '#527b64', '#d4a24c', '#6f8290', '#9a6b58'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const params = user.role === 'agent' ? { assignedAgent: user.id } : undefined;
    api
      .get('/dashboard/stats', { params })
      .then((response) => setStats(response.data.data))
      .catch(() => setError('Unable to load dashboard'));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <div className="loading">Loading overview...</div>;
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">PORTFOLIO OVERVIEW</p>
          <h1>Good morning.</h1>
        </div>
        <span className="live">● LIVE DATA</span>
      </header>
      <StatsCards stats={stats} />
      <section className="followup-links">
        <Link to="/leads?followUp=overdue">
          <strong>{stats.overdueFollowUps}</strong>
          <span>Overdue follow-ups</span>
        </Link>
        <Link to="/leads?followUp=today">
          <strong>{stats.todayFollowUps}</strong>
          <span>Today's follow-ups</span>
        </Link>
      </section>
      <section className="grid-two">
        <Chart title="Lead momentum">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.leadsOverTime}>
              <CartesianGrid vertical={false} stroke="#e8e4dc" />
              <XAxis dataKey="_id" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#e06b4d" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Status distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                dataKey="count"
                nameKey="_id"
                innerRadius={55}
                outerRadius={90}
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={entry._id} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Chart>
      </section>
    </>
  );
}
export function StatsCards({ stats }) {
  return (
    <section className="metrics">
      <Metric label="Total leads" value={stats.total} />
      <Metric label="Conversion rate" value={`${stats.conversionRate}%`} />
      <Metric label="Contact rate" value={`${stats.contactRate}%`} />
      <Metric label="Pipeline value" value={`₹${(stats.totalPipeline / 10000000).toFixed(1)}Cr`} />
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Chart({ title, children }) {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}
