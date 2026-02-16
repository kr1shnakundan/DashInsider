const invoices = [
  {
    id: 'INV-22041',
    account: 'Lumina Labs',
    amount: '$4,320',
    due: 'Feb 08, 2026',
    status: 'Past due'
  },
  {
    id: 'INV-22088',
    account: 'NovaStack',
    amount: '$6,480',
    due: 'Feb 17, 2026',
    status: 'Due soon'
  },
  {
    id: 'INV-22102',
    account: 'Brewline',
    amount: '$2,800',
    due: 'Feb 20, 2026',
    status: 'Scheduled'
  },
  {
    id: 'INV-22114',
    account: 'Orbitly',
    amount: '$1,540',
    due: 'Feb 28, 2026',
    status: 'Scheduled'
  }
];

function Invoices() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>Keep cashflow steady with smart reminders.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Send reminders</button>
          <button className="button primary">Create invoice</button>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Collection health</h3>
            <span className="muted">This month</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">On-time payments</div>
                <div className="muted">82% of invoices</div>
              </div>
              <span className="badge">Stable</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Average delay</div>
                <div className="muted">4.2 days</div>
              </div>
              <span className="badge warning">Needs focus</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Automation rules</h3>
            <span className="muted">Active</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">First reminder</div>
                <div className="muted">3 days before due date</div>
              </div>
              <span className="badge">Enabled</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Auto-downgrade</div>
                <div className="muted">14 days after due date</div>
              </div>
              <span className="badge subtle">Queued</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Invoice queue</h3>
          <span className="muted">4 invoices pending</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Due date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((item) => (
              <tr key={item.id}>
                <td className="strong">{item.id}</td>
                <td>{item.account}</td>
                <td>{item.amount}</td>
                <td>{item.due}</td>
                <td>
                  <span
                    className={
                      item.status === 'Past due'
                        ? 'badge warning'
                        : item.status === 'Due soon'
                        ? 'badge subtle'
                        : 'badge'
                    }
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Invoices;
