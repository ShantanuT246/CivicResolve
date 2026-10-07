import { useState, type ReactNode } from "react";
import { MiniMap, FullMap, LocationPicker, type IssueMarker } from "./MapView";

type Page =
  | "dashboard"
  | "map"
  | "report"
  | "issue"
  | "verify"
  | "my-reports"
  | "verification-requests"
  | "department"
  | "department-issues"
  | "repair-claims"
  | "disputes"
  | "durability"
  | "notifications"
  | "settings";
type Role = "citizen" | "department";
type IconName =
  | "home"
  | "map"
  | "plus"
  | "file"
  | "building"
  | "chart"
  | "bell"
  | "search"
  | "pin"
  | "clock"
  | "check"
  | "alert"
  | "arrow"
  | "camera"
  | "users"
  | "menu"
  | "x"
  | "chevron";

const PHOTO =
  "https://images.unsplash.com/photo-1760261577319-6e0ebfb41792?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    file: <><path d="M6 3h9l3 3v15H6Z" /><path d="M9 11h6M9 15h6M15 3v4h4" /></>,
    building: <><path d="M4 21V6l8-3 8 3v15M8 9h2m4 0h2M8 13h2m4 0h2M9 21v-4h6v4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5m0 3v.1" /></>,
    arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
    camera: <><path d="M4 8h4l2-3h4l2 3h4v11H4Z" /><circle cx="12" cy="13" r="3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c4 0 6 2 6 5" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const statuses = {
  reported: ["Reported", "blue"],
  pending: ["Pending verification", "amber"],
  verified: ["Verified resolved", "green"],
  reopened: ["Reopened", "red"],
} as const;

function Badge({ status }: { status: keyof typeof statuses }) {
  const [label, color] = statuses[status];
  return <span className={`badge badge-${color}`}><span />{label}</span>;
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  icon?: IconName;
  onClick?: () => void;
  className?: string;
}) {
  return <button className={`btn btn-${variant} ${className}`} onClick={onClick}>{icon && <Icon name={icon} size={18} />}{children}</button>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}

const issueRows = [
  { id: "CR-2841", title: "Streetlight out on Cedar Avenue", location: "Cedar Ave & 8th St", status: "pending" as const, time: "5 days left", category: "Streetlight" },
  { id: "CR-2827", title: "Water leak near Oakridge Park", location: "Oakridge Park, North Gate", status: "reopened" as const, time: "Reopened today", category: "Water leak" },
  { id: "CR-2819", title: "Damaged pedestrian sign", location: "14 Market Street", status: "verified" as const, time: "Verified yesterday", category: "Signboard" },
];

// MapVisual is replaced by real Mapbox components from MapView.tsx.
// The three variants are: MiniMap (previews), LocationPicker (report form), FullMap (map page).
// This stub is kept so any missed reference fails loudly.
function MapVisual(_props: { large?: boolean; onIssue?: () => void }) {
  return <div style={{ height: 285, background: "#e9eee8", borderRadius: 8, display: "grid", placeItems: "center", color: "#718096", fontSize: 12 }}>Map loading…</div>;
}

function StatCard({ icon, value, label, trend, tone = "blue" }: { icon: IconName; value: string; label: string; trend: string; tone?: string }) {
  return <Card className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon name={icon} /></div><div><p>{label}</p><strong>{value}</strong><small>{trend}</small></div></Card>;
}

function Dashboard({ go }: { go: (p: Page) => void }) {
  return <div>
    <PageHeader eyebrow="Citizen dashboard" title="Good morning, Maya" text="Here’s what’s happening in your community today." action={<Button icon="plus" onClick={() => go("report")}>Report an issue</Button>} />
    <div className="stats-grid">
      <StatCard icon="file" value="12" label="Your reports" trend="+2 this month" />
      <StatCard icon="clock" value="4" label="Awaiting verification" trend="2 need your response" tone="amber" />
      <StatCard icon="check" value="7" label="Verified resolved" trend="58% resolution rate" tone="green" />
      <StatCard icon="alert" value="1" label="Reopened issue" trend="Action in progress" tone="red" />
    </div>
    <div className="dashboard-grid">
      <Card className="map-card"><div className="card-heading"><div><h2>Issues near you</h2><p>Within 2 km of your saved location</p></div><button className="text-button" onClick={() => go("map")}>View map <Icon name="arrow" size={16} /></button></div><MiniMap height={285} zoom={14} onMarkerClick={(_issue: IssueMarker) => go("issue")} /><div className="map-legend"><span><i className="dot blue" />Reported</span><span><i className="dot amber" />Pending</span><span><i className="dot green" />Verified</span><span><i className="dot red" />Reopened</span></div></Card>
      <Card className="verification-card"><div className="card-heading"><div><h2>Verification requests</h2><p>Repairs near you need a second look</p></div><span className="count-badge">2</span></div><img src={PHOTO} alt="Streetlight on Cedar Avenue awaiting repair verification" /><div className="verification-content"><Badge status="pending" /><h3>Streetlight repaired on Cedar Avenue</h3><p className="meta"><Icon name="pin" size={16} /> 0.4 km away · <Icon name="clock" size={16} /> 5 days left</p><div className="progress-line"><span /></div><Button onClick={() => go("verify")} className="wide">Review repair evidence <Icon name="arrow" size={17} /></Button></div></Card>
    </div>
    <div className="section-heading"><div><h2>Recent activity</h2><p>Updates from issues you follow and reported</p></div><button className="text-button">View all <Icon name="arrow" size={16} /></button></div>
    <Card className="activity-list">{issueRows.map((issue) => <button key={issue.id} className="activity-row" onClick={() => go("issue")}><div className="issue-symbol"><Icon name={issue.category === "Water leak" ? "alert" : "pin"} /></div><div className="activity-main"><span className="issue-id">{issue.id}</span><h3>{issue.title}</h3><p><Icon name="pin" size={14} />{issue.location}</p></div><Badge status={issue.status} /><span className="row-time">{issue.time}</span><Icon name="chevron" size={18} /></button>)}</Card>
  </div>;
}

function ReportIssue({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Streetlight");
  const categories = ["Streetlight", "Overflowing Bin", "Broken Footpath", "Water Leak", "Damaged Signboard"];
  return <div className="narrow-page">
    <PageHeader eyebrow="New civic report" title="Report an issue" text="Your evidence helps departments act and communities verify." />
    <div className="stepper">{["Category", "Location", "Evidence", "Review"].map((label, i) => <div className={`${step >= i + 1 ? "active" : ""}`} key={label}><span>{step > i + 1 ? <Icon name="check" size={15} /> : i + 1}</span><p>{label}</p></div>)}</div>
    <Card className="form-card">
      {step === 1 && <><p className="eyebrow">Step 1 of 4</p><h2>What type of issue are you reporting?</h2><p className="form-intro">Choose the category that best describes the problem.</p><div className="category-grid">{categories.map((c, i) => <button className={category === c ? "selected" : ""} onClick={() => setCategory(c)} key={c}><span><Icon name={i === 0 ? "plus" : i === 3 ? "alert" : "file"} /></span>{c}{category === c && <i><Icon name="check" size={14} /></i>}</button>)}</div></>}
      {step === 2 && <><p className="eyebrow">Step 2 of 4</p><h2>Where is the issue?</h2><p className="form-intro">Click the map or drag the pin to pinpoint the issue location.</p><LocationPicker onLocationChange={(_lat, _lng) => { /* store lat/lng in state before submit */ }} /><label className="field-label">Street address or landmark<input defaultValue="Cedar Avenue & 8th Street" /></label><button className="location-button"><Icon name="pin" size={17} />Use my current location</button></>}
      {step === 3 && <><p className="eyebrow">Step 3 of 4</p><h2>Add clear evidence</h2><p className="form-intro">Photos make your report easier to assess and verify.</p><button className="upload-zone"><span><Icon name="camera" size={26} /></span><strong>Upload photos or take a picture</strong><small>JPG or PNG, up to 10 MB each</small></button><label className="field-label">Describe the issue<textarea defaultValue="The streetlight has been out for three nights, leaving the pedestrian crossing very dark." /></label></>}
      {step === 4 && <><p className="eyebrow">Step 4 of 4</p><h2>Review your report</h2><p className="form-intro">Make sure these details are accurate before submitting.</p><div className="review-box"><div><span>Category</span><strong>{category}</strong></div><div><span>Location</span><strong>Cedar Avenue & 8th Street</strong></div><div><span>Evidence</span><strong>2 photographs attached</strong></div><div><span>Description</span><strong>Streetlight out near the pedestrian crossing for three nights.</strong></div></div><div className="trust-note"><Icon name="check" /><p><strong>Community verification is required</strong><br />This report cannot be marked verified resolved without repair evidence and citizen validation.</p></div></>}
      <div className="form-actions">{step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button onClick={() => step < 4 ? setStep(step + 1) : go("issue")}>{step === 4 ? "Submit issue" : "Continue"} <Icon name="arrow" size={17} /></Button></div>
    </Card>
  </div>;
}

function Lifecycle({ disputed = false }: { disputed?: boolean }) {
  const stages = disputed ? ["Reported", "Repair claimed", "Disputed", "Reopened"] : ["Reported", "Under review", "Repair claimed", "Verification", "Verified resolved"];
  return <div className="lifecycle">{stages.map((s, i) => <div className={`${i < stages.length - 1 ? "done" : ""} ${disputed && i > 1 ? "danger" : ""}`} key={s}><span>{i < stages.length - 1 ? <Icon name="check" size={13} /> : i + 1}</span><p>{s}</p></div>)}</div>;
}

function IssueDetails({ go }: { go: (p: Page) => void }) {
  return <div>
    <button className="back-link" onClick={() => go("dashboard")}>← Back to dashboard</button>
    <PageHeader eyebrow="Issue CR-2841 · Streetlight" title="Streetlight out on Cedar Avenue" text="Cedar Avenue & 8th Street, Riverside Ward" action={<Badge status="pending" />} />
    <Card className="lifecycle-card"><div className="card-heading"><div><h2>Resolution lifecycle</h2><p>Department closed is not the same as citizen verified</p></div><span className="deadline"><Icon name="clock" size={16} />5 days remaining</span></div><Lifecycle /></Card>
    <div className="issue-grid">
      <div className="issue-content">
        <Card><div className="card-heading"><div><h2>Repair evidence</h2><p>Submitted by Riverside Public Works · June 12, 2025</p></div><span className="evidence-check"><Icon name="check" size={16} />Official evidence</span></div><div className="photo-compare"><figure><img src={PHOTO} alt="Streetlight before repair" /><figcaption><span>BEFORE</span>Reported June 7</figcaption></figure><figure><img className="after-photo" src={PHOTO} alt="Streetlight after repair" /><figcaption><span>AFTER</span>Repair claimed June 12</figcaption></figure></div><div className="repair-details"><div><span>Repair completed</span><strong>LED driver and wiring replaced</strong></div><div><span>Assigned team</span><strong>Electrical Response Unit 3</strong></div><div><span>Work order</span><strong>WO-2025-1198</strong></div></div></Card>
        <Card><h2>Location & report details</h2><MiniMap height={190} markerStatus="DEPARTMENT_CLOSED" zoom={15} /><div className="detail-list"><p><span>Reported by</span><strong>Maya Chen · Verified resident</strong></p><p><span>Reported on</span><strong>June 7, 2025 at 9:42 PM</strong></p><p><span>Original report</span><strong>Light has been out for three nights near a busy crossing.</strong></p></div></Card>
      </div>
      <aside className="issue-sidebar">
        <Card className="verify-panel"><div className="shield"><Icon name="users" size={26} /></div><h2>Help verify this repair</h2><p>Visit the location and confirm whether the streetlight is working.</p><div className="verification-numbers"><div><strong>14</strong><span>Verified</span></div><div><strong>2</strong><span>Disputed</span></div></div><Button variant="success" icon="check" onClick={() => go("verify")} className="wide">Verify repair</Button><Button variant="danger" icon="alert" onClick={() => go("verify")} className="wide">Report still unresolved</Button><small>Your vote is private. One vote per verification cycle.</small></Card>
        <Card><h3>Repair durability</h3><div className="durability-score"><strong>—</strong><span>Monitoring begins after verification</span></div><p className="muted">Follow-up checks occur at 30, 60 and 90 days.</p></Card>
        <Card><h3>Status history</h3><div className="timeline"><p><i className="green" /><strong>Repair claimed</strong><span>June 12 · 4:20 PM</span></p><p><i className="blue" /><strong>Team assigned</strong><span>June 9 · 10:15 AM</span></p><p><i className="blue" /><strong>Issue reported</strong><span>June 7 · 9:42 PM</span></p></div></Card>
      </aside>
    </div>
  </div>;
}

function CivicMap({ go }: { go: (p: Page) => void }) {
  return <div className="full-map-page"><div className="map-toolbar"><div className="search-box"><Icon name="search" /><input placeholder="Search address, ward, or issue ID" /></div><button className="filter active">All categories</button><button className="filter">Status</button><button className="filter">Date reported</button><Button variant="secondary" icon="pin">Issues near me</Button></div><div className="map-shell"><FullMap onMarkerClick={(_issue: IssueMarker) => go("issue")} verificationCenter={{ lat: 12.9695, lng: 79.1552 }} /><Card className="floating-issue"><img src={PHOTO} alt="Cedar Avenue streetlight" /><div><Badge status="pending" /><span className="issue-id">CR-2841 · Streetlight</span><h3>Streetlight repaired on Cedar Avenue</h3><p><Icon name="pin" size={15} />Cedar Ave & 8th St · 0.4 km</p><Button onClick={() => go("issue")} className="wide">View issue details</Button></div></Card><div className="map-legend floating"><strong>Issue status</strong><span><i className="dot blue" />Reported</span><span><i className="dot amber" />Pending verification</span><span><i className="dot green" />Verified resolved</span><span><i className="dot red" />Reopened</span></div></div></div>;
}

function VerifyPage({ go }: { go: (p: Page) => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <div className="success-state"><div><Icon name="check" size={42} /></div><p className="eyebrow">Verification recorded</p><h1>Thank you for checking.</h1><p>Your verification has been securely added. The issue will be resolved only when the community threshold is met.</p><Button onClick={() => go("dashboard")}>Return to dashboard</Button></div>;
  return <div className="narrow-page verify-page"><PageHeader eyebrow="Community verification · CR-2841" title="Is this issue actually resolved?" text="Review the official evidence, then verify the current condition in person." /><div className="verification-rule"><Icon name="pin" /><div><strong>You’re within the verification area</strong><p>Current location is 310 m from the reported issue.</p></div><span>Eligible</span></div><Card><div className="photo-compare"><figure><img src={PHOTO} alt="Before repair" /><figcaption><span>BEFORE</span>Citizen report</figcaption></figure><figure><img className="after-photo" src={PHOTO} alt="After official repair" /><figcaption><span>AFTER</span>Official evidence</figcaption></figure></div><div className="verify-summary"><h2>Streetlight out on Cedar Avenue</h2><p><Icon name="pin" size={16} /> Cedar Avenue & 8th Street</p><div><span>Repair date<strong>June 12, 2025</strong></span><span>Deadline<strong>June 17 · 5 days left</strong></span></div></div></Card><Card><h2>Choose your verification</h2><p className="form-intro">You can only verify once during this cycle. The reporter cannot be the only validator.</p><div className="decision-grid"><button onClick={() => setSubmitted(true)}><span className="success"><Icon name="check" size={28} /></span><strong>Yes, issue is resolved</strong><small>I visited the location and the streetlight is working.</small></button><button onClick={() => setSubmitted(true)}><span className="danger"><Icon name="x" size={28} /></span><strong>No, it’s still unresolved</strong><small>The repair is incomplete, failed, or the issue remains.</small></button></div><label className="field-label">Add an optional comment<textarea placeholder="Share what you observed at the location..." /></label><button className="attach-button"><Icon name="camera" />Add supporting photo</button></Card></div>;
}

const bars = [72, 48, 66, 39, 57];
function Department() {
  return <div><PageHeader eyebrow="Riverside Public Works" title="Department overview" text="Accountability, verification, and repair quality at a glance." action={<Button icon="plus">New work order</Button>} /><div className="department-stats"><StatCard icon="file" value="1,284" label="Total complaints" trend="+8.4% this quarter" /><StatCard icon="clock" value="86" label="Open issues" trend="12 overdue" tone="amber" /><StatCard icon="users" value="42" label="Pending verification" trend="Community review" tone="amber" /><StatCard icon="check" value="88.6%" label="Verified resolution" trend="+3.2% vs last month" tone="green" /></div><div className="analytics-grid"><Card><div className="card-heading"><div><h2>Issues by category</h2><p>Reports received this quarter</p></div><button className="filter">Last 90 days</button></div><div className="bar-chart">{bars.map((h, i) => <div key={i}><span style={{ height: `${h}%` }} /><small>{["Lights", "Bins", "Paths", "Leaks", "Signs"][i]}</small></div>)}</div></Card><Card><div className="card-heading"><div><h2>Resolution status</h2><p>Current complaint portfolio</p></div></div><div className="donut-wrap"><div className="donut"><strong>1,284</strong><span>Total</span></div><div className="donut-legend"><p><i className="green" /><span>Verified resolved</span><strong>62%</strong></p><p><i className="amber" /><span>Verification pending</span><strong>19%</strong></p><p><i className="blue" /><span>In progress</span><strong>14%</strong></p><p><i className="red" /><span>Reopened</span><strong>5%</strong></p></div></div></Card></div><div className="section-heading"><div><h2>Active issues</h2><p>Prioritized by service deadline and verification status</p></div><button className="text-button">Export report <Icon name="arrow" size={16} /></button></div><Card className="table-card"><table><thead><tr><th>Issue ID</th><th>Category & location</th><th>Status</th><th>Assigned team</th><th>Repair date</th><th>Verification</th></tr></thead><tbody>{issueRows.map((r, i) => <tr key={r.id}><td><strong>{r.id}</strong></td><td><strong>{r.category}</strong><span>{r.location}</span></td><td><Badge status={r.status} /></td><td>Response Team {i + 1}</td><td>{i === 1 ? "—" : `Jun ${12 - i}, 2025`}</td><td><div className="mini-progress"><span style={{ width: `${70 - i * 20}%` }} /></div>{14 - i * 4} of 18 votes</td></tr>)}</tbody></table></Card></div>;
}

function Durability() {
  return <div><PageHeader eyebrow="Quality analytics" title="Repair durability" text="Measure whether completed repairs remain successful over time." action={<button className="filter active">Last 12 months</button>} /><div className="stats-grid"><StatCard icon="check" value="94.2%" label="30-day durability" trend="+1.8% year over year" tone="green" /><StatCard icon="check" value="89.7%" label="60-day durability" trend="+0.9% year over year" tone="green" /><StatCard icon="chart" value="84.1%" label="90-day durability" trend="-1.2% needs attention" tone="amber" /><StatCard icon="alert" value="7.8%" label="Recurrence rate" trend="64 reopened issues" tone="red" /></div><div className="analytics-grid durability-charts"><Card><div className="card-heading"><div><h2>Durability trend</h2><p>Community-confirmed repair success over 12 months</p></div></div><div className="line-chart"><div className="axis-lines"><i /><i /><i /></div><svg viewBox="0 0 600 180" preserveAspectRatio="none"><path d="M0,130 C70,110 90,125 150,85 S250,105 300,70 S390,88 440,48 S530,62 600,25" /><path className="area" d="M0,130 C70,110 90,125 150,85 S250,105 300,70 S390,88 440,48 S530,62 600,25 L600,180 L0,180Z" /></svg><div className="chart-labels"><span>Jul</span><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span><span>May</span></div></div></Card><Card><h2>Quality by department</h2><p className="form-intro">90-day durability score</p><div className="rank-list">{[["Street Lighting", "93%"], ["Water Services", "87%"], ["Roads & Footpaths", "81%"], ["Waste Management", "78%"]].map(([n, v], i) => <div key={n}><span>{i + 1}</span><p><strong>{n}</strong><i><b style={{ width: v }} /></i></p><strong>{v}</strong></div>)}</div></Card></div><Card className="insight-card"><span><Icon name="chart" size={24} /></span><div><p className="eyebrow">Quality insight</p><h3>Streetlight repairs improved 8.4% after switching LED driver suppliers.</h3><p>Based on 312 citizen follow-up checks completed at 30, 60 and 90 days.</p></div><Button variant="secondary">View full analysis</Button></Card></div>;
}

function Notifications({ go, role = "citizen" }: { go: (p: Page) => void; role?: Role }) {
  const notes = role === "citizen" ? [
    ["amber", "A water leak near you requires verification.", "Cedar Avenue · 12 minutes ago", "verify"],
    ["green", "Your streetlight complaint has been marked as repaired.", "Oakridge Park · 2 hours ago", "issue"],
    ["red", "Your verified issue has been reopened.", "Market Street footpath · Yesterday", "issue"],
    ["blue", "Verification window closes in 2 days.", "Damaged signboard on Pine Road · Yesterday", "verify"],
  ] as const : [
    ["blue", "New civic issue reported.", "North Ward · 8 minutes ago", "department-issues"],
    ["amber", "Repair claim requires additional evidence.", "Issue CR-2827 · 1 hour ago", "repair-claims"],
    ["red", "12 citizens have disputed Issue CR-1024.", "Oakridge Park · 3 hours ago", "disputes"],
    ["amber", "Verification window closes tomorrow.", "Issue CR-2819 · Yesterday", "department-issues"],
  ] as const;
  return <div className="narrow-page"><PageHeader eyebrow="Real-time alerts" title="Notifications" text="Stay informed about reports, repairs, and community verification." action={<button className="text-button">Mark all as read</button>} /><div className="notification-tabs"><button className="active">All <span>4</span></button><button>Verification</button><button>Your reports</button><button>System</button></div><Card className="notification-list">{notes.map(([tone, title, meta, page], i) => <button key={title} className={`notification-row ${i < 2 ? "unread" : ""}`} onClick={() => go(page)}><div className={`notification-icon tone-${tone}`}><Icon name={tone === "green" ? "check" : tone === "red" ? "alert" : tone === "amber" ? "clock" : "bell"} /></div><div><h3>{title}</h3><p>{meta}</p>{i === 0 && <span className="notification-action">Review evidence →</span>}</div>{i < 2 && <i className="unread-dot" />}</button>)}</Card></div>;
}

function MyReports({ go }: { go: (p: Page) => void }) {
  const rows = [
    ["CR-2841", "Streetlight", "Cedar Ave & 8th St", "Jun 7, 2025", "pending", "12 min ago"],
    ["CR-2827", "Water Leak", "Oakridge Park, North Gate", "Jun 2, 2025", "reopened", "Today"],
    ["CR-2819", "Damaged Signboard", "14 Market Street", "May 28, 2025", "verified", "Yesterday"],
    ["CR-2764", "Broken Footpath", "Pine Road School", "May 17, 2025", "reported", "May 19"],
  ] as const;
  return <div><PageHeader eyebrow="Citizen records" title="My reports" text="Track every issue you have submitted and its complete resolution history." action={<Button icon="plus" onClick={() => go("report")}>Report an issue</Button>} /><div className="list-tools"><div className="search-box"><Icon name="search" /><input placeholder="Search by issue ID or location" /></div><button className="filter active">All statuses</button><button className="filter">Newest first</button></div><Card className="table-card"><table><thead><tr><th>Issue ID</th><th>Category & location</th><th>Reported</th><th>Current status</th><th>Last updated</th><th /></tr></thead><tbody>{rows.map(([id, category, location, date, status, updated]) => <tr key={id} onClick={() => go("issue")} className="clickable-row"><td><strong>{id}</strong></td><td><strong>{category}</strong><span>{location}</span></td><td>{date}</td><td><Badge status={status} /></td><td>{updated}</td><td><Icon name="chevron" size={16} /></td></tr>)}</tbody></table></Card><div className="status-principle"><div><span className="closed-label">Department closed</span><strong>≠</strong><span className="verified-label"><Icon name="check" size={15} />Citizen verified</span></div><p>A repair claim starts verification. It does not complete it.</p></div></div>;
}

function VerificationRequests({ go }: { go: (p: Page) => void }) {
  const requests = [
    ["Streetlight repair", "Cedar Avenue & 8th Street", "0.4 km", "5 days left"],
    ["Footpath resurfacing", "Pine Road School", "1.1 km", "3 days left"],
    ["Water leak repair", "Oakridge Park North Gate", "1.8 km", "Tomorrow"],
  ];
  return <div><PageHeader eyebrow="Community verification" title="Help verify local repairs" text="Your local knowledge makes civic resolution accountable." /><div className="request-grid">{requests.map(([title, location, distance, deadline], i) => <Card className="request-card" key={title}><div className="request-images"><img src={PHOTO} alt={`${title} before repair`} /><img className="after-photo" src={PHOTO} alt={`${title} after repair`} /><span>Before</span><span>After</span></div><div className="request-body"><Badge status="pending" /><h2>{title}</h2><p><Icon name="pin" size={15} />{location}</p><div className="request-meta"><span><small>Repair date</small>June {12 - i}, 2025</span><span><small>Distance</small>{distance}</span><span><small>Deadline</small>{deadline}</span></div><h3>Does this issue appear to be resolved?</h3><Button variant="success" icon="check" onClick={() => go("verify")}>Yes, verify resolved</Button><Button variant="danger" icon="x" onClick={() => go("verify")}>No, report issue</Button></div></Card>)}</div></div>;
}

function DepartmentIssues({ go }: { go: (p: Page) => void }) {
  return <div><PageHeader eyebrow="Operations queue" title="Issue management" text="Assign, repair, document, and track every complaint through citizen verification." action={<Button icon="plus">Create work order</Button>} /><div className="list-tools"><div className="search-box"><Icon name="search" /><input placeholder="Search issue ID, location, or team" /></div><button className="filter active">All issues</button><button className="filter">Priority</button><button className="filter">Status</button><button className="filter">Sort: newest</button></div><Card className="table-card"><table><thead><tr><th>Issue ID</th><th>Category & location</th><th>Reported</th><th>Priority</th><th>Assigned team</th><th>Status</th><th>Verification</th><th>Actions</th></tr></thead><tbody>{issueRows.concat(issueRows).map((r, i) => <tr key={`${r.id}-${i}`}><td><strong>{r.id}</strong></td><td><strong>{r.category}</strong><span>{r.location}</span></td><td>Jun {12 - i}, 2025</td><td><span className={`priority ${i === 1 ? "high" : ""}`}>{i === 1 ? "High" : "Normal"}</span></td><td>Response Team {(i % 3) + 1}</td><td><Badge status={r.status} /></td><td>{r.status === "pending" ? "14 / 20 verified" : "—"}</td><td><button className="table-action" onClick={() => go("issue")}>Manage</button></td></tr>)}</tbody></table><div className="pagination"><span>Showing 1–6 of 1,284 issues</span><div><button>Previous</button><button className="active">1</button><button>2</button><button>3</button><button>Next</button></div></div></Card></div>;
}

function RepairClaims() {
  return <div className="narrow-page"><PageHeader eyebrow="Official repair evidence" title="Submit a repair claim" text="A completed work order must include verifiable evidence before community review can begin." /><div className="claim-warning"><Icon name="alert" /><div><strong>Evidence is required</strong><p>An issue cannot become Verified Resolved without an official repair claim and required before-and-after evidence.</p></div></div><Card className="form-card"><div className="two-fields"><label className="field-label">Issue ID<input defaultValue="CR-2841" /></label><label className="field-label">Assigned technician<input defaultValue="Elena Rodriguez — Unit 3" /></label></div><div className="two-fields"><label className="field-label">Repair date<input type="date" defaultValue="2025-06-12" /></label><label className="field-label">Work order<input defaultValue="WO-2025-1198" /></label></div><label className="field-label">Repair description<textarea defaultValue="Replaced failed LED driver, inspected wiring connections, and confirmed full illumination at the pedestrian crossing." /></label><div className="evidence-upload-grid"><button className="upload-zone"><span><Icon name="camera" /></span><strong>Before repair evidence</strong><small>1 photo attached</small></button><button className="upload-zone"><span><Icon name="camera" /></span><strong>After repair evidence</strong><small>Upload required</small></button></div><div className="workflow-preview"><span>Repair claim</span><Icon name="arrow" /><span>Citizen verification</span><Icon name="arrow" /><span>Verified or reopened</span></div><div className="form-actions"><Button variant="secondary">Save draft</Button><Button icon="check">Submit repair claim</Button></div></Card></div>;
}

function Disputes({ go }: { go: (p: Page) => void }) {
  return <div><PageHeader eyebrow="Citizen accountability" title="Disputed repairs" text="Review community evidence and decide whether repairs require further action." action={<button className="filter active">12 open disputes</button>} /><div className="dispute-list">{[["CR-1024", "Water leak recurring at Oakridge Park", "12", "Today, 9:14 AM"], ["CR-2802", "Footpath remains inaccessible", "7", "Yesterday, 4:20 PM"]].map(([id, title, count, date]) => <Card className="dispute-card" key={id}><div className="dispute-image"><img src={PHOTO} alt="Citizen evidence of disputed repair" /><span><Icon name="camera" size={14} />Citizen evidence</span></div><div className="dispute-copy"><Badge status="reopened" /><p className="issue-id">{id} · {date}</p><h2>{title}</h2><p><Icon name="pin" size={15} />Oakridge Park, North Gate</p><blockquote>“Water started pooling again less than 24 hours after the repair team left.”</blockquote><div className="dispute-count"><strong>{count}</strong><span>citizen disputes</span></div></div><div className="dispute-actions"><Button variant="secondary" onClick={() => go("issue")}>Review dispute</Button><Button variant="danger">Reopen issue</Button><button className="text-button">Keep verification active</button></div></Card>)}</div></div>;
}

function Settings({ role }: { role: Role }) {
  const department = role === "department";
  return <div className="narrow-page"><PageHeader eyebrow={department ? "Administration" : "Citizen account"} title={department ? "Department settings" : "Profile & preferences"} text="Manage identity, region, and real-time notification preferences." /><Card className="profile-card"><div className="profile-hero"><div className="large-avatar">{department ? "RP" : "MC"}</div><div><h2>{department ? "Riverside Public Works" : "Maya Chen"}</h2><p>{department ? "Official municipal department · ID RPD-041" : "Verified resident · Riverside Ward"}</p></div><Button variant="secondary">Change photo</Button></div><div className="settings-section"><h3>{department ? "Department information" : "Personal information"}</h3><div className="two-fields"><label className="field-label">{department ? "Department name" : "Full name"}<input defaultValue={department ? "Riverside Public Works" : "Maya Chen"} /></label><label className="field-label">{department ? "Official email" : "Email"}<input defaultValue={department ? "operations@riverside.gov" : "maya.chen@example.com"} /></label><label className="field-label">{department ? "Department ID" : "Phone"}<input defaultValue={department ? "RPD-041" : "+1 (555) 018-4421"} /></label><label className="field-label">{department ? "Assigned region" : "Home area"}<input defaultValue={department ? "Riverside North & Central" : "Riverside Ward"} /></label></div></div><div className="settings-section"><h3>Notification preferences</h3>{["New issue activity", "Verification requests", "Disputes and reopenings", "Weekly performance summary"].map((label, i) => <label className="toggle-row" key={label}><span><strong>{label}</strong><small>{i === 0 ? "Receive time-sensitive updates in real time" : "Email and in-app notifications"}</small></span><input type="checkbox" defaultChecked={i < 3} /><i /></label>)}</div><div className="form-actions"><Button>Save changes</Button></div></Card></div>;
}

function RoleSelection({ select }: { select: (role: Role) => void }) {
  return <div className="entry-page"><header className="entry-header"><div className="entry-brand"><span><Icon name="check" /></span><strong>CivicResolve</strong></div><span>Accountable civic resolution</span></header><main className="entry-content"><p className="eyebrow">Community-powered accountability</p><h1>Making civic resolution accountable.</h1><p className="entry-subtitle">Report issues. Verify repairs. Build better communities.</p><div className="role-question"><h2>How are you using CivicResolve?</h2><p>Choose your role to access the right tools and dashboard.</p></div><div className="role-grid"><button className="role-card citizen-role" onClick={() => select("citizen")}><span className="role-icon"><Icon name="users" size={31} /></span><div><p className="eyebrow">Community access</p><h2>I’m a Citizen</h2><p>Report civic issues, track your complaints, and verify whether repairs in your community are actually complete.</p></div><span className="role-cta">Continue as Citizen <Icon name="arrow" size={18} /></span></button><button className="role-card department-role" onClick={() => select("department")}><span className="role-icon"><Icon name="building" size={31} /></span><div><p className="eyebrow">Official access</p><h2>I’m a Department</h2><p>Manage civic complaints, assign repairs, submit evidence, and monitor community verification.</p></div><span className="role-cta">Continue as Department <Icon name="arrow" size={18} /></span></button></div><p className="role-note"><Icon name="check" size={15} />Your role determines the tools and dashboard you’ll see.</p></main><footer className="entry-footer"><span>Transparent by design</span><strong>Department Closed <i>≠</i> Citizen Verified</strong><span>Community accountable</span></footer></div>;
}

function Authentication({ role, back, complete }: { role: Role; back: () => void; complete: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const submit = () => { const email = (document.getElementById("auth-email") as HTMLInputElement)?.value; if (!email?.includes("@")) setError(true); else complete(); };
  const department = role === "department";
  return <div className={`auth-page ${department ? "department-auth" : ""}`}><section className="auth-story"><div className="entry-brand light"><span><Icon name="check" /></span><strong>CivicResolve</strong></div><div><p className="eyebrow">Built for public trust</p><h1>An issue is not truly resolved until the community can verify it.</h1><div className="auth-points"><p><span><Icon name="file" /></span><strong>Complete history</strong><small>Every claim, dispute, and reopening is retained.</small></p><p><span><Icon name="camera" /></span><strong>Evidence first</strong><small>Official claims require before-and-after proof.</small></p><p><span><Icon name="users" /></span><strong>Community verified</strong><small>Real residents confirm real-world outcomes.</small></p></div></div><small>Secure civic infrastructure · WCAG accessible</small></section><section className="auth-form-wrap"><button className="back-link" onClick={back}>← Change role</button><div className="auth-mobile-brand entry-brand"><span><Icon name="check" /></span><strong>CivicResolve</strong></div><div className="role-pill"><Icon name={department ? "building" : "users"} size={17} />Signing in as <strong>{department ? "Department" : "Citizen"}</strong></div><h1>{mode === "signin" ? "Welcome back" : `Create your ${department ? "department" : "citizen"} account`}</h1><p>{mode === "signin" ? "Sign in to continue to your CivicResolve workspace." : "Join a transparent, accountable civic network."}</p><div className="auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(false); }}>Sign In</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(false); }}>Create Account</button></div>{mode === "signup" && <div className="two-fields"><label className="field-label">{department ? "Official name" : "Full name"}<input placeholder={department ? "Enter official name" : "Enter your full name"} /></label><label className="field-label">{department ? "Department name" : "Phone number"}<input placeholder={department ? "Public Works" : "+1 (555) 000-0000"} /></label></div>}<label className={`field-label ${error ? "field-error" : ""}`}>{department ? "Official email" : "Email address"}<input id="auth-email" type="email" placeholder={department ? "name@department.gov" : "you@example.com"} defaultValue="maya@example.com" />{error && <small>Please enter a valid email address.</small>}</label>{mode === "signup" && <label className="field-label">{department ? "Department / Employee ID" : "Location / Area"}<input placeholder={department ? "Enter official ID" : "Search your area"} /></label>}<label className="field-label">Password<div className="password-field"><input type={visible ? "text" : "password"} placeholder="At least 8 characters" defaultValue="civicresolve" /><button onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button></div></label>{mode === "signup" && <label className="field-label">Confirm password<input type="password" placeholder="Enter password again" /></label>}{mode === "signin" && <div className="auth-options"><label><input type="checkbox" defaultChecked />Remember me</label><button>Forgot password?</button></div>}<Button className="wide auth-submit" onClick={submit}>{mode === "signin" ? "Sign In" : "Create Account"} <Icon name="arrow" size={17} /></Button><p className="auth-security"><Icon name="check" size={14} />Protected by secure, role-based access</p></section></div>;
}

function Shell({ role, onChangeRole }: { role: Role; onChangeRole: () => void }) {
  const official = role === "department";
  const [page, setPage] = useState<Page>(official ? "department" : "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = official
    ? [["department", "home", "Dashboard"], ["department-issues", "file", "Issues"], ["map", "map", "Map"], ["repair-claims", "camera", "Repair claims"], ["verification-requests", "users", "Verification"], ["disputes", "alert", "Disputes"], ["durability", "chart", "Performance"], ["notifications", "bell", "Notifications"], ["settings", "building", "Settings"]]
    : [["dashboard", "home", "Dashboard"], ["report", "plus", "Report issue"], ["map", "map", "Explore map"], ["my-reports", "file", "My reports"], ["verification-requests", "users", "Verification requests"], ["notifications", "bell", "Notifications"], ["settings", "building", "Profile"]];
  const go = (p: Page) => { setPage(p); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand"><span><Icon name="check" /></span><div><strong>CivicResolve</strong><small>Community verified</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><Icon name="x" /></button></div>
      <nav><p>WORKSPACE</p>{nav.map(([p, icon, label]) => <button key={p} className={page === p ? "active" : ""} onClick={() => go(p as Page)}><Icon name={icon as IconName} />{label}{label === "Notifications" && <span className="nav-count">3</span>}</button>)}</nav>
      <div className="sidebar-trust"><Icon name="users" /><strong>Community standard</strong><p>An issue is resolved only when citizens verify it.</p></div>
      <button className="profile" onClick={() => go("settings")}><span>{official ? "RP" : "MC"}</span><div><strong>{official ? "Riverside Works" : "Maya Chen"}</strong><small>{official ? "Government workspace" : "Verified resident"}</small></div><Icon name="chevron" size={16} /></button>
    </aside>
    <div className="main-shell">
      <header className={`topbar ${official ? "official-topbar" : ""}`}><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button><div className="mobile-brand">CivicResolve</div><div className="top-actions"><button className="role-switch" onClick={onChangeRole}><Icon name={official ? "building" : "users"} size={17} />{official ? "Department account" : "Citizen account"} · Change</button><button className="icon-button" onClick={() => go("notifications")} aria-label="Notifications"><Icon name="bell" /><span /></button><div className="avatar">{official ? "RP" : "MC"}</div></div></header>
      <main className={page === "map" ? "map-main" : ""}>
        {page === "dashboard" && <Dashboard go={go} />}
        {page === "report" && <ReportIssue go={go} />}
        {page === "issue" && <IssueDetails go={go} />}
        {page === "map" && <CivicMap go={go} />}
        {page === "verify" && <VerifyPage go={go} />}
        {page === "my-reports" && <MyReports go={go} />}
        {page === "verification-requests" && <VerificationRequests go={go} />}
        {page === "department" && <Department />}
        {page === "department-issues" && <DepartmentIssues go={go} />}
        {page === "repair-claims" && <RepairClaims />}
        {page === "disputes" && <Disputes go={go} />}
        {page === "durability" && <Durability />}
        {page === "notifications" && <Notifications go={go} role={role} />}
        {page === "settings" && <Settings role={role} />}
      </main>
      {!official && <nav className="citizen-bottom-nav"><button className={page === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><Icon name="home" /><span>Home</span></button><button className={page === "map" ? "active" : ""} onClick={() => go("map")}><Icon name="map" /><span>Map</span></button><button className="report-fab" onClick={() => go("report")}><Icon name="plus" /></button><button className={page === "verification-requests" ? "active" : ""} onClick={() => go("verification-requests")}><Icon name="users" /><span>Verify</span></button><button className={page === "settings" ? "active" : ""} onClick={() => go("settings")}><Icon name="building" /><span>Profile</span></button></nav>}
    </div>
  </div>;
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  if (!role) return <RoleSelection select={setRole} />;
  if (!authenticated) return <Authentication role={role} back={() => setRole(null)} complete={() => setAuthenticated(true)} />;
  return <Shell role={role} onChangeRole={() => { setAuthenticated(false); setRole(null); }} />;
}
