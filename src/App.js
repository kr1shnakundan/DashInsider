import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Subscriptions from './pages/Subscriptions';
import Pricing from './pages/Pricing';
import Invoices from './pages/Invoices';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AdminAudit from './pages/AdminAudit';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <TopBar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin-audit" element={<AdminAudit />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;





//NOTE:Everycode in frontend is waste.Please do note use it.