import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './services/AuthContext';
import { wsService } from './services/websocket';
import { useEffect } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import TransactionsPage from './pages/TransactionsPage';
import DebtsPage from './pages/DebtsPage';
import GoalsPage from './pages/GoalsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIPage from './pages/AIPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      wsService.connect();
      return () => wsService.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai" element={<AIPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
