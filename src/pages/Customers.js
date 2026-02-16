import { useMemo, useState } from 'react';

const segments = ['All', 'Scale-ups', 'Mid-market', 'Early-stage'];

const customers = [
  {
    name: 'Lumina Labs',
    segment: 'Scale-ups',
    mrr: '$18,200',
    status: 'Expansion',
    owner: 'A. Lewis'
  },
  {
    name: 'Brewline',
    segment: 'Mid-market',
    mrr: '$9,600',
    status: 'Watch',
    owner: 'K. Chen'
  },
  {
    name: 'NovaStack',
    segment: 'Scale-ups',
    mrr: '$24,400',
    status: 'Healthy',
    owner: 'M. Patel'
  },
  {
    name: 'Orbitly',
    segment: 'Early-stage',
    mrr: '$4,200',
    status: 'Nurture',
    owner: 'S. Duarte'
  },
  {
    name: 'Driftwood',
    segment: 'Mid-market',
    mrr: '$12,800',
    status: 'At risk',
    owner: 'P. Singh'
  }
];

function Customers() {
  const [segment, setSegment] = useState('All');

  const filtered = useMemo(() => {
    if (segment === 'All') {
      return customers;
    }
    return customers.filter((item) => item.segment === segment);
  }, [segment]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Prioritize accounts by revenue impact and churn risk.</p>
        </div>
        <div className="page-actions">
          <button className="button ghost">Import list</button>
          <button className="button primary">New account</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Segments</h3>
          <span className="muted">Filter by cohort</span>
        </div>
        <div className="segmented">
          {segments.map((item) => (
            <button
              key={item}
              className={segment === item ? 'chip active' : 'chip'}
              onClick={() => setSegment(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Account list</h3>
          <span className="muted">5 high priority accounts</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Segment</th>
              <th>MRR</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.name}>
                <td className="strong">{item.name}</td>
                <td>{item.segment}</td>
                <td>{item.mrr}</td>
                <td>
                  <span className="badge">{item.status}</span>
                </td>
                <td>{item.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Customers;
