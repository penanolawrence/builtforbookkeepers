// src/components/landing/ReviewQueueMockup.tsx
export function ReviewQueueMockup() {
  return (
    <div className="ld-mockup" aria-hidden="true">

      {/* Browser chrome */}
      <div className="ld-mockup__chrome">
        <div className="ld-mockup__traffic">
          <span className="ld-mockup__dot ld-mockup__dot--red" />
          <span className="ld-mockup__dot ld-mockup__dot--yellow" />
          <span className="ld-mockup__dot ld-mockup__dot--green" />
        </div>
        <div className="ld-mockup__url">builtforbookkeepers.vercel.app/queue</div>
      </div>

      {/* App nav strip */}
      <div className="ld-mockup__appnav">
        <span className="ld-mockup__appnav-brand">🐾 Built for Bookkeepers</span>
        <div className="ld-mockup__appnav-links">
          <span>Dashboard</span>
          <span className="ld-mockup__appnav-active">
            Queue <span className="ld-mockup__badge">8</span>
          </span>
          <span>Adj. Entries</span>
          <span>My Clients</span>
        </div>
        <div className="ld-mockup__appnav-pills">
          <span className="ld-mockup__pill ld-mockup__pill--active">Sofia</span>
          <span className="ld-mockup__pill">Yoda</span>
        </div>
      </div>

      {/* Page content */}
      <div className="ld-mockup__content">
        <p className="ld-mockup__page-title">Review Queue</p>
        <p className="ld-mockup__page-sub">8 documents awaiting your approval</p>

        {/* Stat cards */}
        <div className="ld-mockup__stats">
          <div className="ld-mockup__stat">
            <span className="ld-mockup__stat-val">8</span>
            <span className="ld-mockup__stat-lbl">Total Items</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--red">
            <span className="ld-mockup__stat-val">2</span>
            <span className="ld-mockup__stat-lbl">Red Flags</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--yellow">
            <span className="ld-mockup__stat-val">2</span>
            <span className="ld-mockup__stat-lbl">Yellow Flags</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--green">
            <span className="ld-mockup__stat-val">4</span>
            <span className="ld-mockup__stat-lbl">Green / Ready</span>
          </div>
        </div>

        {/* Filter row */}
        <div className="ld-mockup__filters">
          <span className="ld-mockup__filter-pill">All Clients ▾</span>
          <span className="ld-mockup__filter-pill">All Flags ▾</span>
          <span className="ld-mockup__approve-btn">Approve Selected (4)</span>
        </div>

        {/* Transaction rows */}
        <div className="ld-mockup__table">
          <div className="ld-mockup__row ld-mockup__row--red">
            <span className="ld-mockup__flag ld-mockup__flag--red">⚠ RED</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type ld-mockup__type--income">Income</span>
            <span className="ld-mockup__amount">₱18,450.00</span>
            <span className="ld-mockup__date">May 20</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--red">
            <span className="ld-mockup__flag ld-mockup__flag--red">⚠ RED</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱809.00</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--yellow">
            <span className="ld-mockup__flag ld-mockup__flag--yellow">• YEL</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱150.00</span>
            <span className="ld-mockup__date">Jun 9</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--green">
            <span className="ld-mockup__flag ld-mockup__flag--green">✓ GRN</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱137.76</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--green">
            <span className="ld-mockup__flag ld-mockup__flag--green">✓ GRN</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱1,096.48</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
        </div>
      </div>

      {/* Floating chip */}
      <div className="ld-mockup__chip">
        <strong>4×</strong> BIR books<br />in one click
      </div>
    </div>
  )
}
