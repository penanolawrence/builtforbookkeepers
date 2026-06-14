import s from './help.module.css'
import { HelpSidebarNav } from '@/components/help/HelpSidebarNav'

export const metadata = { title: 'How the System Works — Sofia Books' }

export default function HelpPage() {
  return (
    <div className={s.page}>
      <div className="hiw-shell">
        <HelpSidebarNav />

        <main className="hiw-main">

          {/* PAGE HEADER */}
          <div className="hiw-header">
            <div className="hiw-badge"><span className="hiw-badge-pip" />Bookkeeper&apos;s Guide</div>
            <h1>How <span className="acc">Sofia Books</span> Works,<br />Step by Step</h1>
            <p className="hiw-sub">A complete walkthrough for the bookkeeping team — from the moment a client uploads a receipt to the final BIR books.</p>
            <div className="hiw-meta">
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                June 2026
              </span>
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Bookkeeping Team
              </span>
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ~10 min read
              </span>
            </div>
          </div>

          {/* S1: WHO DOES WHAT */}
          <div className="section" id="overview">
            <div className="eyebrow"><span className="pip" />Section 1</div>
            <h2>Who Does What</h2>
            <p className="section-lead">The system has two types of users. Each sees a different part of the system based on their role.</p>
            <div className="role-grid">
              <div className="role-card rc-you">
                <div className="role-tag rt-you">You</div>
                <h3>Accountant</h3>
                <ul className="role-list">
                  <li><span className="dot" />Reviews transactions for assigned clients</li>
                  <li><span className="dot" />Approves, returns, or rejects documents</li>
                  <li><span className="dot" />Creates and submits adjusting entries</li>
                  <li><span className="dot" />Adds and manages clients</li>
                  <li><span className="dot" />Manages billing and account access</li>
                </ul>
              </div>
              <div className="role-card rc-client">
                <div className="role-tag rt-client">The Business Owner</div>
                <h3>Client</h3>
                <ul className="role-list">
                  <li><span className="dot" />Uploads receipts and documents</li>
                  <li><span className="dot" />Re-uploads returned documents</li>
                  <li><span className="dot" />Views their own reports</li>
                  <li><span className="dot" />Cannot touch posted entries</li>
                </ul>
              </div>
            </div>
          </div>

          {/* S2: TRANSACTION FLOW */}
          <div className="section" id="transaction">
            <div className="eyebrow"><span className="pip" />Section 2</div>
            <h2>How a Transaction Enters the Books</h2>
            <p className="section-lead">Every transaction follows the same path before it gets posted. Nothing reaches the books without a bookkeeper&apos;s approval.</p>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-num">1</div>
                <div className="tl-body">
                  <h3>A Receipt is Uploaded</h3>
                  <p>Either the client or the accountant can upload a receipt — both paths work the same way.</p>
                  <div className="tl-sub"><ul>
                    <li><strong>Client uploads</strong> — The client logs in and uploads a photo of their receipt, OR number, GCash screenshot, or any document. They indicate Income or Expenses.</li>
                    <li><strong>Accountant uploads on behalf of client</strong> — Open the client&apos;s account and upload directly. Useful when documents arrive via Viber, email, or in person.</li>
                    <li><strong>No receipt?</strong> — Either party can use <strong>&quot;No Receipt / Manual Entry&quot;</strong> and fill in details manually.</li>
                  </ul></div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-num">2</div>
                <div className="tl-body">
                  <h3>System Reads the Receipt Automatically</h3>
                  <p>The system scans the image and extracts key details — no manual typing required.</p>
                  <div className="tl-sub"><ul>
                    <li>Merchant name</li>
                    <li>Date of transaction</li>
                    <li>Total amount and VAT</li>
                    <li>Official Receipt (OR) number</li>
                    <li>Seller&apos;s TIN</li>
                  </ul></div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-num">3</div>
                <div className="tl-body">
                  <h3>System Checks for Problems</h3>
                  <p>Automatic checks run and a <strong>Green, Yellow, or Red flag</strong> is assigned (see Section 3).</p>
                  <div className="tl-sub"><ul>
                    <li>Is the amount unusually large compared to this client&apos;s normal spending?</li>
                    <li>Did the client file it under the wrong area (e.g., expense filed as income)?</li>
                    <li>Has this exact receipt been uploaded before?</li>
                    <li>Does the VAT amount add up correctly?</li>
                    <li>Is the vendor new? Is the date in a previous month?</li>
                  </ul></div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-num">4</div>
                <div className="tl-body">
                  <h3>Transaction Waits in the Approval Queue</h3>
                  <p>Every transaction lands in the <strong>Approval Queue</strong> with status <em>Parked</em>. Nothing posts to the books until you review it.</p>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-num">5</div>
                <div className="tl-body">
                  <h3>Bookkeeper Reviews and Decides</h3>
                  <p>Open the item, check the receipt image against the extracted details, and choose what to do. See Section 4 for the full approval workflow.</p>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-num">6</div>
                <div className="tl-body">
                  <h3>Journal Entry is Posted</h3>
                  <p>Once approved, the system creates and posts the journal entry to the General Ledger. Balances update in real time. For VAT-registered clients, the system splits VAT automatically (12/112 of the gross amount).</p>
                </div>
              </div>
            </div>
          </div>

          {/* S3: FLAG COLORS */}
          <div className="section" id="flags">
            <div className="eyebrow"><span className="pip" />Section 3</div>
            <h2>Understanding the Flag Colors</h2>
            <p className="section-lead">Every transaction in the Approval Queue has a color that tells you how much attention it needs.</p>
            <div className="flag-grid">
              <div className="flag-card fg">
                <div className="flag-top">
                  <div className="flag-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="flag-name">Green</div>
                </div>
                <div className="flag-body">The system is confident everything is correct. No issues found. These items can be batch-approved all at once.</div>
              </div>
              <div className="flag-card fy">
                <div className="flag-top">
                  <div className="flag-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                  <div className="flag-name">Yellow</div>
                </div>
                <div className="flag-body">The system is uncertain. Needs individual review. Common reasons: receipt unreadable, no receipt attached, or a field is unclear.</div>
              </div>
              <div className="flag-card fr">
                <div className="flag-top">
                  <div className="flag-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                  <div className="flag-name">Red</div>
                </div>
                <div className="flag-body">A specific problem was detected. Must be reviewed before posting. Examples: duplicate receipt, VAT mismatch, amount 3× larger than usual.</div>
              </div>
            </div>
            <div className="callout">
              <strong>Batch Approval Shortcut:</strong> Green items are pre-selected in the queue. Untick anything you want to examine individually, then click <strong>&quot;Approve All Selected&quot;</strong>. Yellow and Red items always require individual decision.
            </div>
          </div>

          {/* S4: APPROVAL QUEUE */}
          <div className="section" id="approval">
            <div className="eyebrow"><span className="pip" />Section 4</div>
            <h2>The Approval Queue</h2>
            <p className="section-lead">When you open an item in the queue, you see the receipt image on the left and all extracted details on the right (editable). You then choose one of four actions.</p>
            <div className="action-grid">
              <div className="action-card a-approve">
                <div className="action-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Approve</div>
                <h3>Post it as-is</h3>
                <p>The transaction is posted to the General Ledger exactly as it appears. The item leaves the queue. No notification is sent to the client.</p>
              </div>
              <div className="action-card a-edit">
                <div className="action-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit + Approve</div>
                <h3>Correct then post</h3>
                <p>Fix one or more fields, then approve. The corrected version is posted. The original reading is kept on record for the audit trail.</p>
              </div>
              <div className="action-card a-return">
                <div className="action-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Return</div>
                <h3>Send back to client</h3>
                <p>Write a note explaining what is wrong (required). Client is notified the next morning and has <strong>30 days</strong> to re-upload. No action = auto-rejected.</p>
              </div>
              <div className="action-card a-reject">
                <div className="action-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject</div>
                <h3>Exclude permanently</h3>
                <p>Enter a reason (required). The transaction is excluded permanently. Client is notified but cannot override — they must contact you directly.</p>
              </div>
            </div>

            <p className="subhead" style={{ marginTop: 32 }}>Special Cases in the Queue</p>
            <table className="dtable">
              <thead><tr><th>Tag in Queue</th><th>What it means</th><th>What you do</th></tr></thead>
              <tbody>
                <tr><td>No Receipt</td><td>Client logged a transaction without any document</td><td>Review manually; verify with client if needed</td></tr>
                <tr><td>Upload Area Mismatch</td><td>Client filed as Income but system thinks it&apos;s an Expense (or vice versa)</td><td>Check the receipt and correct the type before approving</td></tr>
                <tr><td>Duplicate Receipt</td><td>The same receipt was uploaded before</td><td>Check if truly duplicate or a re-upload of a returned document</td></tr>
              </tbody>
            </table>

            <p className="subhead">What Happens When You Return a Document</p>
            <div className="timeline">
              <div className="tl-item sm-item"><div className="tl-num sm">A</div><div className="tl-body"><h3>Client is notified the next morning</h3><p>They see a &quot;Returned Documents&quot; section with your note and the original image.</p></div></div>
              <div className="tl-item sm-item"><div className="tl-num sm">B</div><div className="tl-body"><h3>Client uploads a corrected version</h3><p>The new file goes through the full automatic process before re-entering your queue.</p></div></div>
              <div className="tl-item sm-item"><div className="tl-num sm">C</div><div className="tl-body"><h3>If no action after 30 days</h3><p>The system auto-rejects and notifies the client. No action needed from you.</p></div></div>
            </div>
          </div>

          {/* S5: CORRECTIONS */}
          <div className="section" id="corrections">
            <div className="eyebrow"><span className="pip" />Section 5</div>
            <h2>Correcting a Posted Transaction</h2>
            <p className="section-lead">Once posted, a transaction cannot be deleted. Corrections are made the proper bookkeeping way — by posting a correcting entry on top of it.</p>
            <p className="subhead">Adjusting Entry — for corrections, reclassifications, or any adjustment</p>
            <div className="timeline">
              <div className="tl-item"><div className="tl-num">1</div><div className="tl-body"><h3>Accountant creates the entry</h3><p>Go to <strong>Adjusting Entries → New Entry</strong>. Fill in debit and credit lines and write a memo. The system won&apos;t submit unless debits and credits balance.</p></div></div>
              <div className="tl-item"><div className="tl-num">2</div><div className="tl-body"><h3>Entry is reviewed and approved</h3><p>Goes through an approval step before posting. Once approved, recorded immediately to the General Ledger. If rejected, you can revise and resubmit.</p></div></div>
              <div className="tl-item"><div className="tl-num">3</div><div className="tl-body"><h3>Posted permanently to the ledger</h3><p>Appears in the client&apos;s reports like any other transaction. The audit trail records who created it, who approved it, and the memo.</p></div></div>
            </div>
            <p className="subhead">Reversal Entry — for completely undoing a posted transaction</p>
            <p style={{ color: 'var(--hiw-muted)', fontSize: 14, marginBottom: 14 }}>Use this when a transaction was posted with entirely wrong details and needs to be cancelled before a correct one is entered.</p>
            <table className="dtable">
              <thead><tr><th>Step</th><th>What happens</th></tr></thead>
              <tbody>
                <tr><td>1. Create Reversal</td><td>Open the wrong posted transaction → click &quot;Create Reversal Entry.&quot; The system auto-generates the exact opposite entry.</td></tr>
                <tr><td>2. Approve Reversal</td><td>Goes through the same adjusting entry approval process before posting.</td></tr>
                <tr><td>3. Post Correction</td><td>Create a new correct entry from scratch — also goes through approval.</td></tr>
                <tr><td>Result</td><td>Three entries on the ledger permanently: the original, the reversal, and the correct entry. This is intentional — it maintains a full audit trail.</td></tr>
              </tbody>
            </table>
          </div>

          {/* S6: BIR REPORTS */}
          <div className="section" id="reports">
            <div className="eyebrow"><span className="pip" />Section 6</div>
            <h2>BIR Books and Reports</h2>
            <p className="section-lead">Once transactions are posted, the system generates everything automatically. No manual preparation needed.</p>
            <table className="dtable">
              <thead><tr><th>Book / Report</th><th>What it contains</th></tr></thead>
              <tbody>
                <tr><td>Cash Receipts Book (CRB)</td><td>All incoming cash and payment transactions (income entries)</td></tr>
                <tr><td>Cash Disbursements Book (CDB)</td><td>All outgoing payments and expenses</td></tr>
                <tr><td>General Journal (GJ)</td><td>All journal entries in chronological order, including adjustments</td></tr>
                <tr><td>General Ledger (GL)</td><td>All transactions grouped by account code, with running balances</td></tr>
              </tbody>
            </table>
            <div className="callout">All four books are formatted for <strong>loose-leaf printing and BIR binding</strong>. VAT computation (12/112 split) is handled automatically for VAT-registered clients.</div>
          </div>

          {/* S7: CLIENT SETUP */}
          <div className="section" id="clients">
            <div className="eyebrow"><span className="pip" />Section 7</div>
            <h2>Setting Up a New Client</h2>
            <p className="section-lead">You add clients directly from your account. The process takes a few minutes.</p>
            <div className="timeline">
              <div className="tl-item"><div className="tl-num">1</div><div className="tl-body"><h3>Fill in the client&apos;s details</h3><p>Go to <strong>Clients → Add New Client</strong>. Required: business name, mobile number, VAT status (VAT-registered or Non-VAT), and plan type.</p></div></div>
              <div className="tl-item"><div className="tl-num">2</div><div className="tl-body"><h3>System generates an invite link</h3><p>A one-time link is created for the client to set their own password. If an email was provided it&apos;s sent automatically. Otherwise copy the link and send via Viber, SMS, or in person.</p></div></div>
              <div className="tl-item"><div className="tl-num">3</div><div className="tl-body"><h3>Client sets up their account</h3><p>The client clicks the link, enters their name and a password, and lands on their dashboard. The link works once and expires after 30 days.</p></div></div>
              <div className="tl-item"><div className="tl-num">4</div><div className="tl-body"><h3>If the client never used the link</h3><p>Go to <strong>Client Profile → Reset Access</strong> to generate a new invite link. Same process as the initial setup.</p></div></div>
            </div>
          </div>

          {/* QUICK REFERENCE */}
          <div className="section" id="status">
            <div className="eyebrow"><span className="pip" />Quick Reference</div>
            <h2>Transaction Status Lifecycle</h2>
            <p className="section-lead">Every transaction moves through these statuses. Once approved it is permanent — changes go through adjusting entries.</p>
            <div className="life-rows">
              <div className="life-row"><span className="spill sp-proc">Processing</span><span className="la">→</span><span className="spill sp-park">Parked</span><span className="la">→</span><span className="spill sp-appr">Approved</span></div>
              <div className="life-row"><span className="spill sp-park">Parked</span><span className="la">→</span><span className="spill sp-retn">Returned</span><span className="la">→</span><span className="ln">Client re-uploads → back to Parked</span></div>
              <div className="life-row"><span className="spill sp-retn">Returned (30 days, no action)</span><span className="la">→</span><span className="spill sp-rejt">Auto-Rejected</span></div>
              <div className="life-row"><span className="spill sp-park">Parked</span><span className="la">→</span><span className="spill sp-rejt">Rejected</span><span className="ln">by bookkeeper</span></div>
            </div>

            <p className="subhead" style={{ marginTop: 36 }}>Full Process at a Glance</p>
            <div className="flow-diagram">
              <div className="fd-main">
                <div className="fd-node n-pink"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Client or accountant uploads a receipt</div>
                <div className="fd-line pl" />
                <div className="fd-node"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>System reads receipt automatically</div>
                <div className="fd-line" />
                <div className="fd-node"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Automatic checks run — flag assigned</div>
                <div className="fd-line" />
                <div className="fd-node"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Lands in Approval Queue — status: Parked</div>
                <div className="fd-line pl" />
                <div className="fd-node n-dark"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Bookkeeper reviews the item</div>
                <div className="fd-split-label">Bookkeeper chooses one of four actions</div>
                <div className="fd-outcomes">
                  <div className="fd-outcome fo-a"><div className="fd-oh">Approve</div><div className="fd-ob">Posted to General Ledger</div></div>
                  <div className="fd-outcome fo-e"><div className="fd-oh">Edit + Approve</div><div className="fd-ob">Corrected &amp; posted to GL</div></div>
                  <div className="fd-outcome fo-r"><div className="fd-oh">Return</div><div className="fd-ob">Client notified — 30 days to re-upload</div></div>
                  <div className="fd-outcome fo-x"><div className="fd-oh">Reject</div><div className="fd-ob">Excluded from books permanently</div></div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
