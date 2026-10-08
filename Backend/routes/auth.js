import express from 'express';
import { supabase } from '../db.js';

const router = express.Router();

// Fallback preset demo accounts (Shan removed)
const DEFAULT_PRESETS = [
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
  {
    id: '89a2a0ac-487f-4d16-a629-e1334d7c7aed',
    name: 'Supervisor Smith',
    email: 'dept.lead@cityworks.gov',
    password: 'deptpass456',
    role: 'department',
    roleTitle: 'Public Works (Department Official)',
    tagline: 'Official municipal personnel responsible for resolving reported civic complaints.',
    avatar: 'SS',
  },
];

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

// Sync user to Supabase public.users table so foreign keys (reporter_id, technician_id, user_id) work
async function syncUserToSupabase(id, name, role) {
  try {
    const dbRole = role === 'department' ? 'technician' : 'resident';
    const { error } = await supabase.from('users').upsert({
      id,
      name,
      role: dbRole,
    });
    if (error) {
      console.warn('Supabase public.users sync notice:', error.message);
    }
  } catch (e) {
    console.warn('Supabase public.users sync error:', e.message);
  }
}

// POST /api/auth/login — Supabase email and password authentication
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, name } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const effectiveRole = role === 'department' ? 'department' : 'citizen';

    // 1. Authenticate against Supabase Auth using signInWithPassword
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    let user = signInData?.user;

    // 2. If login failed with Supabase
    if (signInError || !user) {
      // Check if user already exists in Supabase Auth
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = (usersData?.users || []).find(
        (u) => (u.email || '').toLowerCase() === cleanEmail
      );

      if (existingUser) {
        // User exists, but password was incorrect
        return res.status(401).json({
          error: 'Incorrect password for this account. Please try again.',
        });
      }

      // User does not exist yet: auto-provision new account in Supabase
      const rawName =
        (name && name.trim()) ||
        cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      // Check if this matches a default preset ID
      const matchingPreset = DEFAULT_PRESETS.find(p => p.email.toLowerCase() === cleanEmail);
      const customId = matchingPreset?.id || undefined;

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        ...(customId ? { id: customId } : {}),
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: rawName,
          role: effectiveRole,
        },
      });

      if (createError) {
        console.error('Supabase createUser error:', createError);
        return res.status(500).json({ error: 'Failed to create user in Supabase: ' + createError.message });
      }

      user = createData.user;
    }

    // 3. Resolve user profile details
    const userName =
      user.user_metadata?.name ||
      (name && name.trim()) ||
      cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const userRole = role || user.user_metadata?.role || effectiveRole;

    // 4. Ensure public.users table in Supabase is updated
    await syncUserToSupabase(user.id, userName, userRole);

    const safeUser = {
      id: user.id,
      name: userName,
      email: cleanEmail,
      role: userRole,
      roleTitle: formatRoleTitle(userRole),
      tagline: formatTagline(userRole),
      avatar: deriveInitials(userName),
    };

    return res.json({
      success: true,
      user: safeUser,
      message: 'Authenticated directly via Supabase database',
    });
  } catch (error) {
    console.error('Supabase login error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

// POST /api/auth/register — provision new user with email and password in Supabase
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const effectiveRole = role === 'department' ? 'department' : 'citizen';

    // Check if user already exists in Supabase Auth
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existing = (usersData?.users || []).find(
      (u) => (u.email || '').toLowerCase() === cleanEmail
    );

    if (existing) {
      // Try to sign in with the provided password first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !authData?.user) {
        // Password mismatch — use admin API to force-update the password.
        // This handles the case where the user was deleted from public.users
        // but still exists in Supabase Auth (e.g. after a manual DB reset).
        console.log(`Password mismatch for ${cleanEmail} — force-updating via admin API`);
        const rawName =
          (name && name.trim()) ||
          existing.user_metadata?.name ||
          cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: {
            name: rawName,
            role: effectiveRole,
          },
        });

        if (updateError) {
          console.error('Supabase admin updateUser error:', updateError);
          return res.status(500).json({ error: 'Failed to reset account password: ' + updateError.message });
        }

        await syncUserToSupabase(existing.id, rawName, effectiveRole);

        return res.status(201).json({
          success: true,
          user: {
            id: existing.id,
            name: rawName,
            email: cleanEmail,
            role: effectiveRole,
            roleTitle: formatRoleTitle(effectiveRole),
            tagline: formatTagline(effectiveRole),
            avatar: deriveInitials(rawName),
          },
          message: 'Account password reset and re-synced in Supabase.',
        });
      }

      const userName = existing.user_metadata?.name || name || cleanEmail.split('@')[0];
      await syncUserToSupabase(existing.id, userName, effectiveRole);

      return res.json({
        success: true,
        user: {
          id: existing.id,
          name: userName,
          email: cleanEmail,
          role: effectiveRole,
          roleTitle: formatRoleTitle(effectiveRole),
          tagline: formatTagline(effectiveRole),
          avatar: deriveInitials(userName),
        },
        message: 'Account already exists. Signed in successfully via Supabase.',
      });
    }

    const rawName =
      (name && name.trim()) ||
      cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: rawName,
        role: effectiveRole,
      },
    });

    if (createError) {
      console.error('Supabase registration error:', createError);
      return res.status(500).json({ error: createError.message });
    }

    const newUser = createData.user;
    await syncUserToSupabase(newUser.id, rawName, effectiveRole);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: rawName,
        email: cleanEmail,
        role: effectiveRole,
        roleTitle: formatRoleTitle(effectiveRole),
        tagline: formatTagline(effectiveRole),
        avatar: deriveInitials(rawName),
      },
      message: 'Account registered directly in Supabase database',
    });
  } catch (error) {
    console.error('Supabase registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// GET /api/auth/accounts — returns preset accounts from Supabase (excluding Shan)
router.get('/accounts', async (_req, res) => {
  try {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const { data: publicUsers } = await supabase.from('users').select('*');

    const publicMap = {};
    (publicUsers || []).forEach((u) => {
      publicMap[u.id] = u;
    });

    // Preset passwords map for demo pills
    const presetPasswords = {
      'maya@civicresolve.in': 'citizen123',
      'alex@civicresolve.in': 'citizen123',
      'john@publicworks.gov': 'dept1234',
      'dept.lead@cityworks.gov': 'deptpass456',
    };

    if (authData?.users && authData.users.length > 0) {
      const accounts = authData.users
        // Filter out shan@gmail.com and shantanu@gmail.com from demo quick fill pills
        .filter((u) => !['shan@gmail.com', 'shantanu@gmail.com'].includes(u.email.toLowerCase()))
        .map((u) => {
          const p = publicMap[u.id];
          const name = p?.name || u.user_metadata?.name || u.email.split('@')[0];
          const role =
            u.user_metadata?.role === 'department' || p?.role === 'technician'
              ? 'department'
              : 'citizen';
          return {
            id: u.id,
            name,
            email: u.email,
            password: presetPasswords[u.email.toLowerCase()] || 'citizen123',
            role,
            roleTitle: formatRoleTitle(role),
            tagline: formatTagline(role),
            avatar: deriveInitials(name),
          };
        });
      return res.json({ accounts });
    }

    res.json({ accounts: DEFAULT_PRESETS });
  } catch (err) {
    console.error('Fetch accounts error:', err);
    res.json({ accounts: DEFAULT_PRESETS });
  }
});

export default router;
