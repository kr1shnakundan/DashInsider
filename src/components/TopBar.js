function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="pulse-dot" />
        <div>
          <div className="topbar-title">Command Center</div>
          <div className="topbar-subtitle">Tuesday, 16 Feb 2026</div>
        </div>
      </div>
      <div className="topbar-actions">
        <input
          className="search"
          placeholder="Search customers, plans, invoices"
          aria-label="Search"
        />
        <button className="button ghost">Export</button>
        <button className="button primary">Launch update</button>
      </div>
    </div>
  );
}

export default TopBar;
