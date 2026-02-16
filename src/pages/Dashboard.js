import StatCard from '../components/StatCard';

const kpis = [
  {
    title: 'Month to date revenue',
    value: '$842,120',
    trend: '+14% MoM',
    detail: 'Net expansion $96,400',
    accent: 'accent-1'
  },
  {
    title: 'Active subscriptions',
    value: '38,412',
    trend: '+1,240',
    detail: 'Upgrades in last 7 days',
    accent: 'accent-2'
  },
  {
    title: 'Churn risk alerts',
    value: '312',
    trend: '-9%',
    detail: 'Watchlist refresh 2 hours ago',
    accent: 'accent-3'
  },
  {
    title: 'Forecast accuracy',
    value: '92%',
    trend: '+3%',
    detail: 'Based on cohort momentum',
    accent: 'accent-4'
  }
];

const signals = [
  {
    title: 'Trial to paid conversion',
    value: '26.4%',
    note: 'Up in scale-up segment'
  },
  {
    title: 'Expansion pipeline',
    value: '$182k',
    note: '46 accounts flagged'
  },
  {
    title: 'Invoice exposure',
    value: '$118k',
    note: '91 invoices pending'
  }
];

const activity = [
  {
    label: 'Pricing test launched',
    detail: 'Growth plan +10% for US West',
    time: '2 hours ago'
  },
  {
    label: 'Cohort migration',
    detail: '218 accounts moved to annual',
    time: 'Yesterday'
  },
  {
    label: 'Winback automation',
    detail: '42 churned accounts re-engaged',
    time: 'Mon 8:40 AM'
  }
];

function Dashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Single view of pricing, churn, and revenue health.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">View cohorts</button>
          <button className="button primary">Create report</button>
        </div>
      </div>

      <div className="grid kpi-grid">
        {kpis.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Revenue trajectory</h3>
            <span className="muted">Last 8 weeks</span>
          </div>
          <div className="chart-bars">
            <div style={{ height: '44%' }} />
            <div style={{ height: '52%' }} />
            <div style={{ height: '58%' }} />
            <div style={{ height: '62%' }} />
            <div style={{ height: '70%' }} />
            <div style={{ height: '76%' }} />
            <div style={{ height: '82%' }} />
            <div style={{ height: '90%' }} />
          </div>
          <div className="chart-footer">
            <span>$3.48M projected Q2 revenue</span>
            <span>Drivers: upgrades, price changes, winback</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Signal watchlist</h3>
            <span className="muted">Auto-refresh on</span>
          </div>
          <div className="signal-list">
            {signals.map((item) => (
              <div key={item.title} className="signal-card">
                <div className="signal-title">{item.title}</div>
                <div className="signal-value">{item.value}</div>
                <div className="signal-note">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid three-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Automation status</h3>
            <span className="muted">Last 24 hours</span>
          </div>
          <div className="pill-row">
            <span className="pill">Upgrade nudges: 128</span>
            <span className="pill">Auto-downgrade: 12</span>
            <span className="pill">Trial nurture: 92</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming invoices</h3>
            <span className="muted">Next 7 days</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">NovaStack</div>
                <div className="muted">$6,480 due tomorrow</div>
              </div>
              <span className="badge warning">At risk</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Lumina Labs</div>
                <div className="muted">$4,320 due in 4 days</div>
              </div>
              <span className="badge">Scheduled</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Recent activity</h3>
            <span className="muted">Team updates</span>
          </div>
          <div className="stack-list">
            {activity.map((item) => (
              <div key={item.label} className="stack-row">
                <div>
                  <div className="strong">{item.label}</div>
                  <div className="muted">{item.detail}</div>
                </div>
                <span className="badge subtle">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
