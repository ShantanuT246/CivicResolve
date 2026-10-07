# CivicResolve — Implementation Plan

> Hackathon build plan. Frontend is ~90% done (React + Vite + Tailwind, all pages built as static UI).
> Focus is wiring up the Express backend and connecting it to the frontend.

---

## Current State

| Area | Status |
|---|---|
| Frontend pages | ✅ All pages built (Dashboard, Report, Verify, Department, Durability, etc.) |
| Frontend data | ⚠️ Hardcoded mock data — needs API calls |
| Backend (`index.js`) | ❌ Empty — needs to be built |
| Database | ❌ Supabase schema not yet applied |

---

## Tech Stack (Keep Simple)

```
Frontend  →  React + Vite + TypeScript (done)
Backend   →  Node.js + Express
Database  →  Supabase (PostgreSQL + PostGIS)
Storage   →  Supabase Storage (civic-evidence bucket)
```

---

## Phase 1 — Supabase Setup (Do This First, ~30 min)

### 1A. Run the Schema SQL in Supabase Dashboard

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum
CREATE TYPE issue_status AS ENUM (
  'REPORTED', 'IN_PROGRESS', 'DEPARTMENT_CLOSED', 'VERIFIED_RESOLVED', 'REOPENED'
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'resident',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Civic Issues
CREATE TABLE civic_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status issue_status DEFAULT 'REPORTED',
  location GEOGRAPHY(Point, 4326) NOT NULL,
  address_text TEXT,
  reporter_id UUID REFERENCES users(id),
  before_image_url TEXT NOT NULL,
  verification_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_civic_issues_location ON civic_issues USING GIST (location);

-- Repair Claims
CREATE TABLE repair_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES civic_issues(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id),
  after_image_url TEXT NOT NULL,
  repair_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citizen Verifications
CREATE TABLE citizen_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  vote TEXT NOT NULL CHECK (vote IN ('CONFIRM', 'DISPUTE')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

-- Status History / Audit Trail
CREATE TABLE issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES civic_issues(id) ON DELETE CASCADE,
  previous_status issue_status,
  new_status issue_status NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1B. Seed Test Users (run in Supabase SQL editor)

```sql
INSERT INTO users (id, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Maya Chen', 'resident'),
  ('00000000-0000-0000-0000-000000000002', 'Technician John', 'technician'),
  ('00000000-0000-0000-0000-000000000003', 'Admin User', 'admin');
```

### 1C. Create Storage Bucket

In Supabase Dashboard → Storage → New bucket: `civic-evidence` (set to **Public**)

---

## Phase 2 — Backend Build (~2–3 hrs)

### 2A. File Structure

```
Backend/
├── index.js          ← main Express app
├── db.js             ← Supabase client singleton
├── routes/
│   ├── issues.js     ← POST /issues, GET /issues/nearby
│   ├── verify.js     ← POST /issues/:id/verify
│   ├── claims.js     ← POST /issues/:id/claim-repair
│   ├── history.js    ← GET /issues/:id/history
│   ├── analytics.js  ← GET /analytics/durability
│   └── demo.js       ← POST /issues/:id/demo-trigger-expire
├── middleware/
│   └── validate.js   ← simple request body checks
├── .env              ← SUPABASE_URL, SUPABASE_SERVICE_KEY
└── package.json
```

### 2B. Install Dependencies

```bash
cd Backend
npm init -y
npm install express @supabase/supabase-js dotenv cors
```

### 2C. `db.js` — Supabase Client

```js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Use service key on backend (bypasses RLS)
);
```

### 2D. `index.js` — Express App Entry

```js
import express from 'express';
import cors from 'cors';
import issueRoutes from './routes/issues.js';
import verifyRoutes from './routes/verify.js';
import claimRoutes from './routes/claims.js';
import historyRoutes from './routes/history.js';
import analyticsRoutes from './routes/analytics.js';
import demoRoutes from './routes/demo.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/issues', issueRoutes);
app.use('/api/issues', verifyRoutes);
app.use('/api/issues', claimRoutes);
app.use('/api/issues', historyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/issues', demoRoutes);

app.listen(3001, () => console.log('Backend running on :3001'));
```

---

## Phase 3 — API Route Implementation

### Route 1: `POST /api/issues` — Submit New Issue

**File:** `routes/issues.js`

```js
router.post('/', async (req, res) => {
  const { title, category, description, latitude, longitude,
          address_text, reporter_id, before_image_url } = req.body;

  const { data, error } = await supabase.from('civic_issues').insert({
    title, category, description,
    location: `POINT(${longitude} ${latitude})`,
    address_text,
    reporter_id,
    before_image_url,
    status: 'REPORTED'
  }).select().single();

  // Also log initial status to history
  await supabase.from('issue_status_history').insert({
    issue_id: data.id,
    previous_status: null,
    new_status: 'REPORTED',
    reason: 'Issue submitted by resident'
  });

  res.status(201).json({ success: true, issue: { id: data.id, status: data.status, created_at: data.created_at } });
});
```

---

### Route 2: `GET /api/issues/nearby` — Map Feed

**Uses PostGIS `ST_DWithin` for radius query.**

```js
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 500 } = req.query;

  const { data } = await supabase.rpc('get_nearby_issues', {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radius_meters: parseFloat(radius)
  });

  res.json({ count: data.length, issues: data });
});
```

**Also create this SQL function in Supabase:**

```sql
CREATE OR REPLACE FUNCTION get_nearby_issues(lat FLOAT, lng FLOAT, radius_meters FLOAT)
RETURNS TABLE(...) AS $$
  SELECT
    ci.id, ci.title, ci.category, ci.status,
    ST_Y(ci.location::geometry) AS latitude,
    ST_X(ci.location::geometry) AS longitude,
    ST_Distance(ci.location, ST_MakePoint(lng, lat)::geography) AS distance_meters,
    ci.before_image_url,
    rc.after_image_url, rc.repair_notes, rc.created_at AS claimed_at,
    ci.verification_deadline,
    COUNT(CASE WHEN cv.vote = 'CONFIRM' THEN 1 END) AS confirm_count,
    COUNT(CASE WHEN cv.vote = 'DISPUTE' THEN 1 END) AS dispute_count
  FROM civic_issues ci
  LEFT JOIN repair_claims rc ON rc.issue_id = ci.id
  LEFT JOIN citizen_verifications cv ON cv.issue_id = ci.id
  WHERE ST_DWithin(ci.location, ST_MakePoint(lng, lat)::geography, radius_meters)
  GROUP BY ci.id, rc.after_image_url, rc.repair_notes, rc.created_at
  ORDER BY distance_meters;
$$ LANGUAGE sql;
```

---

### Route 3: `POST /api/issues/:id/claim-repair` — Technician Closes Issue

**State Machine Rule:** Must be `IN_PROGRESS` → `DEPARTMENT_CLOSED`

```js
router.post('/:id/claim-repair', async (req, res) => {
  const { id } = req.params;
  const { technician_id, after_image_url, repair_notes } = req.body;

  // Fetch current issue
  const { data: issue } = await supabase.from('civic_issues').select('status').eq('id', id).single();

  // Enforce state machine (allow REPORTED too for demo simplicity)
  if (!['IN_PROGRESS', 'REPORTED'].includes(issue.status)) {
    return res.status(400).json({ error: 'Issue not in a claimable state' });
  }

  // Set deadline: 5 min for demo, 7 days for production
  const IS_DEMO = process.env.DEMO_MODE === 'true';
  const deadline = new Date(Date.now() + (IS_DEMO ? 5 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));

  // Insert repair claim
  await supabase.from('repair_claims').insert({ issue_id: id, technician_id, after_image_url, repair_notes });

  // Update issue status
  await supabase.from('civic_issues').update({
    status: 'DEPARTMENT_CLOSED',
    verification_deadline: deadline.toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', id);

  // Log to history
  await supabase.from('issue_status_history').insert({
    issue_id: id,
    previous_status: issue.status,
    new_status: 'DEPARTMENT_CLOSED',
    reason: `Repair claimed by technician`
  });

  res.json({ success: true, issue_id: id, new_status: 'DEPARTMENT_CLOSED', verification_deadline: deadline });
});
```

---

### Route 4: `POST /api/issues/:id/verify` — Citizen Vote (Core Business Logic)

> This is the most critical route. Enforces all 3 business rules.

```js
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { user_id, vote, comment } = req.body;

  // Fetch issue + reporter
  const { data: issue } = await supabase.from('civic_issues')
    .select('status, reporter_id').eq('id', id).single();

  if (issue.status !== 'DEPARTMENT_CLOSED') {
    return res.status(400).json({ error: 'Issue is not in verification window' });
  }

  // Get existing votes
  const { data: votes } = await supabase.from('citizen_verifications')
    .select('user_id, vote').eq('issue_id', id);

  const otherVotes = votes.filter(v => v.user_id !== user_id);

  // ── RULE: Reporter Isolation ──
  // Reporter can vote ONLY if there's at least 1 other vote already
  if (user_id === issue.reporter_id && otherVotes.length === 0) {
    return res.status(403).json({ error: 'Reporter cannot be the sole validator. Wait for other citizens to vote first.' });
  }

  // Check for duplicate vote
  const alreadyVoted = votes.find(v => v.user_id === user_id);
  if (alreadyVoted) {
    return res.status(409).json({ error: 'You have already voted on this issue' });
  }

  // Insert vote
  await supabase.from('citizen_verifications').insert({ issue_id: id, user_id, vote, comment });

  // Recalculate counts after new vote
  const allVotes = [...votes, { vote }];
  const confirm_count = allVotes.filter(v => v.vote === 'CONFIRM').length;
  const dispute_count = allVotes.filter(v => v.vote === 'DISPUTE').length;

  let new_status = issue.status;

  // ── RULE: Auto-Reopen at 2 disputes ──
  if (dispute_count >= 2) {
    new_status = 'REOPENED';
    await supabase.from('civic_issues').update({ status: 'REOPENED', updated_at: new Date() }).eq('id', id);
    await supabase.from('issue_status_history').insert({
      issue_id: id, previous_status: 'DEPARTMENT_CLOSED', new_status: 'REOPENED',
      reason: 'System: Dispute threshold (2) reached'
    });
  }

  res.json({ success: true, current_status: new_status, stats: { confirm_count, dispute_count } });
});
```

---

### Route 5: `GET /api/issues/:id/history` — Audit Trail

```js
router.get('/:id/history', async (req, res) => {
  const { data } = await supabase.from('issue_status_history')
    .select('*').eq('issue_id', req.params.id).order('changed_at', { ascending: true });

  const timeline = data.map(row => ({
    status: row.new_status,
    timestamp: row.changed_at,
    actor: row.reason
  }));

  res.json({ issue_id: req.params.id, timeline });
});
```

---

### Route 6: `GET /api/analytics/durability` — Category Scorecard

```js
router.get('/durability', async (req, res) => {
  const { data: issues } = await supabase.from('civic_issues')
    .select('category, status')
    .in('status', ['DEPARTMENT_CLOSED', 'VERIFIED_RESOLVED', 'REOPENED']);

  // Group by category
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.category]) grouped[issue.category] = { total: 0, verified: 0, reopened: 0 };
    grouped[issue.category].total++;
    if (issue.status === 'VERIFIED_RESOLVED') grouped[issue.category].verified++;
    if (issue.status === 'REOPENED') grouped[issue.category].reopened++;
  }

  const result = Object.entries(grouped).map(([category, g]) => ({
    category,
    total_claims: g.total,
    verified_resolved: g.verified,
    reopened: g.reopened,
    durability_score: g.total > 0 ? `${((g.verified / g.total) * 100).toFixed(1)}%` : 'N/A'
  }));

  res.json(result);
});
```

---

### Route 7: `POST /api/issues/:id/demo-trigger-expire` — Judge Helper

```js
router.post('/:id/demo-trigger-expire', async (req, res) => {
  const { id } = req.params;
  const { data: issue } = await supabase.from('civic_issues')
    .select('status').eq('id', id).single();

  if (issue.status !== 'DEPARTMENT_CLOSED') {
    return res.status(400).json({ error: 'Only DEPARTMENT_CLOSED issues can be force-evaluated' });
  }

  const { data: votes } = await supabase.from('citizen_verifications')
    .select('vote').eq('issue_id', id);

  const confirm = votes.filter(v => v.vote === 'CONFIRM').length;
  const dispute = votes.filter(v => v.vote === 'DISPUTE').length;

  let new_status;
  let reason;

  if (confirm >= 2 && dispute < 2) {
    new_status = 'VERIFIED_RESOLVED';
    reason = 'System: Verification window expired — CONFIRM threshold met';
  } else {
    new_status = 'REOPENED';
    reason = 'System: Verification window expired — insufficient confirmations';
  }

  await supabase.from('civic_issues').update({ status: new_status, updated_at: new Date() }).eq('id', id);
  await supabase.from('issue_status_history').insert({
    issue_id: id, previous_status: 'DEPARTMENT_CLOSED', new_status, reason
  });

  res.json({ success: true, new_status, confirm_count: confirm, dispute_count: dispute });
});
```

---

## Phase 4 — Frontend API Integration (~1–2 hrs)

> The frontend is fully built with static data. Now replace hardcoded data with real API calls.

### 4A. Add a central API service file

**Create `Frontend/src/api.ts`:**

```ts
const BASE_URL = 'http://localhost:3001/api';

export const api = {
  submitIssue: (body: object) =>
    fetch(`${BASE_URL}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),

  getNearbyIssues: (lat: number, lng: number, radius = 500) =>
    fetch(`${BASE_URL}/issues/nearby?lat=${lat}&lng=${lng}&radius=${radius}`).then(r => r.json()),

  verifyIssue: (id: string, body: object) =>
    fetch(`${BASE_URL}/issues/${id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),

  claimRepair: (id: string, body: object) =>
    fetch(`${BASE_URL}/issues/${id}/claim-repair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),

  getHistory: (id: string) =>
    fetch(`${BASE_URL}/issues/${id}/history`).then(r => r.json()),

  getDurability: () =>
    fetch(`${BASE_URL}/analytics/durability`).then(r => r.json()),

  demoExpire: (id: string) =>
    fetch(`${BASE_URL}/issues/${id}/demo-trigger-expire`, { method: 'POST' }).then(r => r.json()),
};
```

### 4B. Image Upload (Client-side to Supabase Storage)

**Create `Frontend/src/uploadImage.ts`:**

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function uploadImage(file: File): Promise<string> {
  const filename = `public/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from('civic-evidence').upload(filename, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('civic-evidence').getPublicUrl(filename);
  return publicUrl;
}
```

### 4C. Key Pages to Wire Up (Priority Order)

| Priority | Page | What to wire |
|---|---|---|
| 🔴 High | `ReportIssue` | On submit: `uploadImage(file)` then `api.submitIssue(...)` |
| 🔴 High | `VerifyPage` | On confirm/dispute: `api.verifyIssue(id, { user_id, vote, comment })` |
| 🔴 High | `RepairClaims` | On submit: `uploadImage(afterFile)` then `api.claimRepair(id, ...)` |
| 🟡 Med | `IssueDetails` | Fetch real issue + history: `api.getHistory(id)` |
| 🟡 Med | `Dashboard` | Fetch nearby issues for map: `api.getNearbyIssues(lat, lng)` |
| 🟢 Low | `Durability` | Replace bar chart data: `api.getDurability()` |

### 4D. Hardcoded user_id (Hackathon Shortcut)

Since there's no auth backend, use a simple approach:

```ts
// In App.tsx — after role selection, generate/store a session user_id
const SESSION_USER_ID = localStorage.getItem('civic_uid') ?? (() => {
  const id = crypto.randomUUID();
  localStorage.setItem('civic_uid', id);
  return id;
})();
```

Pass `SESSION_USER_ID` down as a prop to pages that need it.

---

## Phase 5 — Demo Script (For Judges)

> Run through this sequence to demonstrate the full lifecycle live.

```
1. Open app → Select "Citizen" → Login

2. [Citizen] Report issue
   → Fill form, upload photo → Submit
   → Show: status = REPORTED

3. Switch to [Department] view
   → Go to Issues → Find the new issue
   → Go to Repair Claims → Submit with after-photo
   → Show: status = DEPARTMENT_CLOSED, verification window starts

4. Switch back to [Citizen] view
   → Two different users (use incognito) vote DISPUTE
   → Show: status auto-flips to REOPENED (real-time)

5. Show Audit Trail
   → GET /api/issues/:id/history
   → Shows full chain: REPORTED → DEPARTMENT_CLOSED → REOPENED

6. [Admin shortcut] Force resolve for judges
   → POST /api/issues/:id/demo-trigger-expire
   → Show: VERIFIED_RESOLVED with durability score

7. Show Analytics
   → GET /api/analytics/durability → Category scorecard
```

---

## Environment Variables

**`Backend/.env`:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
DEMO_MODE=true
PORT=3001
```

**`Frontend/.env`:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE=http://localhost:3001/api
```

---

## Time Budget (Hackathon Estimate)

| Phase | Task | Time |
|---|---|---|
| Phase 1 | Supabase schema + seed + storage bucket | 30 min |
| Phase 2 | Backend scaffold + `index.js` + `db.js` | 30 min |
| Phase 3 | All 7 API routes | 2 hrs |
| Phase 4 | Frontend wiring (api.ts + 3 key pages) | 1.5 hrs |
| Phase 5 | Demo rehearsal + bug fixes | 30 min |
| **Total** | | **~5 hrs** |

---

## Critical Business Rules Checklist

- [ ] `DISPUTE >= 2` → auto-flip to `REOPENED` + log to `issue_status_history`
- [ ] `CONFIRM >= 2 AND DISPUTE < 2` (on window expire) → `VERIFIED_RESOLVED`
- [ ] Reporter cannot be **sole** validator (check other votes count)
- [ ] One vote per user per issue (`UNIQUE(issue_id, user_id)` in DB)
- [ ] Verification deadline set on `claim-repair` (5 min demo, 7 days prod)
- [ ] Every status change logged to `issue_status_history`
