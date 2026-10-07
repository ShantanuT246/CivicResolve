import express from 'express';
import { supabase } from '../db.js';
import { requireFields } from '../middleware/validate.js';

const router = express.Router();


// POST /api/issues/:id/verify
router.post(
  '/:id/verify',
  requireFields(['user_id', 'vote']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, vote, comment } = req.body;

      if (!['CONFIRM', 'DISPUTE'].includes(vote)) {
        return res.status(400).json({
          error: 'vote must be CONFIRM or DISPUTE'
        });
      }

      // Get issue
      const { data: issue, error: issueError } = await supabase
        .from('civic_issues')
        .select('status, reporter_id')
        .eq('id', id)
        .single();

      if (issueError || !issue) {
        return res.status(404).json({
          error: 'Issue not found'
        });
      }

      // Verification is allowed only after department closes issue
      if (issue.status !== 'DEPARTMENT_CLOSED') {
        return res.status(400).json({
          error: 'Issue is not currently open for verification'
        });
      }

      // Get existing votes
      const { data: votes, error: votesError } = await supabase
        .from('citizen_verifications')
        .select('user_id, vote')
        .eq('issue_id', id);

      if (votesError) {
        return res.status(500).json({
          error: votesError.message
        });
      }

      // One vote per citizen
      const alreadyVoted = votes.some(
        v => v.user_id === user_id
      );

      if (alreadyVoted) {
        return res.status(409).json({
          error: 'You have already voted on this issue'
        });
      }

      // Reporter cannot be the only validator
      if (
        user_id === issue.reporter_id &&
        votes.length === 0
      ) {
        return res.status(403).json({
          error:
            'The reporter cannot be the sole validator'
        });
      }

      // Save vote
      const { error: insertError } = await supabase
        .from('citizen_verifications')
        .insert({
          issue_id: id,
          user_id,
          vote,
          comment
        });

      if (insertError) {
        return res.status(400).json({
          error: insertError.message
        });
      }

      // Updated counts
      const allVotes = [
        ...votes,
        { user_id, vote }
      ];

      const confirmCount = allVotes.filter(
        v => v.vote === 'CONFIRM'
      ).length;

      const disputeCount = allVotes.filter(
        v => v.vote === 'DISPUTE'
      ).length;

      // 2 disputes = automatically reopen
      if (disputeCount >= 2) {
        await supabase
          .from('civic_issues')
          .update({
            status: 'REOPENED',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        await supabase
          .from('issue_status_history')
          .insert({
            issue_id: id,
            previous_status: 'DEPARTMENT_CLOSED',
            new_status: 'REOPENED',
            reason: 'System: Dispute threshold reached (2+ citizen disputes)'
          });

        return res.json({
          success: true,
          current_status: 'REOPENED',
          stats: {
            confirm_count: confirmCount,
            dispute_count: disputeCount
          }
        });
      }

      // Consensus reached: 3+ confirms (or 2+ confirms with 0 disputes) = VERIFIED_RESOLVED
      if (confirmCount >= 3 || (confirmCount >= 2 && disputeCount === 0)) {
        await supabase
          .from('civic_issues')
          .update({
            status: 'VERIFIED_RESOLVED',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        await supabase
          .from('issue_status_history')
          .insert({
            issue_id: id,
            previous_status: 'DEPARTMENT_CLOSED',
            new_status: 'VERIFIED_RESOLVED',
            reason: `System: Community consensus reached (${confirmCount} confirmations)`
          });

        return res.json({
          success: true,
          current_status: 'VERIFIED_RESOLVED',
          stats: {
            confirm_count: confirmCount,
            dispute_count: disputeCount
          }
        });
      }

      res.json({
        success: true,
        current_status: 'DEPARTMENT_CLOSED',
        stats: {
          confirm_count: confirmCount,
          dispute_count: disputeCount
        }
      });

    } catch (error) {
      console.error('Verification error:', error);

      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);


export default router;
// POST /issues/:id/verify
