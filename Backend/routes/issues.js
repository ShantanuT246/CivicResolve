import express from 'express';
import { supabase } from '../db.js';
import { requireFields } from '../middleware/validate.js';

const router = express.Router();

function parseLocation(loc) {
  if (!loc) return { latitude: 0, longitude: 0 };
  if (typeof loc === 'object' && Array.isArray(loc.coordinates)) {
    return { longitude: loc.coordinates[0], latitude: loc.coordinates[1] };
  }
  if (typeof loc === 'string') {
    const match = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
    }
    if (loc.length === 50) {
      try {
        const buf = Buffer.from(loc, 'hex');
        return {
          longitude: buf.readDoubleLE(9),
          latitude: buf.readDoubleLE(17),
        };
      } catch (e) {
        // ignore
      }
    }
  }
  return { latitude: 0, longitude: 0 };
}

// GET /api/issues — returns all issues (ordered by newest)
router.get('/', async (_req, res) => {
  try {
    const { data: rawIssues, error } = await supabase
      .from('civic_issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const issuesList = rawIssues || [];
    if (issuesList.length === 0) {
      return res.json({ count: 0, issues: [] });
    }

    const issueIds = issuesList.map((i) => i.id);

    const [claimsRes, votesRes] = await Promise.all([
      supabase
        .from('repair_claims')
        .select('issue_id, after_image_url, repair_notes, created_at')
        .in('issue_id', issueIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('citizen_verifications')
        .select('issue_id, vote')
        .in('issue_id', issueIds),
    ]);

    const claimsMap = {};
    (claimsRes.data || []).forEach((c) => {
      if (!claimsMap[c.issue_id]) claimsMap[c.issue_id] = c;
    });

    const votesMap = {};
    (votesRes.data || []).forEach((v) => {
      if (!votesMap[v.issue_id]) votesMap[v.issue_id] = { confirms: 0, disputes: 0 };
      if (v.vote === 'CONFIRM') votesMap[v.issue_id].confirms++;
      if (v.vote === 'DISPUTE') votesMap[v.issue_id].disputes++;
    });

    const enriched = issuesList.map((item) => {
      const coords = parseLocation(item.location);
      return {
        ...item,
        latitude: coords.latitude,
        longitude: coords.longitude,
        after_image_url: claimsMap[item.id]?.after_image_url || null,
        repair_notes: claimsMap[item.id]?.repair_notes || null,
        confirm_count: votesMap[item.id]?.confirms || 0,
        dispute_count: votesMap[item.id]?.disputes || 0,
      };
    });

    res.json({ count: enriched.length, issues: enriched });
  } catch (error) {
    console.error('Get all issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/issues/reset — cleans all reports data to start clean
router.post('/reset', async (_req, res) => {
  try {
    await supabase.from('citizen_verifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('repair_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('issue_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('civic_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    res.json({ success: true, message: 'All civic issues, claims, and verification records reset successfully' });
  } catch (error) {
    console.error('Reset reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset reports' });
  }
});

// POST /api/issues — create new issue
router.post(
  '/',
  requireFields([
    'title',
    'category',
    'latitude',
    'longitude',
    'reporter_id',
    'before_image_url',
  ]),
  async (req, res) => {
    try {
      const {
        title,
        category,
        description,
        latitude,
        longitude,
        address_text,
        reporter_id,
        before_image_url,
      } = req.body;

      const { data, error } = await supabase
        .from('civic_issues')
        .insert({
          title,
          category,
          description,
          location: `POINT(${longitude} ${latitude})`,
          address_text,
          reporter_id,
          before_image_url,
          status: 'REPORTED',
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: error.message,
        });
      }

      // Add initial status history
      await supabase.from('issue_status_history').insert({
        issue_id: data.id,
        previous_status: null,
        new_status: 'REPORTED',
        reason: 'Issue submitted by resident',
      });

      res.status(201).json({
        success: true,
        issue: {
          id: data.id,
          status: data.status,
          created_at: data.created_at,
        },
      });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

// GET /api/issues/nearby
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 500 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'lat and lng are required',
      });
    }

    const { data, error } = await supabase.rpc('get_nearby_issues', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: parseFloat(radius),
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    const rawIssues = data || [];
    const issueIds = rawIssues.map((i) => i.id);

    let claimsMap = {};
    let votesMap = {};

    if (issueIds.length > 0) {
      const { data: claims } = await supabase
        .from('repair_claims')
        .select('issue_id, after_image_url, repair_notes, created_at')
        .in('issue_id', issueIds)
        .order('created_at', { ascending: false });

      (claims || []).forEach((c) => {
        if (!claimsMap[c.issue_id]) {
          claimsMap[c.issue_id] = c;
        }
      });

      const { data: votes } = await supabase
        .from('citizen_verifications')
        .select('issue_id, vote')
        .in('issue_id', issueIds);

      (votes || []).forEach((v) => {
        if (!votesMap[v.issue_id]) votesMap[v.issue_id] = { confirms: 0, disputes: 0 };
        if (v.vote === 'CONFIRM') votesMap[v.issue_id].confirms++;
        if (v.vote === 'DISPUTE') votesMap[v.issue_id].disputes++;
      });
    }

    const enriched = rawIssues.map((item) => ({
      ...item,
      after_image_url: claimsMap[item.id]?.after_image_url || null,
      repair_notes: claimsMap[item.id]?.repair_notes || null,
      confirm_count: votesMap[item.id]?.confirms || 0,
      dispute_count: votesMap[item.id]?.disputes || 0,
    }));

    res.json({
      count: enriched.length,
      issues: enriched,
    });
  } catch (error) {
    console.error('Nearby issues error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/issues/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: issue, error } = await supabase
      .from('civic_issues')
      .select(`
        *,
        repair_claims (after_image_url, repair_notes, created_at, technician_id)
      `)
      .eq('id', id)
      .single();

    if (error || !issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Get vote counts
    const { data: votes } = await supabase
      .from('citizen_verifications')
      .select('vote')
      .eq('issue_id', id);

    const confirm_count = (votes || []).filter((v) => v.vote === 'CONFIRM').length;
    const dispute_count = (votes || []).filter((v) => v.vote === 'DISPUTE').length;

    const latestClaim = (issue.repair_claims || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const coords = parseLocation(issue.location);

    res.json({
      ...issue,
      latitude: coords.latitude,
      longitude: coords.longitude,
      after_image_url: latestClaim?.after_image_url || null,
      repair_notes: latestClaim?.repair_notes || null,
      confirm_count,
      dispute_count,
    });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
