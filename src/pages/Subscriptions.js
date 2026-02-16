import { useMemo, useState } from 'react';

const tabs = ['Active', 'Past due', 'Paused'];

const subscriptions = [
  {
    name: 'NovaStack',
    plan: 'Growth',
    status: 'Active',
    renewal: 'Mar 18, 2026',
    mrr: '$12,800'
  },
  {
    name: 'Lumina Labs',
    plan: 'Enterprise',
    status: 'Past due',
    renewal: 'Feb 09, 2026',
    mrr: '$18,200'
  },
  {
    name: 'Brewline',
    plan: 'Core',
    status: 'Paused',
    renewal: 'Apr 01, 2026',
    mrr: '$9,600'
  },
  {
    name: 'Orbitly',
    plan: 'Core',
    status: 'Active',
    renewal: 'Mar 02, 2026',
    mrr: '$4,200'
  }
];

function Subscriptions() {
  const [tab, setTab] = useState('Active');

  const filtered = useMemo(
    () => subscriptions.filter((item) => item.status === tab),
    [tab]
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Monitor renewals and automated downgrades.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Sync billing</button>
          <button className="button primary">New plan</button>
        </div>
      </div>

      <div className="panel">
        <div className="segmented">
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? 'chip active' : 'chip'}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>{tab} subscriptions</h3>
          <span className="muted">{filtered.length} accounts</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Renewal</th>
              <th>MRR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.name}>
                <td className="strong">{item.name}</td>
                <td>{item.plan}</td>
                <td>
                  <span
                    className={
                      item.status === 'Past due'
                        ? 'badge warning'
                        : item.status === 'Paused'
                        ? 'badge subtle'
                        : 'badge'
                    }
                  >
                    {item.status}
                  </span>
                </td>
                <td>{item.renewal}</td>
                <td>{item.mrr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Subscriptions;
