import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { supabase } from '../db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE = path.resolve(__dirname, '../data/accounts.json');

// Base preset accounts
const DEFAULT_ACCOUNTS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Maya Chen',
    email: 'maya@civicresolve.in',
    password: 'citizen123',
    role: 'citizen',
    roleTitle: 'Citizen (Reporter)',
    tagline: 'Reports neighborhood issues and tracks accountability.',
    avatar: 'MC',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Alex Rivera',
    email: 'alex@civicresolve.in',
    password: 'citizen123',
    role: 'citizen',
    roleTitle: 'Citizen (Neighbor / Validator)',
    tagline: 'Independent citizen who verifies physical repairs on the ground.',
    avatar: 'AR',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'John Miller',
    email: 'john@publicworks.gov',
    password: 'dept1234',
    role: 'department',
    roleTitle: 'Public Works (Technician)',
    tagline: 'Performs fixes and submits before/after evidence claims.',
    avatar: 'JM',
  },
];

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        // Ensure preset accounts exist
        const emails = new Set(data.map((a) => a.email.toLowerCase()));
        for (const preset of DEFAULT_ACCOUNTS) {
          if (!emails.has(preset.email.toLowerCase())) {
            data.push(preset);
          }
        }
        return data;
      }
    }
  } catch (err) {
    console.error('Error loading accounts file, fallback to presets:', err);
  }
  return [...DEFAULT_ACCOUNTS];
}

function saveAccounts(accounts) {
  try {
    fs.mkdirSync(path.dirname(ACCOUNTS_FILE), { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving accounts file:', err);
  }
}

// Sync user to Supabase users table so foreign keys (reporter_id, technician_id, user_id) work
async function syncUserToSupabase(user) {
  try {
    const dbRole = user.role === 'citizen' ? 'resident' : 'technician';
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      role: dbRole,
    });
    if (error) {
      console.warn('Supabase user sync notice:', error.message);
    }
  } catch (e) {
    console.warn('Supabase user sync error:', e.message);
  }
}

let accounts = loadAccounts();

// Pre-sync preset accounts in background
for (const acc of accounts) {
  syncUserToSupabase(acc).catch(() => {});
}

function deriveInitials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name || 'CR').slice(0, 2).toUpperCase();
}

function formatRoleTitle(role) {
  return role === 'department'
    ? 'Public Works (Department Official)'
    : 'Citizen (Community Member)';
}

function formatTagline(role) {
  return role === 'department'
    ? 'Official municipal personnel responsible for resolving reported civic complaints.'
    : 'Active community resident reporting and validating municipal repairs.';
}

// POST /api/auth/login
// Supports existing accounts OR seamless auto-provisioning for any citizen/dept email
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    accounts = loadAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (existing) {
      if (existing.password !== password) {
        return res.status(401).json({ error: 'Incorrect password for this account' });
      }

      await syncUserToSupabase(existing);
      const { password: _pw, ...safeUser } = existing;
      return res.json({ success: true, user: safeUser });
    }

    // New user signing in: create account seamlessly if role is specified or inferred
    const effectiveRole = role === 'department' ? 'department' : 'citizen';
    const rawName =
      (name && name.trim()) ||
      cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser = {
      id: crypto.randomUUID(),
      name: rawName,
      email: cleanEmail,
      password: password,
      role: effectiveRole,
      roleTitle: formatRoleTitle(effectiveRole),
      tagline: formatTagline(effectiveRole),
      avatar: deriveInitials(rawName),
    };

    accounts.push(newUser);
    saveAccounts(accounts);
    await syncUserToSupabase(newUser);

    const { password: _pw, ...safeUser } = newUser;
    return res.json({
      success: true,
      user: safeUser,
      created: true,
      message: 'Account created and signed in successfully',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    accounts = loadAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (existing) {
      return res.status(409).json({ error: 'An account already exists with this email. Please sign in.' });
    }

    const effectiveRole = role === 'department' ? 'department' : 'citizen';
    const rawName =
      (name && name.trim()) ||
      cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser = {
      id: crypto.randomUUID(),
      name: rawName,
      email: cleanEmail,
      password: password,
      role: effectiveRole,
      roleTitle: formatRoleTitle(effectiveRole),
      tagline: formatTagline(effectiveRole),
      avatar: deriveInitials(rawName),
    };

    accounts.push(newUser);
    saveAccounts(accounts);
    await syncUserToSupabase(newUser);

    const { password: _pw, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      user: safeUser,
      message: 'Account registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// GET /api/auth/accounts — returns safe list for demo / fast fill
router.get('/accounts', (_req, res) => {
  accounts = loadAccounts();
  const safe = accounts.map(({ password: _pw, ...u }) => u);
  res.json({ accounts: safe });
});

export default router;
