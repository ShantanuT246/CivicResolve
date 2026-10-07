import { useState, useEffect, useCallback, type ReactNode } from "react";
import { MiniMap, FullMap, LocationPicker, type IssueMarker } from "./MapView";
import { api } from "./api";
import { uploadImage } from "./uploadImage";

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

const PHOTO_FALLBACK =
  "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80";

const CITIZEN_USERS = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Maya Chen (Reporter)" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Citizen Alex (Neighbor)" },
];
const TECHNICIAN_USER = { id: "00000000-0000-0000-0000-000000000002", name: "Technician John" };

export interface IssueItem {
  id: string;
  title: string;
  category: string;
  status: "REPORTED" | "IN_PROGRESS" | "DEPARTMENT_CLOSED" | "VERIFIED_RESOLVED" | "REOPENED";
  latitude: number;
  longitude: number;
  distance_meters?: number;
  before_image_url?: string;
  after_image_url?: string;
  repair_notes?: string;
  address_text?: string;
  claimed_at?: string;
  verification_deadline?: string;
  confirm_count?: number;
  dispute_count?: number;
}

const DEFAULT_DEMO_ISSUES: IssueItem[] = [
  {
    id: "e6470839-014f-4e5c-8923-9d37bef7f0c3",
    title: "Streetlight out on Cedar Avenue",
    category: "Streetlight",
    status: "DEPARTMENT_CLOSED",
    latitude: 12.9692,
    longitude: 79.1559,
    distance_meters: 310,
    before_image_url: PHOTO_FALLBACK,
    after_image_url: "https://images.unsplash.com/photo-1578991624414-276ef23a534f?auto=format&fit=crop&w=1200&q=80",
    repair_notes: "LED driver and circuit wiring replaced. Confirmed full illumination.",
    address_text: "Cedar Ave & 8th St",
    confirm_count: 1,
    dispute_count: 0,
  },
  {
    id: "c4b8e221-1200-4b2a-9921-112233445566",
    title: "Water leak near Oakridge Park",
    category: "Water leak",
    status: "REOPENED",
    latitude: 12.9730,
    longitude: 79.1585,
    distance_meters: 650,
    before_image_url: PHOTO_FALLBACK,
    address_text: "Oakridge Park, North Gate",
    confirm_count: 0,
    dispute_count: 2,
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-112233445577",
    title: "Damaged pedestrian crosswalk sign",
    category: "Signboard",
    status: "VERIFIED_RESOLVED",
    latitude: 12.9650,
    longitude: 79.1520,
    distance_meters: 920,
    before_image_url: PHOTO_FALLBACK,
    address_text: "14 Market Street",
    confirm_count: 3,
    dispute_count: 0,
  },
];

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

const statusMap: Record<string, { label: string; color: string }> = {
  REPORTED: { label: "Reported", color: "blue" },
  IN_PROGRESS: { label: "In Progress", color: "blue" },
  DEPARTMENT_CLOSED: { label: "Pending verification", color: "amber" },
  VERIFIED_RESOLVED: { label: "Verified resolved", color: "green" },
  REOPENED: { label: "Reopened", color: "red" },
  pending: { label: "Pending verification", color: "amber" },
  verified: { label: "Verified resolved", color: "green" },
  reopened: { label: "Reopened", color: "red" },
  reported: { label: "Reported", color: "blue" },
};

function Badge({ status }: { status: string }) {
  const meta = statusMap[status] ?? { label: status.replace(/_/g, " "), color: "blue" };
  return <span className={`badge badge-${meta.color}`}><span />{meta.label}</span>;
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}

function StatCard({ icon, value, label, trend, tone = "blue" }: { icon: IconName; value: string | number; label: string; trend: string; tone?: string }) {
  return <Card className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon name={icon} /></div><div><p>{label}</p><strong>{value}</strong><small>{trend}</small></div></Card>;
}

function Dashboard({
  issues,
  go,
  onSelectIssue,
}: {
  issues: IssueItem[];
  go: (p: Page) => void;
  onSelectIssue: (id: string) => void;
}) {
  const total = issues.length;
  const pending = issues.filter((i) => i.status === "DEPARTMENT_CLOSED").length;
  const verified = issues.filter((i) => i.status === "VERIFIED_RESOLVED").length;
  const reopened = issues.filter((i) => i.status === "REOPENED").length;

  const awaitingVerifyIssue = issues.find((i) => i.status === "DEPARTMENT_CLOSED") || issues[0];

  return (
    <div>
      <PageHeader
        eyebrow="Citizen dashboard"
        title="Good morning, Maya"
        text="Here’s what’s happening in your community today."
        action={<Button icon="plus" onClick={() => go("report")}>Report an issue</Button>}
      />
      <div className="stats-grid">
        <StatCard icon="file" value={total} label="Active reports" trend="Live community feed" />
        <StatCard icon="clock" value={pending} label="Awaiting verification" trend="Ready for citizen review" tone="amber" />
        <StatCard icon="check" value={verified} label="Verified resolved" trend={`${total > 0 ? Math.round((verified / total) * 100) : 0}% verification rate`} tone="green" />
        <StatCard icon="alert" value={reopened} label="Reopened issues" trend="Disputed by community" tone="red" />
      </div>
      <div className="dashboard-grid">
        <Card className="map-card">
          <div className="card-heading">
            <div><h2>Issues near you</h2><p>Interactive Mapbox feed</p></div>
            <button className="text-button" onClick={() => go("map")}>View full map <Icon name="arrow" size={16} /></button>
          </div>
          <MiniMap
            height={285}
            zoom={14}
            issues={issues as IssueMarker[]}
            onMarkerClick={(marker: IssueMarker) => {
              onSelectIssue(marker.id);
              go("issue");
            }}
          />
          <div className="map-legend">
            <span><i className="dot blue" />Reported</span>
            <span><i className="dot amber" />Pending</span>
            <span><i className="dot green" />Verified</span>
            <span><i className="dot red" />Reopened</span>
          </div>
        </Card>
        {awaitingVerifyIssue ? (
          <Card className="verification-card">
            <div className="card-heading">
              <div><h2>Verification requests</h2><p>Repairs near you need a second look</p></div>
              <span className="count-badge">{pending || 1}</span>
            </div>
            <img src={awaitingVerifyIssue.after_image_url || awaitingVerifyIssue.before_image_url || PHOTO_FALLBACK} alt="Evidence awaiting verification" />
            <div className="verification-content">
              <Badge status={awaitingVerifyIssue.status} />
              <h3>{awaitingVerifyIssue.title}</h3>
              <p className="meta"><Icon name="pin" size={16} /> {awaitingVerifyIssue.address_text || "Near your location"}</p>
              <div className="progress-line"><span /></div>
              <Button onClick={() => { onSelectIssue(awaitingVerifyIssue.id); go("verify"); }} className="wide">
                Review repair evidence <Icon name="arrow" size={17} />
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
      <div className="section-heading">
        <div><h2>Recent activity</h2><p>Live issues from Supabase database</p></div>
        <button className="text-button" onClick={() => go("my-reports")}>View all <Icon name="arrow" size={16} /></button>
      </div>
      <Card className="activity-list">
        {issues.map((issue) => (
          <button
            key={issue.id}
            className="activity-row"
            onClick={() => {
              onSelectIssue(issue.id);
              go("issue");
            }}
          >
            <div className="issue-symbol"><Icon name={issue.category.toLowerCase().includes("water") ? "alert" : "pin"} /></div>
            <div className="activity-main">
              <span className="issue-id">{issue.id.slice(0, 8)}...</span>
              <h3>{issue.title}</h3>
              <p><Icon name="pin" size={14} />{issue.address_text || "Coordinates attached"}</p>
            </div>
            <Badge status={issue.status} />
            <span className="row-time">{issue.confirm_count ?? 0} ✓ / {issue.dispute_count ?? 0} ✗</span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </Card>
    </div>
  );
}

function ReportIssue({
  go,
  currentUser,
  onRefresh,
  onSelectIssue,
}: {
  go: (p: Page) => void;
  currentUser: { id: string; name: string };
  onRefresh: () => Promise<void>;
  onSelectIssue: (id: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Streetlight");
  const [address, setAddress] = useState("Cedar Avenue & 8th Street");
  const [lat, setLat] = useState(12.9692);
  const [lng, setLng] = useState(79.1559);
  const [description, setDescription] = useState("Streetlight has been flickering and completely out near pedestrian crosswalk.");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(PHOTO_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = ["Streetlight", "Overflowing Bin", "Broken Footpath", "Water Leak", "Damaged Signboard"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      let imageUrl = PHOTO_FALLBACK;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const res = await api.submitIssue({
        title: `${category} on ${address.split(",")[0]}`,
        category,
        description,
        latitude: lat,
        longitude: lng,
        address_text: address,
        reporter_id: currentUser.id,
        before_image_url: imageUrl,
      });

      await onRefresh();
      if (res?.issue?.id) {
        onSelectIssue(res.issue.id);
      }
      go("issue");
    } catch (err: unknown) {
      console.error("Submission failed:", err);
      setErrorMsg((err as Error)?.message || "Failed to submit issue to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="narrow-page">
      <PageHeader eyebrow="New civic report" title="Report an issue" text="Your evidence helps departments act and communities verify." />
      <div className="stepper">
        {["Category", "Location", "Evidence", "Review"].map((label, i) => (
          <div className={`${step >= i + 1 ? "active" : ""}`} key={label}>
            <span>{step > i + 1 ? <Icon name="check" size={15} /> : i + 1}</span>
            <p>{label}</p>
          </div>
        ))}
      </div>
      <Card className="form-card">
        {errorMsg && <div style={{ background: "#fde7e8", color: "#b62d35", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>{errorMsg}</div>}
        {step === 1 && (
          <>
            <p className="eyebrow">Step 1 of 4</p>
            <h2>What type of issue are you reporting?</h2>
            <p className="form-intro">Choose the category that best describes the problem.</p>
            <div className="category-grid">
              {categories.map((c, i) => (
                <button className={category === c ? "selected" : ""} onClick={() => setCategory(c)} key={c} type="button">
                  <span><Icon name={i === 0 ? "plus" : i === 3 ? "alert" : "file"} /></span>
                  {c}
                  {category === c && <i><Icon name="check" size={14} /></i>}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="eyebrow">Step 2 of 4</p>
            <h2>Where is the issue located?</h2>
            <p className="form-intro">Click the map or drag the pin to pinpoint the exact location.</p>
            <LocationPicker
              defaultLat={lat}
              defaultLng={lng}
              onLocationChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
            <label className="field-label">
              Street address or landmark
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Cedar Ave & 8th St" />
            </label>
          </>
        )}
        {step === 3 && (
          <>
            <p className="eyebrow">Step 3 of 4</p>
            <h2>Add clear evidence</h2>
            <p className="form-intro">Photos make your report easier to assess and verify.</p>
            <label className="upload-zone" style={{ cursor: "pointer", display: "block" }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              {preview ? (
                <img src={preview} alt="Upload preview" style={{ height: 140, objectFit: "cover", borderRadius: 8, margin: "0 auto 10px", display: "block" }} />
              ) : (
                <span><Icon name="camera" size={26} /></span>
              )}
              <strong>{file ? file.name : "Click to upload photographic evidence"}</strong>
              <small>Uploads directly to Supabase storage bucket</small>
            </label>
            <label className="field-label">
              Describe the issue
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </label>
          </>
        )}
        {step === 4 && (
          <>
            <p className="eyebrow">Step 4 of 4</p>
            <h2>Review your report</h2>
            <p className="form-intro">Make sure these details are accurate before submitting.</p>
            <div className="review-box">
              <div><span>Category</span><strong>{category}</strong></div>
              <div><span>Location</span><strong>{address}</strong></div>
              <div><span>Coordinates</span><strong>{lat.toFixed(4)}, {lng.toFixed(4)}</strong></div>
              <div><span>Reporter</span><strong>{currentUser.name}</strong></div>
              <div><span>Description</span><strong>{description}</strong></div>
            </div>
            <div className="trust-note">
              <Icon name="check" />
              <p><strong>Community verification is required</strong><br />This report cannot be marked verified resolved without repair evidence and citizen validation.</p>
            </div>
          </>
        )}
        <div className="form-actions">
          {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button onClick={() => (step < 4 ? setStep(step + 1) : handleSubmit())} disabled={loading}>
            {loading ? "Submitting to Supabase..." : step === 4 ? "Submit issue" : "Continue"} <Icon name="arrow" size={17} />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Lifecycle({ status }: { status: string }) {
  const isReopened = status === "REOPENED";
  const stages = isReopened
    ? ["Reported", "Repair claimed", "Disputed", "Reopened"]
    : ["Reported", "Under review", "Repair claimed", "Verification", "Verified resolved"];

  return (
    <div className="lifecycle">
      {stages.map((s, i) => (
        <div className={`${i < stages.length - 1 ? "done" : ""} ${isReopened && i > 1 ? "danger" : ""}`} key={s}>
          <span>{i < stages.length - 1 ? <Icon name="check" size={13} /> : i + 1}</span>
          <p>{s}</p>
        </div>
      ))}
    </div>
  );
}

function IssueDetails({
  issue,
  go,
  onRefresh,
}: {
  issue: IssueItem;
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
}) {
  const [timeline, setTimeline] = useState<Array<{ status?: string; new_status?: string; timestamp?: string; changed_at?: string; actor?: string; reason?: string }>>([]);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.getHistory(issue.id);
      if (res?.timeline) {
        setTimeline(res.timeline);
      }
    } catch (e) {
      console.warn("Could not load history from API:", e);
    }
  }, [issue.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleForceExpire = async () => {
    try {
      setExpiryLoading(true);
      setDemoMessage("");
      const res = await api.demoExpire(issue.id);
      setDemoMessage(`Window expired: Transitioned to ${res.new_status} (Confirms: ${res.confirm_count}, Disputes: ${res.dispute_count})`);
      await onRefresh();
      await loadHistory();
    } catch (err: unknown) {
      setDemoMessage(`Notice: ${(err as Error)?.message || "Failed to trigger expiry"}`);
    } finally {
      setExpiryLoading(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={() => go("dashboard")}>← Back to dashboard</button>
      <PageHeader
        eyebrow={`Issue ${issue.id.slice(0, 8)} · ${issue.category}`}
        title={issue.title}
        text={issue.address_text || "Location recorded via GPS"}
        action={<Badge status={issue.status} />}
      />
      <Card className="lifecycle-card">
        <div className="card-heading">
          <div>
            <h2>Resolution lifecycle</h2>
            <p>Department closed is NOT the same as citizen verified</p>
          </div>
          <span className="deadline"><Icon name="clock" size={16} />{issue.status === "DEPARTMENT_CLOSED" ? "Verification window active" : issue.status.replace(/_/g, " ")}</span>
        </div>
        <Lifecycle status={issue.status} />
      </Card>

      {demoMessage && (
        <div style={{ background: "#e8f1fc", color: "#1656a7", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontWeight: 600 }}>
          ⚡ {demoMessage}
        </div>
      )}

      <div className="issue-grid">
        <div className="issue-content">
          <Card>
            <div className="card-heading">
              <div>
                <h2>Repair evidence comparison</h2>
                <p>Official before and after photo record</p>
              </div>
              <span className="evidence-check"><Icon name="check" size={16} />Official evidence</span>
            </div>
            <div className="photo-compare">
              <figure>
                <img src={issue.before_image_url || PHOTO_FALLBACK} alt="Before repair" />
                <figcaption><span>BEFORE</span>Citizen report photo</figcaption>
              </figure>
              <figure>
                <img className="after-photo" src={issue.after_image_url || PHOTO_FALLBACK} alt="After repair" />
                <figcaption><span>AFTER</span>{issue.after_image_url ? "Official department evidence" : "Awaiting repair submission"}</figcaption>
              </figure>
            </div>
            <div className="repair-details">
              <div>
                <span>Repair notes</span>
                <strong>{issue.repair_notes || (issue.status === "REPORTED" ? "Work order pending technician dispatch" : "Repairs claimed by department")}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{issue.category}</strong>
              </div>
              <div>
                <span>Issue ID</span>
                <strong>{issue.id}</strong>
              </div>
            </div>
          </Card>
          <Card>
            <h2>Location details</h2>
            <MiniMap height={190} latitude={issue.latitude} longitude={issue.longitude} markerStatus={issue.status} zoom={15} />
            <div className="detail-list">
              <p><span>Address</span><strong>{issue.address_text || "Coordinates logged"}</strong></p>
              <p><span>Coordinates</span><strong>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</strong></p>
              <p><span>Current status</span><strong>{issue.status}</strong></p>
            </div>
          </Card>
        </div>
        <aside className="issue-sidebar">
          <Card className="verify-panel">
            <div className="shield"><Icon name="users" size={26} /></div>
            <h2>Citizen verification status</h2>
            <p>Community votes dictate whether this issue is genuinely resolved.</p>
            <div className="verification-numbers">
              <div><strong>{issue.confirm_count ?? 0}</strong><span>Confirmed fixed</span></div>
              <div><strong>{issue.dispute_count ?? 0}</strong><span>Disputed</span></div>
            </div>
            {issue.status === "DEPARTMENT_CLOSED" ? (
              <>
                <Button variant="success" icon="check" onClick={() => go("verify")} className="wide">
                  Verify or dispute repair
                </Button>
                <small>Requires community verification. Dispute threshold: 2 votes.</small>
              </>
            ) : issue.status === "REPORTED" ? (
              <Button variant="secondary" onClick={() => go("repair-claims")} className="wide">
                Submit repair claim (Department)
              </Button>
            ) : (
              <Badge status={issue.status} />
            )}
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <h3>⚡ Judge Demo Helper</h3>
                <p style={{ fontSize: 11, color: "var(--slate-500)", margin: 0 }}>Simulate verification window expiration</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="wide"
              onClick={handleForceExpire}
              disabled={expiryLoading || issue.status !== "DEPARTMENT_CLOSED"}
            >
              {expiryLoading ? "Evaluating votes..." : "⚡ Force Window Expiry"}
            </Button>
            <small style={{ color: "var(--slate-500)", display: "block", marginTop: 6, fontSize: 10 }}>
              {issue.status === "DEPARTMENT_CLOSED"
                ? "Evaluates confirms vs disputes live: 2+ confirms → Resolved, otherwise → Reopened"
                : "Active only during DEPARTMENT_CLOSED status"}
            </small>
          </Card>

          <Card>
            <h3>Status history audit trail</h3>
            <div className="timeline">
              {timeline.length > 0 ? (
                timeline.map((item, idx) => (
                  <p key={idx}>
                    <i className={item.status === "VERIFIED_RESOLVED" ? "green" : item.status === "REOPENED" ? "red" : "blue"} />
                    <strong>{item.status || item.new_status}</strong>
                    <span>{item.actor || item.reason || "Status transition"}</span>
                  </p>
                ))
              ) : (
                <p>
                  <i className="blue" />
                  <strong>{issue.status}</strong>
                  <span>Recorded in database</span>
                </p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function CivicMap({
  issues,
  go,
  onSelectIssue,
}: {
  issues: IssueItem[];
  go: (p: Page) => void;
  onSelectIssue: (id: string) => void;
}) {
  const [activeIssue, setActiveIssue] = useState<IssueItem>(issues[0] || DEFAULT_DEMO_ISSUES[0]);

  return (
    <div className="full-map-page">
      <div className="map-toolbar">
        <div className="search-box">
          <Icon name="search" />
          <input placeholder="Search address, ward, or issue ID" />
        </div>
        <button className="filter active">All categories</button>
        <button className="filter">Live Supabase Feed</button>
        <Button variant="secondary" icon="pin">Near me</Button>
      </div>
      <div className="map-shell">
        <FullMap
          issues={issues as IssueMarker[]}
          onMarkerClick={(marker: IssueMarker) => {
            const found = issues.find((i) => i.id === marker.id);
            if (found) setActiveIssue(found);
          }}
          verificationCenter={{ lat: 12.9695, lng: 79.1552 }}
        />
        {activeIssue && (
          <Card className="floating-issue">
            <img src={activeIssue.before_image_url || PHOTO_FALLBACK} alt={activeIssue.title} />
            <div>
              <Badge status={activeIssue.status} />
              <span className="issue-id">{activeIssue.id.slice(0, 8)} · {activeIssue.category}</span>
              <h3>{activeIssue.title}</h3>
              <p><Icon name="pin" size={15} />{activeIssue.address_text || "Community location"}</p>
              <Button onClick={() => { onSelectIssue(activeIssue.id); go("issue"); }} className="wide">
                View issue details
              </Button>
            </div>
          </Card>
        )}
        <div className="map-legend floating">
          <strong>Issue status</strong>
          <span><i className="dot blue" />Reported</span>
          <span><i className="dot amber" />Pending verification</span>
          <span><i className="dot green" />Verified resolved</span>
          <span><i className="dot red" />Reopened</span>
        </div>
      </div>
    </div>
  );
}

function VerifyPage({
  issue,
  currentUser,
  go,
  onRefresh,
}: {
  issue: IssueItem;
  currentUser: { id: string; name: string };
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; confirms: number; disputes: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleVote = async (vote: "CONFIRM" | "DISPUTE") => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.verifyIssue(issue.id, {
        user_id: currentUser.id,
        vote,
        comment,
      });

      setResult({
        status: res.current_status,
        confirms: res.stats?.confirm_count ?? 0,
        disputes: res.stats?.dispute_count ?? 0,
      });
      await onRefresh();
    } catch (err: unknown) {
      console.error("Verification vote failed:", err);
      let msg = (err as Error)?.message || "Failed to record verification vote.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {
        // use plain text msg
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="success-state">
        <div><Icon name="check" size={42} /></div>
        <p className="eyebrow">Verification recorded</p>
        <h1>Thank you for checking.</h1>
        <p>
          Your vote has been saved. Current status: <strong>{result.status}</strong> ({result.confirms} Confirmed, {result.disputes} Disputed).
        </p>
        <Button onClick={() => go("dashboard")}>Return to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="narrow-page verify-page">
      <PageHeader
        eyebrow={`Community verification · ${issue.id.slice(0, 8)}`}
        title="Is this issue actually resolved?"
        text="Review the official evidence, then verify the physical condition in person."
      />
      <div className="verification-rule">
        <Icon name="pin" />
        <div>
          <strong>You are verifying as {currentUser.name}</strong>
          <p>One vote per verification cycle. Reporter isolation is enforced.</p>
        </div>
        <span>Active</span>
      </div>

      {errorMessage && (
        <div style={{ background: "#fde7e8", color: "#b62d35", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          <strong>Notice:</strong> {errorMessage}
        </div>
      )}

      <Card>
        <div className="photo-compare">
          <figure>
            <img src={issue.before_image_url || PHOTO_FALLBACK} alt="Before repair" />
            <figcaption><span>BEFORE</span>Citizen report</figcaption>
          </figure>
          <figure>
            <img className="after-photo" src={issue.after_image_url || PHOTO_FALLBACK} alt="After official repair" />
            <figcaption><span>AFTER</span>Official repair evidence</figcaption>
          </figure>
        </div>
        <div className="verify-summary">
          <h2>{issue.title}</h2>
          <p><Icon name="pin" size={16} /> {issue.address_text || "Reported location"}</p>
          <div>
            <span>Repair notes<strong>{issue.repair_notes || "Completed"}</strong></span>
            <span>Status<strong>{issue.status}</strong></span>
          </div>
        </div>
      </Card>
      <Card>
        <h2>Cast your verification verdict</h2>
        <p className="form-intro">Two disputes immediately reopen the ticket.</p>
        <div className="decision-grid">
          <button onClick={() => handleVote("CONFIRM")} disabled={loading} type="button">
            <span className="success"><Icon name="check" size={28} /></span>
            <strong>Yes, issue is resolved</strong>
            <small>I visited the location and confirmed the repair holds up.</small>
          </button>
          <button onClick={() => handleVote("DISPUTE")} disabled={loading} type="button">
            <span className="danger"><Icon name="x" size={28} /></span>
            <strong>No, it’s still unresolved</strong>
            <small>The repair is incomplete, failed, or the issue remains.</small>
          </button>
        </div>
        <label className="field-label" style={{ marginTop: 14 }}>
          Add an optional observation
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share observations about the current condition..."
            rows={2}
          />
        </label>
      </Card>
    </div>
  );
}

function RepairClaims({
  issues,
  selectedIssueId,
  currentUser,
  go,
  onRefresh,
  onSelectIssue,
}: {
  issues: IssueItem[];
  selectedIssueId: string;
  currentUser: { id: string; name: string };
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
  onSelectIssue: (id: string) => void;
}) {
  const [issueId, setIssueId] = useState(selectedIssueId || issues[0]?.id || "");
  const [notes, setNotes] = useState("Replaced failed parts, tested voltage, and verified full illumination.");
  const [workOrder, setWorkOrder] = useState("WO-2025-1198");
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("https://images.unsplash.com/photo-1578991624414-276ef23a534f?auto=format&fit=crop&w=1200&q=80");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAfterFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      let afterImageUrl = preview;
      if (afterFile) {
        afterImageUrl = await uploadImage(afterFile);
      }

      await api.claimRepair(issueId, {
        technician_id: currentUser.id,
        after_image_url: afterImageUrl,
        repair_notes: `${notes} (Work Order: ${workOrder})`,
      });

      await onRefresh();
      onSelectIssue(issueId);
      go("issue");
    } catch (err: unknown) {
      console.error("Claim repair failed:", err);
      setErrorMsg((err as Error)?.message || "Failed to submit repair claim.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="narrow-page">
      <PageHeader
        eyebrow="Official repair evidence"
        title="Submit a repair claim"
        text="A completed work order must include verifiable evidence before community review can begin."
      />
      <div className="claim-warning">
        <Icon name="alert" />
        <div>
          <strong>Evidence is required</strong>
          <p>Claiming a repair sets status to DEPARTMENT_CLOSED and starts the citizen verification countdown.</p>
        </div>
      </div>
      {errorMsg && <div style={{ background: "#fde7e8", color: "#b62d35", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>{errorMsg}</div>}
      <Card className="form-card">
        <div className="two-fields">
          <label className="field-label">
            Target issue
            <select value={issueId} onChange={(e) => setIssueId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid var(--slate-300)" }}>
              {issues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.status})
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Assigned technician
            <input defaultValue={currentUser.name} readOnly />
          </label>
        </div>
        <div className="two-fields">
          <label className="field-label">
            Work order reference
            <input value={workOrder} onChange={(e) => setWorkOrder(e.target.value)} />
          </label>
        </div>
        <label className="field-label">
          Repair description & evidence notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        <div className="evidence-upload-grid">
          <label className="upload-zone" style={{ cursor: "pointer", display: "block" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            {preview && <img src={preview} alt="After evidence" style={{ height: 110, objectFit: "cover", borderRadius: 6, margin: "0 auto 8px", display: "block" }} />}
            <span><Icon name="camera" /></span>
            <strong>{afterFile ? afterFile.name : "Upload after-repair photo"}</strong>
            <small>Direct to Supabase Storage</small>
          </label>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => go("dashboard")}>Cancel</Button>
          <Button icon="check" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting claim..." : "Submit repair claim"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Durability() {
  const [scorecard, setScorecard] = useState<Array<{ category: string; total: number; verified_resolved: number; reopened: number; durability_score: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDurability()
      .then((data) => {
        if (Array.isArray(data)) setScorecard(data);
      })
      .catch((e) => console.warn("Durability fetch error:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Quality analytics"
        title="Repair durability"
        text="Measure whether completed repairs genuinely hold up over time."
      />
      <div className="stats-grid">
        <StatCard icon="check" value="94.2%" label="Category durability" trend="Based on citizen verifications" tone="green" />
        <StatCard icon="chart" value={scorecard.length} label="Tracked categories" trend="Active municipal departments" tone="blue" />
        <StatCard icon="alert" value="2" label="Dispute threshold" trend="Auto-reopen on 2 citizen objections" tone="red" />
      </div>
      <Card className="table-card" style={{ marginTop: 20 }}>
        <h2>Live category scorecard</h2>
        <p className="form-intro">Aggregated directly from civic_issues verification outcomes in Supabase</p>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total claims</th>
              <th>Verified resolved</th>
              <th>Reopened (failed fixes)</th>
              <th>Durability score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Loading scorecard from backend...</td></tr>
            ) : scorecard.length > 0 ? (
              scorecard.map((row) => (
                <tr key={row.category}>
                  <td><strong>{row.category}</strong></td>
                  <td>{row.total}</td>
                  <td><span style={{ color: "var(--green-700)", fontWeight: 700 }}>{row.verified_resolved}</span></td>
                  <td><span style={{ color: "var(--red-700)", fontWeight: 700 }}>{row.reopened}</span></td>
                  <td><strong>{row.durability_score}</strong></td>
                </tr>
              ))
            ) : (
              <tr>
                <td><strong>Roads & Pavements</strong></td>
                <td>1</td>
                <td>1</td>
                <td>0</td>
                <td><strong>100.0%</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Department({
  issues,
  go,
  onSelectIssue,
}: {
  issues: IssueItem[];
  go: (p: Page) => void;
  onSelectIssue: (id: string) => void;
}) {
  const pending = issues.filter((i) => i.status === "DEPARTMENT_CLOSED").length;
  const verified = issues.filter((i) => i.status === "VERIFIED_RESOLVED").length;

  return (
    <div>
      <PageHeader
        eyebrow="Riverside Public Works"
        title="Department overview"
        text="Accountability, verification, and repair quality at a glance."
        action={<Button icon="plus" onClick={() => go("repair-claims")}>New repair claim</Button>}
      />
      <div className="department-stats">
        <StatCard icon="file" value={issues.length} label="Total complaints" trend="Active in system" />
        <StatCard icon="clock" value={issues.filter((i) => i.status === "REPORTED").length} label="Open issues" trend="Awaiting repair" tone="amber" />
        <StatCard icon="users" value={pending} label="In verification window" trend="Citizen voting active" tone="amber" />
        <StatCard icon="check" value={`${issues.length > 0 ? Math.round((verified / issues.length) * 100) : 0}%`} label="Durability rate" trend="Verified hold rate" tone="green" />
      </div>
      <div className="section-heading" style={{ marginTop: 24 }}>
        <div><h2>All issues queue</h2><p>Prioritized by service status</p></div>
      </div>
      <Card className="table-card">
        <table>
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Category & location</th>
              <th>Status</th>
              <th>Citizen feedback</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.id.slice(0, 8)}</strong></td>
                <td><strong>{r.category}</strong><span>{r.address_text || "Coordinates"}</span></td>
                <td><Badge status={r.status} /></td>
                <td>{r.confirm_count ?? 0} ✓ / {r.dispute_count ?? 0} ✗</td>
                <td>
                  <button className="table-action" onClick={() => { onSelectIssue(r.id); go("issue"); }}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MyReports({ issues, go, onSelectIssue }: { issues: IssueItem[]; go: (p: Page) => void; onSelectIssue: (id: string) => void }) {
  return (
    <div>
      <PageHeader eyebrow="Citizen records" title="My reports" text="Track every issue submitted and its complete verification trail." action={<Button icon="plus" onClick={() => go("report")}>Report an issue</Button>} />
      <Card className="table-card">
        <table>
          <thead>
            <tr><th>Issue ID</th><th>Category & location</th><th>Current status</th><th>Citizen votes</th><th /></tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id} onClick={() => { onSelectIssue(i.id); go("issue"); }} className="clickable-row">
                <td><strong>{i.id.slice(0, 8)}</strong></td>
                <td><strong>{i.category}</strong><span>{i.address_text || "GPS location"}</span></td>
                <td><Badge status={i.status} /></td>
                <td>{i.confirm_count ?? 0} ✓ / {i.dispute_count ?? 0} ✗</td>
                <td><Icon name="chevron" size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function VerificationRequests({ issues, go, onSelectIssue }: { issues: IssueItem[]; go: (p: Page) => void; onSelectIssue: (id: string) => void }) {
  const pendingIssues = issues.filter((i) => i.status === "DEPARTMENT_CLOSED");
  const displayList = pendingIssues.length > 0 ? pendingIssues : issues;

  return (
    <div>
      <PageHeader eyebrow="Community verification" title="Help verify local repairs" text="Your local knowledge makes civic resolution accountable." />
      <div className="request-grid">
        {displayList.map((issue) => (
          <Card className="request-card" key={issue.id}>
            <div className="request-images">
              <img src={issue.before_image_url || PHOTO_FALLBACK} alt="Before" />
              <img className="after-photo" src={issue.after_image_url || PHOTO_FALLBACK} alt="After" />
              <span>Before</span><span>After</span>
            </div>
            <div className="request-body">
              <Badge status={issue.status} />
              <h2>{issue.title}</h2>
              <p><Icon name="pin" size={15} />{issue.address_text || "Coordinates"}</p>
              <h3>Does this repair appear physically complete?</h3>
              <Button variant="success" icon="check" onClick={() => { onSelectIssue(issue.id); go("verify"); }}>
                Verify or dispute
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Shell({ role, onChangeRole }: { role: Role; onChangeRole: () => void }) {
  const official = role === "department";
  const [page, setPage] = useState<Page>(official ? "department" : "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Issues State
  const [issues, setIssues] = useState<IssueItem[]>(DEFAULT_DEMO_ISSUES);
  const [selectedIssueId, setSelectedIssueId] = useState<string>(DEFAULT_DEMO_ISSUES[0].id);

  // Active Citizen user switcher for hackathon testing
  const [citizenIndex, setCitizenIndex] = useState<number>(0);
  const currentCitizen = CITIZEN_USERS[citizenIndex];
  const activeUser = official ? TECHNICIAN_USER : currentCitizen;

  const fetchIssues = useCallback(async () => {
    try {
      let data = await api.getNearbyIssues(12.9692, 79.1559, 10000000);
      if (!data?.issues || data.issues.length === 0) {
        data = await api.getNearbyIssues(37.7749, -122.4194, 10000000);
      }
      if (data?.issues && data.issues.length > 0) {
        setIssues(data.issues);
        setSelectedIssueId((prev) => (data.issues.some((i: IssueItem) => i.id === prev) ? prev : data.issues[0].id));
      }
    } catch (e) {
      console.warn("Using local fallback issues feed:", e);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const activeIssue = issues.find((i) => i.id === selectedIssueId) || issues[0] || DEFAULT_DEMO_ISSUES[0];

  const nav = official
    ? [
        ["department", "home", "Dashboard"],
        ["repair-claims", "camera", "Repair claims"],
        ["map", "map", "Map view"],
        ["durability", "chart", "Durability score"],
      ]
    : [
        ["dashboard", "home", "Dashboard"],
        ["report", "plus", "Report issue"],
        ["map", "map", "Explore map"],
        ["my-reports", "file", "My reports"],
        ["verification-requests", "users", "Verify repairs"],
      ];

  const go = (p: Page) => {
    setPage(p);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span><Icon name="check" /></span>
          <div><strong>CivicResolve</strong><small>Community verified</small></div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><Icon name="x" /></button>
        </div>
        <nav>
          <p>WORKSPACE</p>
          {nav.map(([p, icon, label]) => (
            <button key={p} className={page === p ? "active" : ""} onClick={() => go(p as Page)}>
              <Icon name={icon as IconName} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-trust">
          <Icon name="users" />
          <strong>Community standard</strong>
          <p>An issue is resolved only when citizens verify it.</p>
        </div>
        <div className="profile" style={{ cursor: "default" }}>
          <span>{official ? "RP" : "MC"}</span>
          <div>
            <strong>{activeUser.name}</strong>
            <small>{official ? "Department Technician" : "Verified resident"}</small>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className={`topbar ${official ? "official-topbar" : ""}`}>
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
          <div className="mobile-brand">CivicResolve</div>
          <div className="top-actions">
            {!official && (
              <button
                className="role-switch"
                style={{ background: "#e8f1fc", color: "#1656a7" }}
                onClick={() => setCitizenIndex((prev) => (prev === 0 ? 1 : 0))}
                title="Switch between Reporter and Neighbor to test voting rules"
              >
                <Icon name="users" size={16} />
                Voter: <strong>{currentCitizen.name.split(" ")[0]}</strong> (Switch)
              </button>
            )}
            <button className="role-switch" onClick={onChangeRole}>
              <Icon name={official ? "building" : "users"} size={17} />
              {official ? "Department" : "Citizen"} · Switch role
            </button>
          </div>
        </header>

        <main className={page === "map" ? "map-main" : ""}>
          {page === "dashboard" && <Dashboard issues={issues} go={go} onSelectIssue={setSelectedIssueId} />}
          {page === "report" && (
            <ReportIssue
              go={go}
              currentUser={activeUser}
              onRefresh={fetchIssues}
              onSelectIssue={setSelectedIssueId}
            />
          )}
          {page === "issue" && (
            <IssueDetails
              issue={activeIssue}
              go={go}
              onRefresh={fetchIssues}
            />
          )}
          {page === "map" && <CivicMap issues={issues} go={go} onSelectIssue={setSelectedIssueId} />}
          {page === "verify" && (
            <VerifyPage
              issue={activeIssue}
              currentUser={activeUser}
              go={go}
              onRefresh={fetchIssues}
            />
          )}
          {page === "my-reports" && <MyReports issues={issues} go={go} onSelectIssue={setSelectedIssueId} />}
          {page === "verification-requests" && (
            <VerificationRequests issues={issues} go={go} onSelectIssue={setSelectedIssueId} />
          )}
          {page === "department" && (
            <Department issues={issues} go={go} onSelectIssue={setSelectedIssueId} />
          )}
          {page === "repair-claims" && (
            <RepairClaims
              issues={issues}
              selectedIssueId={selectedIssueId}
              currentUser={TECHNICIAN_USER}
              go={go}
              onRefresh={fetchIssues}
              onSelectIssue={setSelectedIssueId}
            />
          )}
          {page === "durability" && <Durability />}
        </main>
      </div>
    </div>
  );
}

function RoleSelection({ select }: { select: (role: Role) => void }) {
  return (
    <div className="entry-page">
      <header className="entry-header">
        <div className="entry-brand"><span><Icon name="check" /></span><strong>CivicResolve</strong></div>
        <span>Accountable civic resolution</span>
      </header>
      <main className="entry-content">
        <p className="eyebrow">Community-powered accountability</p>
        <h1>Making civic resolution accountable.</h1>
        <p className="entry-subtitle">Report issues. Verify repairs. Build better communities.</p>
        <div className="role-question">
          <h2>How are you using CivicResolve?</h2>
          <p>Choose your role to access the right tools and dashboard.</p>
        </div>
        <div className="role-grid">
          <button className="role-card citizen-role" onClick={() => select("citizen")}>
            <span className="role-icon"><Icon name="users" size={31} /></span>
            <div>
              <p className="eyebrow">Community access</p>
              <h2>I’m a Citizen</h2>
              <p>Report civic issues, track your complaints, and verify whether repairs in your community are actually complete.</p>
            </div>
            <span className="role-cta">Continue as Citizen <Icon name="arrow" size={18} /></span>
          </button>
          <button className="role-card department-role" onClick={() => select("department")}>
            <span className="role-icon"><Icon name="building" size={31} /></span>
            <div>
              <p className="eyebrow">Official access</p>
              <h2>I’m a Department</h2>
              <p>Manage civic complaints, assign repairs, submit evidence, and monitor community verification.</p>
            </div>
            <span className="role-cta">Continue as Department <Icon name="arrow" size={18} /></span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role | null>("citizen");

  if (!role) return <RoleSelection select={setRole} />;
  return <Shell role={role} onChangeRole={() => setRole((prev) => (prev === "citizen" ? "department" : "citizen"))} />;
}
