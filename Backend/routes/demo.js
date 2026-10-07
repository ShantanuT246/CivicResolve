import express from 'express';
import { supabase } from '../db.js';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_DEMO_ID = 'e6470839-014f-4e5c-8923-9d37bef7f0c3';

async function ensureRepairClaim(issueId) {
  const { data: claim } = await supabase
    .from('repair_claims')
    .select('id')
    .eq('issue_id', issueId)
    .limit(1);

  if (!claim || claim.length === 0) {
    await supabase.from('repair_claims').insert({
      issue_id: issueId,
      technician_id: '00000000-0000-0000-0000-000000000002',
      after_image_url: 'https://images.unsplash.com/photo-1578991624414-276ef23a534f',
      repair_notes: 'LED driver and circuit wiring replaced by department technician. Illumination verified.'
    });
  }
}

// POST /api/issues/:id/demo-trigger-expire
// Supports:
// outcome = 'VERIFIED_RESOLVED' | 'REOPENED_DISPUTED' | 'REOPENED_INSUFFICIENT' | 'RESET_PENDING' | 'RESET_REPORTED'
router.post('/:id/demo-trigger-expire', async (req, res) => {
  try {
    let { id } = req.params;
    const { outcome } = req.body || {};

    if (!UUID_REGEX.test(id)) {
      id = DEFAULT_DEMO_ID;
    }

    // Get issue
    let { data: issue } = await supabase
      .from('civic_issues')
      .select('status')
      .eq('id', id)
      .single();

    if (!issue) {
      // Auto-provision demo issue in DB if simulating on a clean DB or preset ID
      const { data: created, error: createErr } = await supabase
        .from('civic_issues')
        .insert({
          id: id,
          title: 'Streetlight out on Cedar Avenue',
          category: 'Streetlight',
          description: 'Streetlight out near the pedestrian crossing for three nights.',
          location: 'POINT(79.1559 12.9692)',
          address_text: 'Cedar Avenue & 8th Street',
          reporter_id: '00000000-0000-0000-0000-000000000001',
          before_image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
          status: 'DEPARTMENT_CLOSED',
        })
        .select()
        .single();

      if (createErr || !created) {
        console.error('Provisioning error:', createErr);
        return res.status(404).json({ error: createErr?.message || 'Issue not found' });
      }

      await ensureRepairClaim(id);
      issue = created;
    }

    // --- Scenario 1: Reset to REPORTED ---
    if (outcome === 'RESET_REPORTED') {
      await supabase.from('citizen_verifications').delete().eq('issue_id', id);
      await supabase.from('repair_claims').delete().eq('issue_id', id);

      await supabase
        .from('civic_issues')
        .update({
          status: 'REPORTED',
          verification_deadline: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: 'REPORTED',
        reason: 'Demo Simulator: Reset back to initial REPORTED state'
      });

      return res.json({
        success: true,
        issue_id: id,
        new_status: 'REPORTED',
        confirm_count: 0,
        dispute_count: 0,
        message: 'Issue reset to initial REPORTED status'
      });
    }

    // --- Scenario 2: Reset to DEPARTMENT_CLOSED (Awaiting verification) ---
    if (outcome === 'RESET_PENDING') {
      await supabase.from('citizen_verifications').delete().eq('issue_id', id);
      await ensureRepairClaim(id);

      const deadline = new Date(Date.now() + 5 * 60 * 1000);
      await supabase
        .from('civic_issues')
        .update({
          status: 'DEPARTMENT_CLOSED',
          verification_deadline: deadline.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: 'DEPARTMENT_CLOSED',
        reason: 'Demo Simulator: Reopened verification window (5 min timer active)'
      });

      return res.json({
        success: true,
        issue_id: id,
        new_status: 'DEPARTMENT_CLOSED',
        verification_deadline: deadline,
        confirm_count: 0,
        dispute_count: 0,
        message: 'Issue reset to DEPARTMENT_CLOSED (5 min countdown active)'
      });
    }

    // --- Scenario 3: Force VERIFIED_RESOLVED (Happy Path: 2+ Confirms) ---
    if (outcome === 'VERIFIED_RESOLVED') {
      await ensureRepairClaim(id);
      await supabase.from('citizen_verifications').delete().eq('issue_id', id);

      await supabase.from('citizen_verifications').insert([
        { issue_id: id, user_id: '00000000-0000-0000-0000-000000000003', vote: 'CONFIRM', comment: 'Simulated Citizen (Alex): Repair fully verified on site' },
        { issue_id: id, user_id: '00000000-0000-0000-0000-000000000001', vote: 'CONFIRM', comment: 'Simulated Reporter (Maya): Confirmed streetlight fully functional' }
      ]);

      await supabase
        .from('civic_issues')
        .update({
          status: 'VERIFIED_RESOLVED',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: 'VERIFIED_RESOLVED',
        reason: 'Demo Simulator: Verification window expired with 2 citizen confirmations'
      });

      return res.json({
        success: true,
        issue_id: id,
        new_status: 'VERIFIED_RESOLVED',
        confirm_count: 2,
        dispute_count: 0,
        message: 'Successfully simulated community verification (VERIFIED_RESOLVED)'
      });
    }

    // --- Scenario 4: Force REOPENED due to 2+ Citizen Disputes ---
    if (outcome === 'REOPENED_DISPUTED') {
      await ensureRepairClaim(id);
      await supabase.from('citizen_verifications').delete().eq('issue_id', id);

      await supabase.from('citizen_verifications').insert([
        { issue_id: id, user_id: '00000000-0000-0000-0000-000000000003', vote: 'DISPUTE', comment: 'Simulated Citizen (Alex): Defect persists — repair incomplete' },
        { issue_id: id, user_id: '00000000-0000-0000-0000-000000000001', vote: 'DISPUTE', comment: 'Simulated Reporter (Maya): Pothole opened back up after rain' }
      ]);

      await supabase
        .from('civic_issues')
        .update({
          status: 'REOPENED',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: 'REOPENED',
        reason: 'Demo Simulator: Dispute threshold (2) reached by community'
      });

      return res.json({
        success: true,
        issue_id: id,
        new_status: 'REOPENED',
        confirm_count: 0,
        dispute_count: 2,
        message: 'Simulated auto-reopening via community disputes (REOPENED)'
      });
    }

    // --- Scenario 5: Force REOPENED due to Insufficient Confirmations (< 2) ---
    if (outcome === 'REOPENED_INSUFFICIENT') {
      await ensureRepairClaim(id);
      await supabase.from('citizen_verifications').delete().eq('issue_id', id);

      await supabase
        .from('civic_issues')
        .update({
          status: 'REOPENED',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('issue_status_history').insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: 'REOPENED',
        reason: 'Demo Simulator: Verification window expired without sufficient confirmations (0/2)'
      });

      return res.json({
        success: true,
        issue_id: id,
        new_status: 'REOPENED',
        confirm_count: 0,
        dispute_count: 0,
        message: 'Simulated window expiry with insufficient votes (REOPENED)'
      });
    }

    // --- Default: Real vote tally evaluation on active window ---
    const { data: votes } = await supabase
      .from('citizen_verifications')
      .select('vote')
      .eq('issue_id', id);

    const confirmCount = (votes || []).filter(v => v.vote === 'CONFIRM').length;
    const disputeCount = (votes || []).filter(v => v.vote === 'DISPUTE').length;

    let newStatus;
    let reason;

    if (confirmCount >= 2 && disputeCount < 2) {
      newStatus = 'VERIFIED_RESOLVED';
      reason = 'Verification window expired with sufficient confirmations';
    } else {
      newStatus = 'REOPENED';
      reason = 'Verification window expired without sufficient confirmations';
    }

    await supabase
      .from('civic_issues')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await supabase
      .from('issue_status_history')
      .insert({
        issue_id: id,
        previous_status: issue.status,
        new_status: newStatus,
        reason
      });

    res.json({
      success: true,
      issue_id: id,
      new_status: newStatus,
      confirm_count: confirmCount,
      dispute_count: disputeCount,
      message: `Simulated window expiry: status is now ${newStatus}`
    });

  } catch (error) {
    console.error('Demo simulation error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
