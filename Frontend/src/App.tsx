import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
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

const PRESET_ACCOUNTS: UserAccount[] = [
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

interface IssueItem {
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

const DEFAULT_DEMO_ISSUES: IssueItem[] = [];

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
  style,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} style={style}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <section className={`card ${className}`} style={style}>{children}</section>;
}

function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}

function StatCard({
  icon,
  value,
  label,
  trend,
  tone = "blue",
  active = false,
  onClick,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  trend: string;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        border: active ? "2px solid #2567c3" : "2px solid transparent",
        borderRadius: 12,
        boxShadow: active ? "0 4px 14px rgba(37,103,195,0.2)" : undefined,
        transform: active ? "translateY(-2px)" : undefined,
        transition: "all 0.15s ease",
      }}
    >
      <Card className="stat-card">
        <div className={`stat-icon tone-${tone}`}><Icon name={icon} /></div>
        <div>
          <p>{label}</p>
          <strong>{value}</strong>
          <small>{trend}</small>
        </div>
      </Card>
    </div>
  );
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
  const [filter, setFilter] = useState<"ALL" | "DEPARTMENT_CLOSED" | "VERIFIED_RESOLVED" | "REOPENED">("ALL");
  const [scope, setScope] = useState<"ALL" | "MY">("ALL");

  const myCount = useMemo(() => {
    return issues.filter((i) => i.reporter_id === currentUser.id).length;
  }, [issues, currentUser.id]);

  const scopedIssues = useMemo(() => {
    if (scope === "MY") {
      return issues.filter((i) => i.reporter_id === currentUser.id);
    }
    return issues;
  }, [issues, scope, currentUser.id]);

  const total = scopedIssues.length;
  const pending = scopedIssues.filter((i) => i.status === "DEPARTMENT_CLOSED").length;
  const verified = scopedIssues.filter((i) => i.status === "VERIFIED_RESOLVED").length;
  const reopened = scopedIssues.filter((i) => i.status === "REOPENED").length;

  const filteredIssues = scopedIssues.filter((i) => {
    if (filter === "ALL") return true;
    return i.status === filter;
  });

  const awaitingVerifyIssue = scopedIssues.find((i) => i.status === "DEPARTMENT_CLOSED") || scopedIssues[0];

  const filterTitle =
    scope === "MY"
      ? (filter === "ALL" ? "My submitted reports" : `My ${filter.replace(/_/g, " ")} reports`)
      : (filter === "ALL"
          ? "All community reports"
          : filter === "DEPARTMENT_CLOSED"
          ? "Issues awaiting citizen verification"
          : filter === "VERIFIED_RESOLVED"
          ? "Verified resolved issues"
          : "Reopened (failed repairs)");

  return (
    <div>
      <PageHeader
        eyebrow={`${currentUser.roleTitle} dashboard`}
        title={`Welcome, ${currentUser.name}`}
        text={scope === "MY" ? "Viewing only reports submitted by your account." : "Click any metric card below to filter the reports list."}
        action={
          currentUser.role === "citizen" ? (
            <Button icon="plus" onClick={() => go("report")}>Report an issue</Button>
          ) : (
            <Button icon="plus" onClick={() => go("repair-claims")}>Submit repair claim</Button>
          )
        }
      />
      {currentUser.role === "citizen" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className={`filter ${scope === "ALL" ? "active" : ""}`}
            onClick={() => { setScope("ALL"); setFilter("ALL"); }}
          >
            🌐 Community feed ({issues.length})
          </button>
          <button
            className={`filter ${scope === "MY" ? "active" : ""}`}
            onClick={() => { setScope("MY"); setFilter("ALL"); }}
          >
            👤 My submissions only ({myCount})
          </button>
        </div>
      )}
      <div className="stats-grid">
        <StatCard
          icon="file"
          value={total}
          label="Active reports"
          trend="Click to show all"
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        />
        <StatCard
          icon="clock"
          value={pending}
          label="Awaiting verification"
          trend="Click to filter"
          tone="amber"
          active={filter === "DEPARTMENT_CLOSED"}
          onClick={() => setFilter("DEPARTMENT_CLOSED")}
        />
        <StatCard
          icon="check"
          value={verified}
          label="Verified resolved"
          trend="Click to filter"
          tone="green"
          active={filter === "VERIFIED_RESOLVED"}
          onClick={() => setFilter("VERIFIED_RESOLVED")}
        />
        <StatCard
          icon="alert"
          value={reopened}
          label="Reopened issues"
          trend="Click to filter"
          tone="red"
          active={filter === "REOPENED"}
          onClick={() => setFilter("REOPENED")}
        />
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
              <div><h2>Verification spotlight</h2><p>Official evidence ready for citizen review</p></div>
              <span className="count-badge">{pending || (issues.length ? 1 : 0)}</span>
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

      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>{filterTitle} ({filteredIssues.length})</h2>
          <p>{filter !== "ALL" ? `Filtered by ${filter.replace(/_/g, " ")}` : "All reports from database"}</p>
        </div>
        {filter !== "ALL" && (
          <button className="text-button" onClick={() => setFilter("ALL")}>
            Show all ({total})
          </button>
        )}
      </div>

      {filteredIssues.length > 0 ? (
        <Card className="activity-list">
          {filteredIssues.map((issue) => (
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
      ) : (
        <Card style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
          <div style={{ width: 44, height: 44, margin: "0 auto 12px", background: "#f1f5f9", borderRadius: "50%", display: "grid", placeItems: "center" }}>
            <Icon name="file" size={22} />
          </div>
          <h3 style={{ margin: "0 0 6px", color: "#0f172a" }}>
            {issues.length === 0 ? "Database is clean and ready" : `No issues matching "${filter.replace(/_/g, " ")}"`}
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 13 }}>
            {issues.length === 0
              ? "No reports exist currently. Report the first civic issue to start the verification lifecycle!"
              : "Try clicking 'Active reports' or report a new issue."}
          </p>
          {issues.length === 0 ? (
            <Button icon="plus" onClick={() => go("report")}>Create First Report</Button>
          ) : (
            <Button variant="secondary" onClick={() => setFilter("ALL")}>Clear Filter</Button>
          )}
        </Card>
      )}
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
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(12.9692);
  const [lng, setLng] = useState(79.1559);
  const [description, setDescription] = useState("");
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

  const active = issue || cachedIssue;

  const handleSimulate = async (outcome?: string) => {
    if (!active) return;
    try {
      setExpiryLoading(true);
      setDemoMessage("");
      const res = await api.demoExpire(active.id, outcome);
      setDemoMessage(res.message || `Simulated outcome: ${res.new_status}`);
      await onRefresh();
      await loadData();
    } catch (err: unknown) {
      setDemoMessage(`Notice: ${(err as Error)?.message || "Simulation failed"}`);
    } finally {
      setExpiryLoading(false);
    }
  };

  if (!active) {
    return (
      <div className="narrow-page">
        <button className="back-link" onClick={() => go("dashboard")}>← Back to dashboard</button>
        <Card className="empty-state-card">
          <div className="empty-state-icon"><Icon name="file" size={28} /></div>
          <h2 className="empty-state-title">No report selected</h2>
          <p className="empty-state-sub">Select an issue from the dashboard or map to view details.</p>
          <Button onClick={() => go("dashboard")}>Back to dashboard</Button>
        </Card>
      </div>
    );
  }

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

      {/* Toast notification — fixed top-right corner */}
      {demoMessage && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 9999,
          background: "#1656a7",
          color: "#fff",
          padding: "14px 20px",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          boxShadow: "0 8px 32px rgba(22,86,167,0.35)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          maxWidth: 380,
          animation: "slideInToast 0.25s ease",
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ flex: 1 }}>{demoMessage}</span>
          <button
            onClick={() => setDemoMessage("")}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, opacity: 0.7 }}
          >×</button>
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
                {active.after_image_url ? (
                  <img className="after-photo" src={active.after_image_url} alt="After repair" />
                ) : (
                  <div className="after-photo" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f1f5f9",
                    height: "100%",
                    minHeight: 160,
                    borderRadius: 8,
                    color: "#94a3b8",
                    gap: 8,
                    border: "2px dashed #cbd5e1",
                  }}>
                    <Icon name="camera" size={32} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Awaiting repair claim</span>
                    <small style={{ fontSize: 11 }}>Department must submit evidence first</small>
                  </div>
                )}
                <figcaption>
                  <span>AFTER</span>
                  {active.after_image_url ? "Official department evidence" : "Not yet submitted"}
                </figcaption>
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
            <MiniMap
              height={190}
              latitude={typeof active.latitude === "number" ? active.latitude : 12.9692}
              longitude={typeof active.longitude === "number" ? active.longitude : 79.1559}
              markerStatus={active.status}
              zoom={15}
            />
            <div className="detail-list">
              <p><span>Address</span><strong>{active.address_text || "Coordinates logged"}</strong></p>
              <p>
                <span>Coordinates</span>
                <strong>
                  {typeof active.latitude === "number" ? active.latitude.toFixed(4) : "—"},{" "}
                  {typeof active.longitude === "number" ? active.longitude.toFixed(4) : "—"}
                </strong>
              </p>
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

          <Card style={{ border: "2px solid #e2e8f0" }}>
            <div className="card-heading" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: 6, color: "#1e293b", margin: 0 }}>
                  ⚡ Judge Demo Simulation Suite
                </h3>
                <p style={{ fontSize: 11, color: "var(--slate-500)", margin: "2px 0 0" }}>
                  Simulate all possible lifecycle outcomes on demand
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Option 1: Verified Resolved */}
              <button
                type="button"
                className="btn btn-success"
                style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "8px 10px" }}
                onClick={() => handleSimulate("VERIFIED_RESOLVED")}
                disabled={expiryLoading}
              >
                <Icon name="check" size={15} />
                Pass: Verified Resolved (2+ Confirms)
              </button>

              {/* Option 2: Reopened by Citizen Disputes */}
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "8px 10px" }}
                onClick={() => handleSimulate("REOPENED_DISPUTED")}
                disabled={expiryLoading}
              >
                <Icon name="alert" size={15} />
                Fail: Auto-Reopen (2 Citizen Disputes)
              </button>

              {/* Option 3: Reopened by Insufficient Votes */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "8px 10px" }}
                onClick={() => handleSimulate("REOPENED_INSUFFICIENT")}
                disabled={expiryLoading}
              >
                <Icon name="clock" size={15} />
                Fail: Reopen (Insufficient Confirms &lt; 2)
              </button>

              {/* Reset controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  style={{
                    padding: "7px 8px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSimulate("RESET_PENDING")}
                  disabled={expiryLoading}
                  title="Resets issue to DEPARTMENT_CLOSED with a fresh verification countdown"
                >
                  Reset: Verification
                </button>
                <button
                  type="button"
                  style={{
                    padding: "7px 8px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSimulate("RESET_REPORTED")}
                  disabled={expiryLoading}
                  title="Resets issue back to initial REPORTED status"
                >
                  Reset: Reported
                </button>
              </div>
            </div>
            <small style={{ color: "var(--slate-500)", display: "block", marginTop: 8, fontSize: 10, textAlign: "center" }}>
              Live updates DB status, timeline history, and vote tallies.
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeIssue, setActiveIssue] = useState<IssueItem | null>(issues[0] || null);

  const categories = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.category).filter(Boolean)));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        i.title?.toLowerCase().includes(q) ||
        i.address_text?.toLowerCase().includes(q) ||
        i.id?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "ALL" ||
        i.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [issues, searchTerm, selectedCategory]);

  useEffect(() => {
    if (filteredIssues.length > 0) {
      if (!activeIssue || !filteredIssues.some((i) => i.id === activeIssue.id)) {
        setActiveIssue(filteredIssues[0]);
      }
    } else {
      setActiveIssue(null);
    }
  }, [filteredIssues, activeIssue]);

  return (
    <div className="full-map-page">
      <div className="map-toolbar">
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Search address, ward, or issue ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className={`filter ${selectedCategory === "ALL" ? "active" : ""}`}
          onClick={() => setSelectedCategory("ALL")}
        >
          All categories ({issues.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat!)}
          >
            {cat}
          </button>
        ))}
        <button className="filter" style={{ opacity: 0.85, cursor: "default" }}>
          Live Feed ({filteredIssues.length} visible)
        </button>
      </div>
      <div className="map-shell">
        <FullMap
          issues={filteredIssues as IssueMarker[]}
          onMarkerClick={(marker: IssueMarker) => {
            const found = issues.find((i) => i.id === marker.id);
            if (found) setActiveIssue(found);
          }}
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
        {issues.length === 0 && (
          <Card className="floating-issue" style={{ maxWidth: 330 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--navy-900)" }}>
                <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: "50%", background: "rgba(39,132,94,.12)", color: "var(--green-700)" }}>
                  <Icon name="check" size={16} />
                </span>
                <strong style={{ fontSize: 14 }}>No Active Reports</strong>
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--slate-500)", fontSize: 13, lineHeight: 1.45 }}>
                The map is clean. As community members submit reports, pins will appear in real time.
              </p>
              <Button onClick={() => go("report")} className="wide" icon="plus">
                Report an Issue
              </Button>
            </div>
          </Card>
        )}
        {issues.length > 0 && filteredIssues.length === 0 && (
          <Card className="floating-issue" style={{ maxWidth: 320 }}>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>No matching reports</h3>
              <p style={{ margin: "0 0 10px", color: "var(--slate-500)", fontSize: 12 }}>
                Try adjusting your search query or category filters.
              </p>
              <Button variant="secondary" onClick={() => { setSearchTerm(""); setSelectedCategory("ALL"); }} className="wide">
                Clear Filters
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
  issue?: IssueItem | null;
  currentUser: UserAccount;
  go: (p: Page) => void;
  onRefresh: () => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; confirms: number; disputes: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (!issue) {
    return (
      <div className="narrow-page">
        <button className="back-link" onClick={() => go("verification-requests")}>← Back to requests</button>
        <Card className="empty-state-card">
          <div className="empty-state-icon"><Icon name="users" size={28} /></div>
          <h2 className="empty-state-title">No repair selected for verification</h2>
          <p className="empty-state-sub">Please select an issue currently in the verification window to cast your vote.</p>
          <Button onClick={() => go("verification-requests")}>Browse verification requests</Button>
        </Card>
      </div>
    );
  }

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

function MyReports({
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
  const myIssues = issues.filter((i) => i.reporter_id === currentUser.id);

  return (
    <div>
      <PageHeader
        eyebrow="Citizen records"
        title="My reports"
        text="Track every issue submitted under your account and its verification status."
        action={<Button icon="plus" onClick={() => go("report")}>Report an issue</Button>}
      />
      {myIssues.length > 0 ? (
        <Card className="table-card">
          <table>
            <thead>
              <tr><th>Issue ID</th><th>Category & location</th><th>Current status</th><th>Citizen votes</th><th /></tr>
            </thead>
            <tbody>
              {myIssues.map((i) => (
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
      ) : (
        <Card className="empty-state-card">
          <div className="empty-state-icon"><Icon name="file" size={28} /></div>
          <h3 className="empty-state-title">No reports submitted by you yet</h3>
          <p className="empty-state-sub">
            You haven't submitted any civic issues under account ({currentUser.email || currentUser.name}).
            Spot a problem in your neighborhood? Click below to submit your first report.
          </p>
          <Button icon="plus" onClick={() => go("report")}>Report an issue</Button>
        </Card>
      )}
    </div>
  );
}

function VerificationRequests({ issues, go, onSelectIssue }: { issues: IssueItem[]; go: (p: Page) => void; onSelectIssue: (id: string) => void }) {
  const pendingIssues = issues.filter((i) => i.status === "DEPARTMENT_CLOSED");
  const displayList = pendingIssues.length > 0 ? pendingIssues : issues;

  return (
    <div>
      <PageHeader eyebrow="Community verification" title="Help verify local repairs" text="Your local knowledge makes civic resolution accountable." />
      {displayList.length > 0 ? (
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
      ) : (
        <Card className="empty-state-card">
          <div className="empty-state-icon"><Icon name="check" size={28} /></div>
          <h3 className="empty-state-title">No repairs awaiting verification</h3>
          <p className="empty-state-sub">When department technicians submit before/after evidence, local residents can verify repairs here.</p>
          <Button onClick={() => go("dashboard")}>Back to dashboard</Button>
        </Card>
      )}
    </div>
  );
}

// ── Landing Page (Public Marketing Hero & Portal) ─────────────────────────
interface LandingPageProps {
  currentUser?: UserAccount | null;
  onGetStarted: (role: "citizen" | "department") => void;
  onGoToDashboard: () => void;
  onLogout: () => void;
}

function LandingPage({
  currentUser,
  onGetStarted,
  onGoToDashboard,
  onLogout,
}: LandingPageProps) {
  return (
    <div className="landing-root">
      {/* Navbar */}
      <nav className="landing-nav">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="landing-brand-icon"><Icon name="check" size={20} /></span>
          <strong>CivicResolve</strong>
        </button>

        <div className="landing-nav-links">
          <span className="landing-nav-badge">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
            Live Supabase + PostGIS
          </span>
        </div>

        <div className="landing-nav-cta">
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "#ffffff18", borderRadius: 20 }}>
                <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{currentUser.avatar}</span>
                <span style={{ fontSize: 13, color: "white", fontWeight: 600 }}>{currentUser.name}</span>
              </div>
              <button className="btn btn-primary" onClick={onGoToDashboard} style={{ fontSize: 13, padding: "0 18px", height: 38 }}>
                Go to Dashboard →
              </button>
              <button className="btn btn-secondary" onClick={onLogout} style={{ fontSize: 13, padding: "0 14px", height: 38, color: "white", background: "#ffffff14", borderColor: "#ffffff2b" }}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => onGetStarted("citizen")} style={{ fontSize: 13, padding: "0 16px", height: 38, color: "white", background: "#ffffff14", borderColor: "#ffffff2b" }}>
                Citizen Login
              </button>
              <button className="btn btn-primary" onClick={() => onGetStarted("department")} style={{ fontSize: 13, padding: "0 18px", height: 38 }}>
                Department Portal
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-badge">
            <Icon name="check" size={14} /> Community-powered civic accountability
          </div>
          <h1 className="landing-hero-title">
            Repairs shouldn't just
            <br />
            <span className="landing-hero-accent">look</span> fixed — they should <span className="landing-hero-accent">be</span> fixed.
          </h1>
          <p className="landing-hero-sub">
            CivicResolve replaces paperwork-only ticket closures with genuine ground verification. Citizens report problems, municipal crews submit photo proof of repair, and the neighborhood confirms it holds up.
          </p>

          {currentUser ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ padding: "10px 20px", background: "rgba(37, 103, 195, 0.2)", border: "1px solid rgba(101, 169, 255, 0.3)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: currentUser.role === "department" ? "#60a5fa" : "#34d399" }} />
                <span style={{ fontSize: 14, color: "#e2e8f0" }}>
                  Welcome back, <strong>{currentUser.name}</strong>. You are active as <strong>{currentUser.roleTitle}</strong>.
                </span>
              </div>
              <div className="landing-hero-actions">
                <button className="btn btn-primary landing-cta-btn" onClick={onGoToDashboard}>
                  <Icon name="home" size={18} /> Open {currentUser.roleTitle} Dashboard
                </button>
                <button className="btn btn-secondary landing-cta-btn" onClick={() => onGetStarted(currentUser.role === "citizen" ? "department" : "citizen")} style={{ color: "white", borderColor: "#ffffff30", background: "#ffffff12" }}>
                  Switch Role / Sign in as other user
                </button>
              </div>
            </div>
          ) : (
            <div className="landing-hero-actions">
              <button className="btn btn-primary landing-cta-btn" onClick={() => onGetStarted("citizen")}>
                <Icon name="users" size={18} /> Get started as Citizen
              </button>
              <button className="btn btn-secondary landing-cta-btn" onClick={() => onGetStarted("department")} style={{ color: "white", borderColor: "#ffffff30", background: "#ffffff12" }}>
                <Icon name="building" size={18} /> Department login
              </button>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="landing-stats">
          <div>
            <strong>2-vote</strong>
            <span>dispute threshold triggers auto-reopening</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>evidence-backed repair claims</span>
          </div>
          <div>
            <strong>5-min</strong>
            <span>verification window countdown</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>PostGIS geospatial tracking</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how">
        <p className="eyebrow" style={{ textAlign: "center", color: "#60a5fa" }}>The full lifecycle</p>
        <h2>How CivicResolve closes the loop</h2>
        <div className="landing-steps">
          {[
            { icon: "pin" as const, step: "01", title: "Citizen reports the issue", desc: "Photo evidence + GPS location submitted directly to Supabase. Real-time logging." },
            { icon: "building" as const, step: "02", title: "Department claims the repair", desc: "Technician submits before/after photographic proof. Verification window opens." },
            { icon: "users" as const, step: "03", title: "Community verifies on ground", desc: "Neighbors physically inspect the fix. 2 citizen disputes automatically reopen the issue." },
            { icon: "check" as const, step: "04", title: "Verified resolved or reopened", desc: "Only true resident confirmation resolves the report. Paperwork alone never closes it." },
          ].map((s) => (
            <div className="landing-step" key={s.step}>
              <div className="landing-step-num">{s.step}</div>
              <div className="landing-step-icon"><Icon name={s.icon} size={22} /></div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Portals */}
      <section className="landing-roles">
        <p className="eyebrow" style={{ textAlign: "center", color: "#60a5fa" }}>Two perspectives</p>
        <h2>Choose your portal</h2>
        <div className="landing-role-grid">
          <button className="landing-role-card citizen-role" onClick={() => onGetStarted("citizen")}>
            <div>
              <div className="role-icon" style={{ background: "#2567c326", color: "#60a5fa" }}>
                <Icon name="users" size={28} />
              </div>
              <p className="eyebrow" style={{ color: "#60a5fa", marginTop: 18 }}>Resident & Community</p>
              <h2>Citizen Portal</h2>
              <p>Report civic issues in your neighborhood, track your complaint audit trail, and verify whether repairs by municipal crews actually hold up.</p>
            </div>
            <span className="role-cta">Sign in as Citizen <Icon name="arrow" size={16} /></span>
          </button>

          <button className="landing-role-card department-role" onClick={() => onGetStarted("department")}>
            <div>
              <div className="role-icon" style={{ background: "#18704c26", color: "#34d399" }}>
                <Icon name="building" size={28} />
              </div>
              <p className="eyebrow" style={{ color: "#34d399", marginTop: 18 }}>Municipal Authorities</p>
              <h2>Department Portal</h2>
              <p>Inspect incoming civic reports, manage work orders, upload before/after photographic repair evidence, and track category durability metrics.</p>
            </div>
            <span className="role-cta" style={{ color: "#34d399" }}>Sign in as Department <Icon name="arrow" size={16} /></span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2026 CivicResolve · Community Accountability Platform</span>
        <span>Built with Supabase · PostGIS · React · Express</span>
      </footer>
    </div>
  );
}

// ── Login / Register Page (Email + Password Supabase Database Authentication) ────
const PRESET_DEMO_ACCOUNTS = [
  { role: "citizen" as const, email: "maya@civicresolve.in", password: "citizen123", name: "Maya Chen", title: "Citizen (Reporter)" },
  { role: "citizen" as const, email: "alex@civicresolve.in", password: "citizen123", name: "Alex Rivera", title: "Citizen (Validator)" },
  { role: "department" as const, email: "john@publicworks.gov", password: "dept1234", name: "John Miller", title: "Department (Technician)" },
  { role: "department" as const, email: "dept.lead@cityworks.gov", password: "deptpass456", name: "Supervisor Smith", title: "Department (Supervisor)" },
];

function LoginPage({
  prefillRole,
  onLogin,
  onBack,
}: {
  prefillRole: "citizen" | "department";
  onLogin: (user: UserAccount) => void;
  onBack: () => void;
}) {
  const [role, setRole] = useState<"citizen" | "department">(prefillRole);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isDept = role === "department";
  const hints = PRESET_DEMO_ACCOUNTS.filter((c) => c.role === role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await api.register({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          role,
        });
        setSuccessMsg(res.message || "Account created in Supabase! Signing in...");
        onLogin(res.user as UserAccount);
      } else {
        const res = await api.login(email.trim(), password, role, name.trim() || undefined);
        onLogin(res.user as UserAccount);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Supabase authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (hint: typeof PRESET_DEMO_ACCOUNTS[0]) => {
    setRole(hint.role);
    setEmail(hint.email);
    setPassword(hint.password);
    setName(hint.name);
    setError("");
  };

  return (
    <div className={`auth-page ${isDept ? "department-auth" : ""}`}>
      {/* Left story panel */}
      <div className="auth-story">
        <div>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div className="entry-brand light" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="landing-brand-icon" style={{ width: 34, height: 34 }}><Icon name="check" size={18} /></span>
              <strong style={{ fontSize: 20 }}>CivicResolve</strong>
            </div>
          </button>

          <h1 style={{ marginTop: 48 }}>
            {isDept ? "Municipal accountability starts with verified repair claims." : "Your community voice ensures repairs are genuinely complete."}
          </h1>

          <div className="auth-points">
            {isDept ? (
              <>
                <p>
                  <span><Icon name="file" size={18} /></span>
                  <strong>Structured repair claims</strong>
                  <small>Upload before/after photographic proof for every job order.</small>
                </p>
                <p>
                  <span><Icon name="users" size={18} /></span>
                  <strong>Community verification loop</strong>
                  <small>Only citizen validation closes a civic complaint ticket.</small>
                </p>
                <p>
                  <span><Icon name="chart" size={18} /></span>
                  <strong>Category durability metrics</strong>
                  <small>Monitor which repair types hold up across municipal wards.</small>
                </p>
              </>
            ) : (
              <>
                <p>
                  <span><Icon name="pin" size={18} /></span>
                  <strong>Report issues in seconds</strong>
                  <small>GPS coordinates + camera evidence recorded into PostGIS.</small>
                </p>
                <p>
                  <span><Icon name="check" size={18} /></span>
                  <strong>Ground-level verification</strong>
                  <small>2 citizen disputes automatically reopen closed tickets.</small>
                </p>
                <p>
                  <span><Icon name="bell" size={18} /></span>
                  <strong>Transparent status history</strong>
                  <small>Complete audit trail from submission to verified resolution.</small>
                </p>
              </>
            )}
          </div>
        </div>
        <small>CivicResolve Platform · Supabase Auth & PostGIS geospatial store</small>
      </div>

      {/* Right form panel */}
      <div className="auth-form-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ fontSize: 12, padding: "0 14px", minHeight: 34 }}>
            ← Back to Overview
          </button>
          <div className="role-pill">
            {isDept ? <Icon name="building" size={14} /> : <Icon name="users" size={14} />}
            {isDept ? "Department Mode" : "Citizen Mode"}
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 8 }}>
            Select Portal Role
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => { setRole("citizen"); setError(""); }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: role === "citizen" ? "2px solid #2567c3" : "1px solid var(--slate-300)",
                background: role === "citizen" ? "#e8f1fc" : "white",
                color: role === "citizen" ? "#1656a7" : "var(--slate-700)",
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name="users" size={16} /> Citizen
            </button>
            <button
              type="button"
              onClick={() => { setRole("department"); setError(""); }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: role === "department" ? "2px solid #18704c" : "1px solid var(--slate-300)",
                background: role === "department" ? "#e2f4eb" : "white",
                color: role === "department" ? "#18704c" : "var(--slate-700)",
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name="building" size={16} /> Department
            </button>
          </div>
        </div>

        {/* Sign in vs Register Toggle */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--slate-200)", marginBottom: 22, gap: 20 }}>
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); }}
            style={{
              padding: "8px 4px",
              background: "none",
              border: "none",
              borderBottom: mode === "signin" ? "2px solid var(--blue-700)" : "2px solid transparent",
              color: mode === "signin" ? "var(--navy-950)" : "var(--slate-500)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            style={{
              padding: "8px 4px",
              background: "none",
              border: "none",
              borderBottom: mode === "register" ? "2px solid var(--blue-700)" : "2px solid transparent",
              color: mode === "register" ? "var(--navy-950)" : "var(--slate-500)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Create account
          </button>
        </div>

        <h1>{mode === "signin" ? `Sign in as ${isDept ? "Department" : "Citizen"}` : `Register as ${isDept ? "Department Official" : "Citizen"}`}</h1>
        <p style={{ color: "var(--slate-500)", fontSize: 13, marginBottom: 20 }}>
          {mode === "signin"
            ? "Enter your email and password to authenticate directly via Supabase database."
            : "Enter your email, password, and name to create a user account in Supabase."}
        </p>

        {/* Quick-fill preset accounts */}
        <div style={{ marginBottom: 20, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid var(--slate-200)" }}>
          <p style={{ fontSize: 11, color: "var(--slate-500)", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
            Quick fill (Preset Demo Accounts):
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hints.map((h) => (
              <button
                key={h.email}
                type="button"
                onClick={() => quickFill(h)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: "1px solid var(--slate-300)",
                  background: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--slate-700)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{h.name}</span>
                <small style={{ color: "var(--slate-500)", fontSize: 10 }}>({h.email.split("@")[0]})</small>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fde7e8", color: "#b62d35", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: "#e2f4eb", color: "#18704c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="field-label" style={{ marginBottom: 14 }}>
              Full name
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isDept ? "e.g. Officer Miller" : "e.g. Maya Chen"}
                required
              />
            </label>
          )}

          <label className={`field-label ${error ? "field-error" : ""}`} style={{ marginBottom: 14 }}>
            Email address
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder={isDept ? "yourname@publicworks.gov" : "yourname@civicresolve.in"}
              required
              autoComplete="email"
            />
          </label>

          <label className={`field-label password-field ${error ? "field-error" : ""}`} style={{ marginBottom: 18 }}>
            Password
            <input
              id="login-password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <button type="button" onClick={() => setShowPass((v) => !v)}>{showPass ? "Hide" : "Show"}</button>
          </label>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary auth-submit wide"
            disabled={loading}
          >
            {loading ? "Authenticating via Supabase…" : mode === "signin" ? "Sign in" : "Create account"} <Icon name="arrow" size={16} />
          </button>

          <p className="auth-security" style={{ marginTop: 18 }}>
            <Icon name="check" size={12} /> Supabase Auth + PostgreSQL users table · DBthon Hackathon Direct Database Auth
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Application Shell ─────────────────────────────────────────────────────
function Shell({
  currentUser,
  onLogout,
  onGoToLanding,
}: {
  currentUser: UserAccount;
  onLogout: () => void;
  onGoToLanding: () => void;
}) {
  const official = currentUser.role === "department";
  const [page, setPage] = useState<Page>(official ? "department" : "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Issues State
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [resetting, setResetting] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      const data = await api.getIssues();
      const list = Array.isArray(data?.issues) ? data.issues : [];
      setIssues(list);
      setSelectedIssueId((prev) => (list.some((i: IssueItem) => i.id === prev) ? prev : (list[0]?.id || "")));
    } catch (e) {
      console.warn("Using local issues feed error:", e);
      setIssues([]);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const activeIssue = issues.find((i) => i.id === selectedIssueId) || issues[0] || null;

  const handleResetReports = async () => {
    if (window.confirm("Are you sure you want to reset all reports, claims, and verification records to start completely clean?")) {
      try {
        setResetting(true);
        await api.resetReports();
        await fetchIssues();
        alert("All application report data has been cleanly reset to 0!");
      } catch (e) {
        alert("Reset failed: " + (e as Error).message);
      } finally {
        setResetting(false);
      }
    }
  };

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
        <div
          className="brand"
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <div
            onClick={onGoToLanding}
            title="Return to Public Landing Page"
            style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}
          >
            <span><Icon name="check" /></span>
            <div>
              <strong>CivicResolve</strong>
              <small>← Overview / Landing</small>
            </div>
          </div>
          <button className="mobile-close" onClick={(e) => { e.stopPropagation(); setMobileOpen(false); }}>
            <Icon name="x" />
          </button>
        </div>

        <nav>
          <p>WORKSPACE</p>
          {nav.map(([p, icon, label]) => (
            <button key={p} className={page === p ? "active" : ""} onClick={() => go(p as Page)}>
              <Icon name={icon as IconName} />
              {label}
            </button>
          ))}
          <button onClick={onGoToLanding} style={{ marginTop: 8, color: "#60a5fa" }}>
            <Icon name="home" />
            Landing Page
          </button>
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
            <button
              onClick={onGoToLanding}
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "0 12px", height: 34 }}
              title="View public marketing landing page"
            >
              Overview / Landing
            </button>

            {official && (
              <button
                onClick={handleResetReports}
                disabled={resetting}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "0 12px", height: 34, color: "#b62d35", borderColor: "#fca5a5" }}
                title="Wipe database reports back to clean 0 count"
              >
                {resetting ? "Resetting…" : "Reset Reports Data"}
              </button>
            )}

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
          {page === "my-reports" && (
            <MyReports
              issues={issues}
              currentUser={currentUser}
              go={go}
              onSelectIssue={setSelectedIssueId}
            />
          )}
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

// App screen flow: landing → login(role) → shell
type AppScreen =
  | { kind: "landing" }
  | { kind: "login"; role: "citizen" | "department" }
  | { kind: "shell"; user: UserAccount };

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem("civic_active_user");
    if (saved) {
      try {
        const user = JSON.parse(saved) as UserAccount;
        if (user?.id && user?.role) return user;
      } catch { /* ignore */ }
    }
    return null;
  });

  const [screen, setScreen] = useState<AppScreen>(() => {
    // If URL has #dashboard and user is logged in, show shell.
    // Otherwise show landing page so the user always sees the landing page first!
    if (window.location.hash === "#dashboard") {
      const saved = localStorage.getItem("civic_active_user");
      if (saved) {
        try {
          const user = JSON.parse(saved) as UserAccount;
          if (user?.id && user?.role) return { kind: "shell", user };
        } catch { /* ignore */ }
      }
    }
    return { kind: "landing" };
  });

  const handleLogin = (user: UserAccount) => {
    localStorage.setItem("civic_active_user", JSON.stringify(user));
    setCurrentUser(user);
    setScreen({ kind: "shell", user });
    window.location.hash = "#dashboard";
  };

  const handleLogout = () => {
    localStorage.removeItem("civic_active_user");
    setCurrentUser(null);
    setScreen({ kind: "landing" });
    window.location.hash = "";
  };

  const handleGoToDashboard = () => {
    if (currentUser) {
      setScreen({ kind: "shell", user: currentUser });
      window.location.hash = "#dashboard";
    } else {
      setScreen({ kind: "login", role: "citizen" });
    }
  };

  const handleGoToLanding = () => {
    setScreen({ kind: "landing" });
    window.location.hash = "";
  };

  if (screen.kind === "landing") {
    return (
      <LandingPage
        currentUser={currentUser}
        onGetStarted={(role) => setScreen({ kind: "login", role })}
        onGoToDashboard={handleGoToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  if (screen.kind === "login") {
    return (
      <LoginPage
        prefillRole={screen.role}
        onLogin={handleLogin}
        onBack={handleGoToLanding}
      />
    );
  }

  return (
    <Shell
      currentUser={screen.user}
      onLogout={handleLogout}
      onGoToLanding={handleGoToLanding}
    />
  );
}

