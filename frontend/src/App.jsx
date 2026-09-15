import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LeadDetail from './pages/LeadDetail';
import LeadForm from './pages/LeadForm';
import Leads from './pages/Leads';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Users from './pages/Users';
import AgentDetail from './pages/AgentDetail';
import Bootstrap from './pages/Bootstrap';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          NEST<span>/CRM</span>
        </div>
        <nav>
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/leads">Leads</NavLink>
          {user.role === 'admin' && <NavLink to="/users">Team</NavLink>}
        </nav>
        <button className="logout" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/bootstrap" element={<Bootstrap />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/new" element={<LeadForm />} />
          <Route path="/leads/:id/edit" element={<LeadForm />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/users" element={<Users />} />
            <Route path="/users/:id" element={<AgentDetail />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
