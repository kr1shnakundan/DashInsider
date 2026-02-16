import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Customers', path: '/customers' },
  { label: 'Subscriptions', path: '/subscriptions' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Settings', path: '/settings' },
  { label: 'Admin and Audit', path: '/admin-audit' }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DI</div>
        <div>
          <div className="brand-title">DashInsider</div>
          <div className="brand-subtitle">Revenue control plane</div>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-label">Core</div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <span>{item.label}</span>
              <span className="nav-indicator" />
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <div className="footer-card">
          <div className="footer-title">Live ops</div>
          <div className="footer-text">3 automations running</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
