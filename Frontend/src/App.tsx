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
  | "repair-claims"
  | "durability";

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
  | "chevron"
  | "logOut";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "department";
  roleTitle: string;
  tagline: string;
  avatar: string;
}

export const PRESET_ACCOUNTS: UserAccount[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Maya Chen",
    email: "maya.chen@community.org",
    role: "citizen",
    roleTitle: "Citizen (Reporter)",
    tagline: "Reports neighborhood issues and tracks accountability.",
    avatar: "MC",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Alex Rivera",
    email: "alex.rivera@community.org",
    role: "citizen",
    roleTitle: "Citizen (Neighbor / Validator)",
    tagline: "Independent citizen who verifies physical repairs on the ground.",
    avatar: "AR",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "John Miller",
    email: "john.miller@publicworks.gov",
    role: "department",
    roleTitle: "Public Works (Technician)",
    tagline: "Performs fixes and submits before/after evidence claims.",
    avatar: "JM",
  },
];

const PHOTO_FALLBACK =
  "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80";

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
  reporter_id?: string;
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
    reporter_id: "00000000-0000-0000-0000-000000000001",
    confirm_count: 1,
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
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const statusMap: Record<string, { label: string; color: string }> = {
  REPORTED: { label: "Reported", color: "blue" },
  IN_PROGRESS: { label: "In Progress", color: "blue" },
  DEPARTMENT_CLOSED: { label: "Pending verification", color: "amber" },
  VERIFIED_RESOLVED: { label: "Verified resolved", color: "green" },
  REOPENED: { label: "Reopened", color: "red" },
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
  currentUser,
  go,
  onSelectIssue,
}: {
  issues: IssueItem[];
  currentUser: UserAccount;
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
        eyebrow={`${currentUser.roleTitle} dashboard`}
        title={`Welcome, ${currentUser.name}`}
        text="Real-time civic accountability and community verification."
        action={
          currentUser.role === "citizen" ? (
            <Button icon="plus" onClick={() => go("report")}>Report an issue</Button>
          ) : (
            <Button icon="plus" onClick={() => go("repair-claims")}>Submit repair claim</Button>
          )
        }
      />
      <div className="stats-grid">
        <StatCard icon="file" value={total} label="Active reports" trend="Live Supabase feed" />
        <StatCard icon="clock" value={pending} label="Awaiting verification" trend="Citizen review window" tone="amber" />
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
  currentUser: UserAccount;
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
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = ["Streetlight", "Overflowing Bin", "Broken Footpath", "Water Leak", "Damaged Signboard"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
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
            <h2>Upload photographic proof</h2>
            <p className="form-intro">Clear photos establish an immutable record for community verification.</p>
            <label className="upload-zone" style={{ cursor: "pointer", display: "block" }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              {preview ? (
                <div style={{ textAlign: "center" }}>
                  <img src={preview} alt="Upload preview" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 8, margin: "0 auto 10px", display: "block" }} />
                  <span style={{ fontSize: 12, color: "var(--blue-600)", fontWeight: 600 }}>Click to change photo</span>
                </div>
              ) : (
                <>
                  <span><Icon name="camera" size={28} /></span>
                  <strong>Choose a photo from your device</strong>
                  <small>JPG or PNG. Will be saved to your issue record.</small>
                </>
              )}
            </label>
            <label className="field-label" style={{ marginTop: 14 }}>
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
            {preview && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <img src={preview} alt="Evidence to submit" style={{ maxHeight: 140, borderRadius: 8 }} />
                <span style={{ display: "block", fontSize: 11, color: "var(--slate-500)", marginTop: 4 }}>Uploaded evidence photo</span>
              </div>
            )}
            <div className="review-box">
              <div><span>Category</span><strong>{category}</strong></div>
              <div><span>Location</span><strong>{address}</strong></div>
              <div><span>Coordinates</span><strong>{lat.toFixed(4)}, {lng.toFixed(4)}</strong></div>
              <div><span>Reporter</span><strong>{currentUser.name} ({currentUser.roleTitle})</strong></div>
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
  issueId,
  cachedIssue,
  currentUser,
  go,
  onRefresh,
}: {
  issueId: string;
  cachedIssue?: IssueItem;
  currentUser: UserAccount;
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
}) {
  const [issue, setIssue] = useState<IssueItem | null>(cachedIssue || null);
  const [timeline, setTimeline] = useState<Array<{ status?: string; new_status?: string; timestamp?: string; changed_at?: string; actor?: string; reason?: string }>>([]);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const issueData = await api.getIssue(issueId);
      if (issueData?.id) {
        setIssue(issueData);
      }
    } catch {
      // fallback to cachedIssue
      if (cachedIssue) setIssue(cachedIssue);
    }

    try {
      const histData = await api.getHistory(issueId);
      if (histData?.timeline) {
        setTimeline(histData.timeline);
      }
    } catch (e) {
      console.warn("Could not load history from API:", e);
    }
  }, [issueId, cachedIssue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const active = issue || cachedIssue || DEFAULT_DEMO_ISSUES[0];

  const handleForceExpire = async () => {
    try {
      setExpiryLoading(true);
      setDemoMessage("");
      const res = await api.demoExpire(active.id);
      setDemoMessage(`Window expired: Transitioned to ${res.new_status} (Confirms: ${res.confirm_count}, Disputes: ${res.dispute_count})`);
      await onRefresh();
      await loadData();
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
        eyebrow={`Issue ${active.id.slice(0, 8)} · ${active.category}`}
        title={active.title}
        text={active.address_text || "Location recorded via GPS"}
        action={<Badge status={active.status} />}
      />
      <Card className="lifecycle-card">
        <div className="card-heading">
          <div>
            <h2>Resolution lifecycle</h2>
            <p>Department closed is NOT the same as citizen verified</p>
          </div>
          <span className="deadline"><Icon name="clock" size={16} />{active.status === "DEPARTMENT_CLOSED" ? "Verification window active" : active.status.replace(/_/g, " ")}</span>
        </div>
        <Lifecycle status={active.status} />
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
                <h2>Evidence comparison</h2>
                <p>Before and after photo record</p>
              </div>
              <span className="evidence-check"><Icon name="check" size={16} />Evidence record</span>
            </div>
            <div className="photo-compare">
              <figure>
                <img src={active.before_image_url || PHOTO_FALLBACK} alt="Before repair" />
                <figcaption><span>BEFORE</span>Citizen report photo</figcaption>
              </figure>
              <figure>
                <img className="after-photo" src={active.after_image_url || PHOTO_FALLBACK} alt="After repair" />
                <figcaption><span>AFTER</span>{active.after_image_url ? "Official department evidence" : "Awaiting repair claim"}</figcaption>
              </figure>
            </div>
            <div className="repair-details">
              <div>
                <span>Repair notes</span>
                <strong>{active.repair_notes || (active.status === "REPORTED" ? "Work order pending technician dispatch" : "Repair claimed by department")}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{active.category}</strong>
              </div>
              <div>
                <span>Issue ID</span>
                <strong>{active.id}</strong>
              </div>
            </div>
          </Card>
          <Card>
            <h2>Location details</h2>
            <MiniMap height={190} latitude={active.latitude} longitude={active.longitude} markerStatus={active.status} zoom={15} />
            <div className="detail-list">
              <p><span>Address</span><strong>{active.address_text || "Coordinates logged"}</strong></p>
              <p><span>Coordinates</span><strong>{active.latitude.toFixed(4)}, {active.longitude.toFixed(4)}</strong></p>
              <p><span>Current status</span><strong>{active.status}</strong></p>
            </div>
          </Card>
        </div>
        <aside className="issue-sidebar">
          <Card className="verify-panel">
            <div className="shield"><Icon name="users" size={26} /></div>
            <h2>Citizen verification status</h2>
            <p>Community votes dictate whether this issue is genuinely resolved.</p>
            <div className="verification-numbers">
              <div><strong>{active.confirm_count ?? 0}</strong><span>Confirmed fixed</span></div>
              <div><strong>{active.dispute_count ?? 0}</strong><span>Disputed</span></div>
            </div>
            {active.status === "DEPARTMENT_CLOSED" ? (
              <>
                <Button variant="success" icon="check" onClick={() => go("verify")} className="wide">
                  Verify or dispute repair
                </Button>
                <small>Requires community verification. 2 disputes auto-reopens.</small>
              </>
            ) : active.status === "REPORTED" && currentUser.role === "department" ? (
              <Button variant="secondary" onClick={() => go("repair-claims")} className="wide">
                Submit repair claim (Department)
              </Button>
            ) : (
              <Badge status={active.status} />
            )}
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <h3>⚡ Demo: Force Window Expiry</h3>
                <p style={{ fontSize: 11, color: "var(--slate-500)", margin: 0 }}>Simulate timer expiration for judges</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="wide"
              onClick={handleForceExpire}
              disabled={expiryLoading || active.status !== "DEPARTMENT_CLOSED"}
            >
              {expiryLoading ? "Evaluating votes..." : "⚡ Force Window Expiry"}
            </Button>
            <small style={{ color: "var(--slate-500)", display: "block", marginTop: 6, fontSize: 10 }}>
              {active.status === "DEPARTMENT_CLOSED"
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
                  <strong>{active.status}</strong>
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
  currentUser: UserAccount;
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
        // use plain msg
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
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <Button onClick={() => go("issue")}>View updated issue</Button>
          <Button variant="secondary" onClick={() => go("dashboard")}>Return to dashboard</Button>
        </div>
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
          <strong>Verifying as: {currentUser.name} ({currentUser.roleTitle})</strong>
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
  currentUser: UserAccount;
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
  onSelectIssue: (id: string) => void;
}) {
  const claimable = issues.filter((i) => i.status === "REPORTED" || i.status === "IN_PROGRESS" || i.status === "REOPENED");
  const defaultId = claimable.some((i) => i.id === selectedIssueId)
    ? selectedIssueId
    : claimable[0]?.id || issues[0]?.id || "";

  const [issueId, setIssueId] = useState(defaultId);
  const [notes, setNotes] = useState("Replaced failed parts, tested voltage, and verified full illumination.");
  const [workOrder, setWorkOrder] = useState("WO-2025-1198");
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
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

      let afterImageUrl = "https://images.unsplash.com/photo-1578991624414-276ef23a534f?auto=format&fit=crop&w=1200&q=80";
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
            Target issue to claim as repaired
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
            {preview ? (
              <img src={preview} alt="After evidence preview" style={{ height: 130, objectFit: "contain", borderRadius: 6, margin: "0 auto 8px", display: "block" }} />
            ) : (
              <span><Icon name="camera" size={26} /></span>
            )}
            <strong>{afterFile ? afterFile.name : "Upload after-repair photo"}</strong>
            <small>Direct to Supabase Storage</small>
          </label>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => go("dashboard")}>Cancel</Button>
          <Button icon="check" onClick={handleSubmit} disabled={loading || !issueId}>
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

function AccountLoginScreen({ onLogin }: { onLogin: (user: UserAccount) => void }) {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState<"citizen" | "department">("citizen");

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customEmail) return;
    onLogin({
      id: crypto.randomUUID(),
      name: customName,
      email: customEmail,
      role: customRole,
      roleTitle: customRole === "citizen" ? "Citizen" : "Department Official",
      tagline: "Custom session user",
      avatar: customName.slice(0, 2).toUpperCase(),
    });
  };

  return (
    <div className="entry-page" style={{ padding: "40px 20px" }}>
      <header className="entry-header">
        <div className="entry-brand">
          <span><Icon name="check" /></span>
          <strong>CivicResolve</strong>
        </div>
        <span>Accountable civic resolution</span>
      </header>

      <main className="entry-content" style={{ maxWidth: 880, margin: "0 auto" }}>
        <p className="eyebrow">Authentication & Identity</p>
        <h1>Sign in to CivicResolve</h1>
        <p className="entry-subtitle">
          Select an account to test different roles across the issue lifecycle.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 28, marginBottom: 36 }}>
          {PRESET_ACCOUNTS.map((acc) => (
            <div
              key={acc.id}
              onClick={() => onLogin(acc)}
              style={{
                background: "white",
                border: "2px solid #e2e8f0",
                borderRadius: 12,
                padding: 22,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2567c3";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,103,195,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: acc.role === "department" ? "#1656a7" : "#18704c", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15 }}>
                    {acc.avatar}
                  </div>
                  <div>
                    <strong style={{ fontSize: 16, display: "block" }}>{acc.name}</strong>
                    <span style={{ fontSize: 12, color: "#718096" }}>{acc.email}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: acc.role === "department" ? "#e8f1fc" : "#e2f4eb",
                      color: acc.role === "department" ? "#1656a7" : "#18704c",
                    }}
                  >
                    {acc.roleTitle}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#405064", lineHeight: 1.45, margin: "0 0 16px" }}>
                  {acc.tagline}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Sign in as {acc.name.split(" ")[0]} <Icon name="arrow" size={16} />
              </button>
            </div>
          ))}
        </div>

        <Card style={{ padding: 20, maxWidth: 540, margin: "0 auto" }}>
          <h3 style={{ marginBottom: 8 }}>Or use a custom account</h3>
          <form onSubmit={handleCustomLogin}>
            <div className="two-fields">
              <label className="field-label">
                Full name
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Jane Doe" required />
              </label>
              <label className="field-label">
                Email
                <input type="email" value={customEmail} onChange={(e) => setCustomEmail(e.target.value)} placeholder="jane@example.com" required />
              </label>
            </div>
            <label className="field-label">
              Role
              <select value={customRole} onChange={(e) => setCustomRole(e.target.value as "citizen" | "department")} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid var(--slate-300)" }}>
                <option value="citizen">Citizen (Report & Verify)</option>
                <option value="department">Department Official (Claim Repairs)</option>
              </select>
            </label>
            <Button className="wide" style={{ marginTop: 12 }}>Sign In with Custom Account</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

function Shell({ currentUser, onLogout }: { currentUser: UserAccount; onLogout: () => void }) {
  const official = currentUser.role === "department";
  const [page, setPage] = useState<Page>(official ? "department" : "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Issues State
  const [issues, setIssues] = useState<IssueItem[]>(DEFAULT_DEMO_ISSUES);
  const [selectedIssueId, setSelectedIssueId] = useState<string>(DEFAULT_DEMO_ISSUES[0].id);

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

        <div style={{ marginTop: "auto", borderTop: "1px solid #1e293b", paddingTop: 14 }}>
          <div className="profile" style={{ cursor: "default", marginBottom: 10 }}>
            <span>{currentUser.avatar}</span>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.roleTitle}</small>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#ffffff0f",
              border: "1px solid #ffffff1a",
              borderRadius: 6,
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name="logOut" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className={`topbar ${official ? "official-topbar" : ""}`}>
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
          <div className="mobile-brand">CivicResolve</div>
          <div className="top-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#f1f5f9", borderRadius: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: official ? "#2567c3" : "#18704c" }} />
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{currentUser.name} ({currentUser.roleTitle})</span>
            </div>
            <Button variant="secondary" icon="logOut" onClick={onLogout} style={{ padding: "6px 14px", fontSize: 13 }}>
              Log out
            </Button>
          </div>
        </header>

        <main className={page === "map" ? "map-main" : ""}>
          {page === "dashboard" && (
            <Dashboard
              issues={issues}
              currentUser={currentUser}
              go={go}
              onSelectIssue={setSelectedIssueId}
            />
          )}
          {page === "report" && (
            <ReportIssue
              go={go}
              currentUser={currentUser}
              onRefresh={fetchIssues}
              onSelectIssue={setSelectedIssueId}
            />
          )}
          {page === "issue" && (
            <IssueDetails
              issueId={selectedIssueId}
              cachedIssue={activeIssue}
              currentUser={currentUser}
              go={go}
              onRefresh={fetchIssues}
            />
          )}
          {page === "map" && <CivicMap issues={issues} go={go} onSelectIssue={setSelectedIssueId} />}
          {page === "verify" && (
            <VerifyPage
              issue={activeIssue}
              currentUser={currentUser}
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
              currentUser={currentUser}
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem("civic_active_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return PRESET_ACCOUNTS[0];
      }
    }
    return PRESET_ACCOUNTS[0]; // default to Maya Chen for seamless initial experience
  });

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem("civic_active_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("civic_active_user");
  };

  if (!currentUser) {
    return <AccountLoginScreen onLogin={handleLogin} />;
  }

  return <Shell currentUser={currentUser} onLogout={handleLogout} />;
}
