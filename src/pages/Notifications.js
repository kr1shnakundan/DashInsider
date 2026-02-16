import { useMemo, useState } from 'react';

const tabs = ['Draft', 'Scheduled', 'Sent'];

const messages = [
  {
    title: 'Upgrade nudge',
    status: 'Scheduled',
    detail: '128 accounts - sends tomorrow at 09:00'
  },
  {
    title: 'Cohort sunset notice',
    status: 'Draft',
    detail: 'Review legal copy before scheduling'
  },
  {
    title: 'Price change email',
    status: 'Sent',
    detail: 'Open rate 54% - click rate 12%'
  },
  {
    title: 'Winback offer',
    status: 'Scheduled',
    detail: 'Targeting 42 churned accounts'
  }
];

function Notifications() {
  const [tab, setTab] = useState('Scheduled');

  const filtered = useMemo(
    () => messages.filter((item) => item.status === tab),
    [tab]
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Orchestrate lifecycle messaging with context.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Templates</button>
          <button className="button primary">New campaign</button>
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

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>{tab} messages</h3>
            <span className="muted">{filtered.length} campaigns</span>
          </div>
          <div className="stack-list">
            {filtered.map((item) => (
              <div key={item.title} className="stack-row">
                <div>
                  <div className="strong">{item.title}</div>
                  <div className="muted">{item.detail}</div>
                </div>
                <span className="badge">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Automation health</h3>
            <span className="muted">Last 7 days</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">Trigger success</div>
                <div className="muted">98% delivery</div>
              </div>
              <span className="badge">Healthy</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Opt-out rate</div>
                <div className="muted">0.4% average</div>
              </div>
              <span className="badge subtle">Stable</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Inbox warmup</div>
                <div className="muted">Domain score 87</div>
              </div>
              <span className="badge">On track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
