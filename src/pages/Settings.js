const settings = [
  {
    title: 'Team roles',
    detail: '12 seats, 3 finance approvers, 2 admins'
  },
  {
    title: 'Billing integrations',
    detail: 'Stripe and Razorpay connected'
  },
  {
    title: 'Risk thresholds',
    detail: 'Alert when churn risk exceeds 12%'
  }
];

function Settings() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Govern access, integrations, and pricing guardrails.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Manage roles</button>
          <button className="button primary">Save updates</button>
        </div>
      </div>

      <div className="grid two-col">
        {settings.map((item) => (
          <div key={item.title} className="panel">
            <div className="panel-header">
              <h3>{item.title}</h3>
              <span className="muted">Active</span>
            </div>
            <p className="muted">{item.detail}</p>
            <button className="button ghost">Configure</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Security checklist</h3>
          <span className="muted">Review quarterly</span>
        </div>
        <div className="stack-list">
          <div className="stack-row">
            <div>
              <div className="strong">2FA enabled</div>
              <div className="muted">100% of admins</div>
            </div>
            <span className="badge">Complete</span>
          </div>
          <div className="stack-row">
            <div>
              <div className="strong">Audit log retention</div>
              <div className="muted">180 days retained</div>
            </div>
            <span className="badge subtle">Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
