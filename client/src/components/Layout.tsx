import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◈' },
  { path: '/accounts', label: 'Cuentas', icon: '◉' },
  { path: '/transactions', label: 'Movimientos', icon: '↻' },
  { path: '/debts', label: 'Deudas', icon: '⊘' },
  { path: '/goals', label: 'Metas', icon: '★' },
  { path: '/analytics', label: 'Analítica', icon: '▤' },
  { path: '/ai', label: 'IA Asistente', icon: '✦' },
  { path: '/settings', label: 'Ajustes', icon: '⚙' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const pageTitles: Record<string, [string, string]> = {
    '/': ['Dashboard', 'Resumen financiero'],
    '/accounts': ['Cuentas', 'Gestiona tus cuentas'],
    '/transactions': ['Movimientos', 'Ingresos y egresos'],
    '/debts': ['Deudas', 'Control de deudas'],
    '/goals': ['Metas', 'Objetivos financieros'],
    '/analytics': ['Analítica', 'Estadísticas y reportes'],
    '/ai': ['Asistente IA', 'Análisis inteligente'],
    '/settings': ['Ajustes', 'Configuración'],
  };

  const [title, subtitle] = pageTitles[location.pathname] || ['Financia', ''];

  return (
    <div id="app">
      <div id="sidebarOverlay" className={sidebarOpen ? 'open' : ''} onClick={() => setSidebarOpen(false)} />
      <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="sidebar-header">
          <div className="logo">F</div>
          <span>Financia</span>
        </div>
        <nav id="nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-level" style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="level-icon">U</div>
            <div className="level-info">
              <div className="level-name">{user?.name || 'Usuario'}</div>
              <div className="level-xp">{user?.email || ''}</div>
            </div>
            <button
              onClick={logout}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 14, padding: 4,
              }}
              title="Cerrar sesión"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>
      <main id="main">
        <header id="header">
          <div className="header-left">
            <h1 id="pageTitle">{title}</h1>
            <p id="pageSubtitle">{subtitle}</p>
          </div>
          <div className="header-right">
            <button id="mobileMenuBtn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menú">☰</button>
          </div>
        </header>
        <div id="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
