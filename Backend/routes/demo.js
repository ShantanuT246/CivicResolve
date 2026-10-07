import express from 'express';
import { supabase } from '../db.js';

const router = express.Router();


// POST /api/issues/:id/demo-trigger-expire
router.post('/:id/demo-trigger-expire', async (req, res) => {
  try {
    const { id } = req.params;

    // Get issue
    const { data: issue, error: issueError } = await supabase
      .from('civic_issues')
      .select('status')
      .eq('id', id)
      .single();

    if (issueError || !issue) {
      return res.status(404).json({
        error: 'Issue not found'
      });
    }

    if (issue.status !== 'DEPARTMENT_CLOSED') {
      return res.status(400).json({
        error:
          'Issue must be DEPARTMENT_CLOSED before expiry'
      });
    }

    // Get votes
    const { data: votes, error: votesError } = await supabase
      .from('citizen_verifications')
      .select('vote')
      .eq('issue_id', id);

    if (votesError) {
      return res.status(400).json({
        error: votesError.message
      });
    }

    const confirmCount = votes.filter(
      v => v.vote === 'CONFIRM'
    ).length;

    const disputeCount = votes.filter(
      v => v.vote === 'DISPUTE'
    ).length;

    let newStatus;
    let reason;

    if (confirmCount >= 2 && disputeCount < 2) {
      newStatus = 'VERIFIED_RESOLVED';

      reason =
        'Verification window expired with sufficient confirmations';
    } else {
      newStatus = 'REOPENED';

      reason =
        'Verification window expired without sufficient confirmations';
    }

    // Update issue
    const { error: updateError } = await supabase
      .from('civic_issues')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(400).json({
        error: updateError.message
      });
    }

    // Add history
    await supabase
      .from('issue_status_history')
      .insert({
        issue_id: id,
        previous_status: 'DEPARTMENT_CLOSED',
        new_status: newStatus,
        reason
      });

    res.json({
      success: true,
      issue_id: id,
      new_status: newStatus,
      confirm_count: confirmCount,
      dispute_count: disputeCount
    });

  } catch (error) {
    console.error('Demo expiry error:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


export default router;
// POST /issues/:id/demo-trigger-expire
