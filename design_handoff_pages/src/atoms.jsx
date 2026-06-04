// Shared atoms for Sofia Books page-level design handoffs.
// All page variants load this file to get DASH_THEME, layout atoms, and table primitives.
const { useState: useAtomState } = React;

/* ─── THEME TOKENS ─── */
const DASH_THEME = {
  sofia: {
    name:"Sofia", surface:"#F6F1E9", card:"#FFFFFF", cardAlt:"#FBF7F1",
    ink:"#2A2433", muted:"#8A8295", faint:"#B4AEC0", line:"#ECE4D8", lineSoft:"#F2EBE0",
    primary:"#E2568C", primaryDeep:"#C53C76", primarySoft:"#FBE6EF",
    chipBg:"#F6F1E9", navBg:"rgba(255,255,255,0.86)", field:"#F6F1E9",
    shadow:"0 1px 2px rgba(42,28,60,.04), 0 14px 34px -18px rgba(42,28,60,.18)",
    tiers:{
      review: {fg:"#C2553D",bg:"#F7E5DD",ring:"#EBCBBE"},
      check:  {fg:"#A9791A",bg:"#F6ECD4",ring:"#E8D5A6"},
      ready:  {fg:"#3C8E6C",bg:"#DEEEE5",ring:"#BCDFCD"},
      pending:{fg:"#6A5ECF",bg:"#E9E3F8",ring:"#D3C9EF"},
    },
  },
  yoda: {
    name:"Yoda", surface:"#13111C", card:"#1C1928", cardAlt:"#211D2E",
    ink:"#ECEAF2", muted:"#9A93AE", faint:"#6E6880", line:"#2C2838", lineSoft:"#252132",
    primary:"#7C9CFF", primaryDeep:"#5B7CF0", primarySoft:"rgba(124,156,255,.14)",
    chipBg:"#211D2E", navBg:"rgba(22,20,32,0.82)", field:"#211D2E",
    shadow:"0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(0,0,0,.6)",
    tiers:{
      review: {fg:"#F0987B",bg:"rgba(225,120,90,.15)",ring:"rgba(225,120,90,.32)"},
      check:  {fg:"#E8C06B",bg:"rgba(220,175,80,.14)",ring:"rgba(220,175,80,.30)"},
      ready:  {fg:"#6FD6A6",bg:"rgba(80,200,150,.14)",ring:"rgba(80,200,150,.30)"},
      pending:{fg:"#A6B7FF",bg:"rgba(124,156,255,.16)",ring:"rgba(124,156,255,.34)"},
    },
  },
};

/* ─── ICONS ─── */
function Icon({ name, size=18, stroke=1.7, style, color }) {
  const p = {fill:"none",stroke:color||"currentColor",strokeWidth:stroke,strokeLinecap:"round",strokeLinejoin:"round"};
  const paths = {
    dashboard:<><rect x="3" y="3" width="7" height="9" rx="1.5" {...p}/><rect x="14" y="3" width="7" height="5" rx="1.5" {...p}/><rect x="14" y="12" width="7" height="9" rx="1.5" {...p}/><rect x="3" y="16" width="7" height="5" rx="1.5" {...p}/></>,
    queue:    <><path d="M4 6h16M4 12h16M4 18h10" {...p}/></>,
    upload:   <><path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 3v12M7 8l5-5 5 5" {...p}/></>,
    docs:     <><path d="M5 4h10l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" {...p}/><path d="M14 4v4h4M8 13h8M8 17h5" {...p}/></>,
    clients:  <><circle cx="9" cy="8" r="3.2" {...p}/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6S13.7 16 14.5 19" {...p}/><path d="M16 8.2a3 3 0 010 5.6M19.5 19c-.4-1.8-1.3-3-2.6-3.7" {...p}/></>,
    reports:  <><path d="M5 19V5M5 19h14" {...p}/><path d="M9 15v-3M13 15V9M17 15v-5" {...p}/></>,
    entries:  <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...p}/><polyline points="14 2 14 8 20 8" {...p}/><line x1="16" y1="13" x2="8" y2="13" {...p}/><line x1="16" y1="17" x2="8" y2="17" {...p}/></>,
    billing:  <><rect x="2" y="5" width="20" height="14" rx="2" {...p}/><path d="M2 10h20" {...p}/></>,
    accountants:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...p}/><circle cx="9" cy="7" r="4" {...p}/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" {...p}/></>,
    chevron:  <><path d="M6 9l6 6 6-6" {...p}/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" {...p}/><path d="M16 2v4M8 2v4M3 10h18" {...p}/></>,
    arrow:    <><path d="M5 12h14M13 6l6 6-6 6" {...p}/></>,
    export:   <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" {...p}/></>,
    plus:     <><path d="M12 5v14M5 12h14" {...p}/></>,
    check:    <><path d="M20 6L9 17l-5-5" {...p}/></>,
    bell:     <><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" {...p}/><path d="M10 20a2 2 0 004 0" {...p}/></>,
    search:   <><circle cx="10.5" cy="10.5" r="6" {...p}/><path d="M15 15l4 4" {...p}/></>,
    x:        <><path d="M18 6L6 18M6 6l12 12" {...p}/></>,
    eye:      <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" {...p}/><circle cx="12" cy="12" r="3" {...p}/></>,
    flag:     <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" {...p}/><line x1="4" y1="22" x2="4" y2="15" {...p}/></>,
    inflow:   <><path d="M12 19V5M5 12l7-7 7 7" {...p}/></>,
    outflow:  <><path d="M12 5v14M5 12l7 7 7-7" {...p}/></>,
    book:     <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" {...p}/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" {...p}/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} style={style}>{paths[name]||null}</svg>;
}

/* ─── BRAND MARK ─── */
function BrandMark({ t, size=32, withName=true }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{width:size,height:size,borderRadius:size*.3,display:"grid",placeItems:"center",background:`linear-gradient(150deg,${t.primary},${t.primaryDeep})`,boxShadow:`0 6px 16px -6px ${t.primary}99`,flex:"none"}}>
        <svg viewBox="0 0 24 24" width={size*.56} height={size*.56}>
          <circle cx="12" cy="14.6" r="5.1" fill="#fff"/>
          <circle cx="6.4" cy="8.6" r="2.25" fill="#fff"/>
          <circle cx="12" cy="6.1" r="2.25" fill="#fff"/>
          <circle cx="17.6" cy="8.6" r="2.25" fill="#fff"/>
        </svg>
      </span>
      {withName&&<span style={{fontFamily:"'Bricolage Grotesque'",fontWeight:700,fontSize:16,letterSpacing:"-.01em",color:t.ink}}>Sofia Books</span>}
    </div>
  );
}

/* ─── THEME TOGGLE ─── */
function ThemeToggle({ theme, setTheme, t }) {
  return (
    <div style={{position:"relative",display:"flex",padding:4,borderRadius:999,background:theme==="sofia"?"#EFE7DA":"#211D2E",border:`1px solid ${t.line}`}}>
      <span style={{position:"absolute",top:4,bottom:4,width:"calc(50% - 4px)",borderRadius:999,background:`linear-gradient(150deg,${t.primary},${t.primaryDeep})`,left:4,transform:theme==="sofia"?"translateX(0)":"translateX(100%)",transition:"transform .32s cubic-bezier(.34,1.3,.5,1)",boxShadow:`0 4px 12px -4px ${t.primary}aa`}}/>
      {["sofia","yoda"].map(k=>(
        <button key={k} onClick={()=>setTheme(k)} style={{position:"relative",zIndex:2,border:0,background:"transparent",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,padding:"5px 14px",borderRadius:999,color:theme===k?"#fff":t.muted,transition:"color .25s"}}>{k==="sofia"?"Sofia":"Yoda"}</button>
      ))}
    </div>
  );
}

/* ─── BUTTONS ─── */
function PrimaryBtn({ t, children, onClick, small }) {
  return (
    <button onClick={onClick} style={{border:0,borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:small?13:14,padding:small?"9px 16px":"12px 20px",color:"#fff",background:`linear-gradient(150deg,${t.primary},${t.primaryDeep})`,boxShadow:`0 12px 22px -12px ${t.primary}cc`,display:"inline-flex",alignItems:"center",gap:7}}>
      {children}
    </button>
  );
}
function GhostBtn({ t, children, onClick }) {
  return (
    <button onClick={onClick} style={{border:`1px solid ${t.line}`,borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13.5,padding:"10px 16px",color:t.ink,background:t.card,display:"inline-flex",alignItems:"center",gap:7}}>
      {children}
    </button>
  );
}

/* ─── TIER CHIP ─── */
function TierChip({ tierKey, label, t }) {
  const c = t.tiers[tierKey];
  return (
    <span style={{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:999,fontSize:12.5,fontWeight:700,color:c.fg,background:c.bg,border:`1px solid ${c.ring}`}}>
      {label}
    </span>
  );
}

/* ─── NAV BAR ─── */
const NAV_ITEMS = {
  client:     [{label:"Dashboard",icon:"dashboard"},{label:"Upload",icon:"upload"},{label:"Documents",icon:"docs"},{label:"Reports",icon:"reports"}],
  accountant: [{label:"Dashboard",icon:"dashboard"},{label:"Queue",icon:"queue",badge:3},{label:"Adj. Entries",icon:"entries"},{label:"My Clients",icon:"clients"},{label:"Reports",icon:"reports"}],
  admin:      [{label:"Dashboard",icon:"dashboard"},{label:"Clients",icon:"clients"},{label:"Accountants",icon:"accountants"},{label:"Queue",icon:"queue"},{label:"Billing",icon:"billing"}],
};
function Nav({ t, theme, setTheme, role="accountant", active }) {
  const items = NAV_ITEMS[role]||NAV_ITEMS.accountant;
  return (
    <header style={{display:"flex",alignItems:"center",gap:20,padding:"0 36px",height:70,borderBottom:`1px solid ${t.line}`,background:t.navBg,backdropFilter:"blur(10px)",flex:"none",transition:"background .5s"}}>
      <BrandMark t={t}/>
      <nav style={{display:"flex",gap:3,marginLeft:4}}>
        {items.map(n=>{
          const isActive = n.label===active;
          return (
            <span key={n.label} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:10,fontSize:13.5,fontWeight:isActive?700:600,cursor:"pointer",color:isActive?t.primary:t.muted,background:isActive?t.primarySoft:"transparent"}}>
              {n.label}
              {n.badge&&<span style={{fontSize:10.5,fontWeight:800,color:"#fff",background:t.tiers.review.fg,borderRadius:999,padding:"1px 6px"}}>{n.badge}</span>}
            </span>
          );
        })}
      </nav>
      <div style={{flex:1}}/>
      <ThemeToggle theme={theme} setTheme={setTheme} t={t}/>
      <button style={{width:38,height:38,borderRadius:10,border:`1px solid ${t.line}`,background:t.card,color:t.muted,display:"grid",placeItems:"center",cursor:"pointer",position:"relative"}}>
        <Icon name="bell" size={18}/>
        <span style={{position:"absolute",top:9,right:9,width:6,height:6,borderRadius:999,background:t.primary,border:`2px solid ${t.card}`}}/>
      </button>
      <span style={{width:36,height:36,borderRadius:10,display:"grid",placeItems:"center",fontSize:12,fontWeight:800,color:t.primary,background:t.primarySoft,border:`1px solid ${t.line}`}}>MS</span>
    </header>
  );
}

/* ─── BREADCRUMB ─── */
function Breadcrumb({ t, crumbs }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:18,fontSize:13,color:t.muted}}>
      {crumbs.map((c,i)=>(
        <React.Fragment key={i}>
          {i>0&&<Icon name="chevron" size={13} style={{transform:"rotate(-90deg)",color:t.faint}}/>}
          <span style={{fontWeight:i===crumbs.length-1?600:500,color:i===crumbs.length-1?t.ink:t.muted,cursor:i<crumbs.length-1?"pointer":"default"}}>{c}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── SUMMARY CARD ─── */
function SummaryCard({ t, label, value, subnote, valueColor }) {
  return (
    <div style={{flex:1,background:t.card,border:`1px solid ${t.line}`,borderRadius:16,padding:"16px 20px",boxShadow:t.shadow,transition:"background .5s,border-color .5s"}}>
      <div style={{fontSize:11,fontWeight:700,color:t.faint,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>{label}</div>
      <div style={{fontFamily:"'Bricolage Grotesque'",fontWeight:800,fontSize:26,letterSpacing:"-.025em",color:valueColor||t.ink,lineHeight:1}}>{value}</div>
      {subnote&&<div style={{fontSize:12,color:t.faint,marginTop:5}}>{subnote}</div>}
    </div>
  );
}

/* ─── FILTER DROPDOWN (mock) ─── */
function FilterSelect({ t, value }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,height:40,padding:"0 14px",paddingRight:36,borderRadius:11,border:`1.5px solid ${t.line}`,background:t.card,fontSize:13.5,fontWeight:600,color:t.ink,cursor:"pointer",position:"relative",whiteSpace:"nowrap"}}>
      {value}
      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:t.faint}}><Icon name="chevron" size={14}/></span>
    </div>
  );
}

/* ─── DATE FIELD (mock) ─── */
function DateField({ t, value }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,height:40,padding:"0 14px",borderRadius:11,border:`1.5px solid ${t.line}`,background:t.card,fontSize:13.5,fontWeight:600,color:t.muted,cursor:"pointer",whiteSpace:"nowrap"}}>
      {value}
      <Icon name="calendar" size={14} style={{color:t.faint}}/>
    </div>
  );
}

/* ─── TABLE CARD SHELL ─── */
function TableCardHeader({ t, icon, title, count, badges }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"18px 24px",borderBottom:`1px solid ${t.line}`}}>
      <span style={{color:t.primary}}><Icon name={icon||"docs"} size={18}/></span>
      <span style={{fontFamily:"'Bricolage Grotesque'",fontWeight:700,fontSize:16,color:t.ink}}>{title}</span>
      {count!=null&&<span style={{fontSize:11.5,fontWeight:800,color:t.primary,background:t.primarySoft,padding:"2px 8px",borderRadius:999}}>{count}</span>}
      {(badges||[]).map((b,i)=><span key={i} style={{fontSize:11.5,fontWeight:800,color:t.tiers[b.tier||"review"].fg,background:t.tiers[b.tier||"review"].bg,border:`1px solid ${t.tiers[b.tier||"review"].ring}`,padding:"2px 10px",borderRadius:999}}>{b.label}</span>)}
    </div>
  );
}

/* ─── CURRENCY CELL ─── */
function CurrencyCell({ t, value, isInflow }) {
  if (!value) return <span style={{color:t.faint}}>—</span>;
  return <span style={{fontVariantNumeric:"tabular-nums",fontWeight:600,color:isInflow?t.tiers.ready.fg:t.tiers.review.fg}}>{value}</span>;
}

/* ─── STATUS CHIP ─── */
const STATUS_MAP = {
  "In Review":  "review",
  "Check":      "check",
  "Approved":   "ready",
  "Pending":    "pending",
  "Rejected":   "review",
  "Draft":      "pending",
  "Processing": "pending",
  "Withdrawn":  "pending",
  "Active":     "ready",
  "Overdue":    "check",
  "Suspended":  "review",
  "Inactive":   "pending",
  "Pending Invite":"check",
};
function StatusChip({ t, status }) {
  const tier = STATUS_MAP[status]||"pending";
  const c = t.tiers[tier];
  return <span style={{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:999,fontSize:12.5,fontWeight:700,color:c.fg,background:c.bg,border:`1px solid ${c.ring}`}}>{status}</span>;
}

/* ─── SOURCE CHIP ─── */
function SourceChip({ t, source }) {
  const isManual = source==="Manual";
  const style = isManual
    ? {background:t.tiers.pending.bg,color:t.tiers.pending.fg,border:`1px solid ${t.tiers.pending.ring}`}
    : {background:t.chipBg,color:t.muted,border:`1px solid ${t.line}`};
  return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:8,fontSize:12.5,fontWeight:600,...style}}>{source}</span>;
}

/* ─── TYPE CHIP ─── */
function TypeChip({ t, type }) {
  const isIncome = type==="Income";
  const c = isIncome ? {bg:"#DCFCE7",fg:"#15803D"} : {bg:"#FEE2E2",fg:"#B91C1C"};
  return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:8,fontSize:12.5,fontWeight:600,background:c.bg,color:c.fg}}>{type}</span>;
}

/* ─── PAGE FRAME ─── */
function PageFrame({ t, theme, setTheme, role, activeNav, children }) {
  return (
    <div style={{height:"100%",width:"100%",background:t.surface,color:t.ink,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",transition:"background .5s,color .5s",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <Nav t={t} theme={theme} setTheme={setTheme} role={role} active={activeNav}/>
      <div style={{flex:1,overflowY:"auto",padding:"28px 36px",maxWidth:1280,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  DASH_THEME, Icon, BrandMark, ThemeToggle, PrimaryBtn, GhostBtn, TierChip,
  Nav, Breadcrumb, SummaryCard, FilterSelect, DateField,
  TableCardHeader, CurrencyCell, StatusChip, SourceChip, TypeChip, PageFrame,
});
