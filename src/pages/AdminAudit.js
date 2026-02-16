const auditRows = [
  {
    action: 'Pricing update approved',
    detail: 'Growth plan +10% for US West',
    actor: 'C. Morgan',
    time: 'Today 08:12'
  },
  {
    action: 'Downgrade job executed',
    detail: '12 accounts moved to Core',
    actor: 'System',
    time: 'Yesterday 19:40'
  },
  {
    action: 'Invoice reminder sent',
    detail: '91 invoices notified',
    actor: 'System',
    time: 'Mon 09:15'
  }
];

function AdminAudit() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Admin and Audit</h1>
          <p>Track pricing approvals and system actions.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Download log</button>
          <button className="button primary">New approval</button>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Pricing approvals</h3>
            <span className="muted">Finance view</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">Enterprise uplift</div>
                <div className="muted">Awaiting VP review</div>
              </div>
              <span className="badge warning">Pending</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Founder tier sunset</div>
                <div className="muted">Approved for March rollout</div>
              </div>
              <span className="badge">Approved</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>System policies</h3>
            <span className="muted">Active guardrails</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">Auto-downgrade</div>
                <div className="muted">14 days past due</div>
              </div>
              <span className="badge">Enabled</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Approval threshold</div>
                <div className="muted">ARR change &gt; 8%</div>
              </div>
              <span className="badge subtle">Watch</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Audit log</h3>
          <span className="muted">Last 72 hours</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Detail</th>
              <th>Actor</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {auditRows.map((row) => (
              <tr key={row.action}>
                <td className="strong">{row.action}</td>
                <td>{row.detail}</td>
                <td>{row.actor}</td>
                <td>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminAudit;
