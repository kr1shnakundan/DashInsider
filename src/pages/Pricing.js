import { useState } from 'react';

const plans = [
  {
    name: 'Core',
    monthly: 39,
    annual: 36,
    description: 'Best for early teams testing pricing elasticity.'
  },
  {
    name: 'Growth',
    monthly: 79,
    annual: 72,
    description: 'Scale-ups running multi-step expansion plays.'
  },
  {
    name: 'Enterprise',
    monthly: 0,
    annual: 0,
    description: 'Custom pricing with finance review and SOC support.'
  }
];

function Pricing() {
  const [billing, setBilling] = useState('Monthly');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Pricing</h1>
          <p>Run experiments without losing revenue clarity.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Preview changes</button>
          <button className="button primary">Publish update</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Billing cadence</h3>
          <span className="muted">Annual plans include 2 months free</span>
        </div>
        <div className="segmented">
          {['Monthly', 'Annual'].map((item) => (
            <button
              key={item}
              className={billing === item ? 'chip active' : 'chip'}
              onClick={() => setBilling(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid three-col">
        {plans.map((plan) => {
          const price = billing === 'Annual' ? plan.annual : plan.monthly;
          return (
            <div
              key={plan.name}
              className={`panel plan-card ${
                plan.name === 'Growth' ? 'plan-featured' : ''
              }`.trim()}
            >
              <div className="plan-header">
                <div className="plan-title">{plan.name}</div>
                <div className="plan-price">
                  {price ? `$${price}` : 'Custom'}
                  {price ? <span>/mo</span> : null}
                </div>
              </div>
              <div className="plan-desc">{plan.description}</div>
              <ul className="plan-list">
                <li>Experiment tracking</li>
                <li>Cohort monitoring</li>
                <li>Invoice automation</li>
              </ul>
              <button className="button ghost full">Edit plan</button>
            </div>
          );
        })}
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-header">
            <h3>Recent pricing tests</h3>
            <span className="muted">3 active tests</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">Growth +10%</div>
                <div className="muted">US West - 120 accounts</div>
              </div>
              <span className="badge">Running</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Core onboarding discount</div>
                <div className="muted">New trials - 14 days</div>
              </div>
              <span className="badge subtle">Ends Feb 28</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Approval queue</h3>
            <span className="muted">Finance review</span>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <div className="strong">Enterprise uplift</div>
                <div className="muted">$120k to $135k ARR</div>
              </div>
              <span className="badge warning">Pending</span>
            </div>
            <div className="stack-row">
              <div>
                <div className="strong">Founder tier</div>
                <div className="muted">Sunset plan in March</div>
              </div>
              <span className="badge">Approved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
