function StatCard({ title, value, trend, detail, accent }) {
  return (
    <div className={`panel stat-card ${accent || ''}`.trim()}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <span className="stat-trend">{trend}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

export default StatCard;
