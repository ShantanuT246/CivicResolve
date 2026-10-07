import express from 'express';
import { supabase } from '../db.js';
import { requireFields } from '../middleware/validate.js';

const router = express.Router();


// POST /api/issues/:id/claim-repair
router.post(
  '/:id/claim-repair',
  requireFields([
    'technician_id',
    'after_image_url'
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        technician_id,
        after_image_url,
        repair_notes
      } = req.body;

      // Get current issue
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

      if (
        issue.status !== 'REPORTED' &&
        issue.status !== 'IN_PROGRESS'
      ) {
        return res.status(400).json({
          error: 'Issue cannot currently be claimed as repaired'
        });
      }

      // Demo mode = 5 minutes
      // Normal mode = 7 days
      const isDemo = process.env.DEMO_MODE === 'true';

      const duration = isDemo
        ? 5 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

      const deadline = new Date(
        Date.now() + duration
      );

      // Create repair claim
      const { error: claimError } = await supabase
        .from('repair_claims')
        .insert({
          issue_id: id,
          technician_id,
          after_image_url,
          repair_notes
        });

      if (claimError) {
        return res.status(400).json({
          error: claimError.message
        });
      }

      // Move issue to department closed
      const { error: updateError } = await supabase
        .from('civic_issues')
        .update({
          status: 'DEPARTMENT_CLOSED',
          verification_deadline: deadline.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        return res.status(400).json({
          error: updateError.message
        });
      }

      // History
      await supabase
        .from('issue_status_history')
        .insert({
          issue_id: id,
          previous_status: issue.status,
          new_status: 'DEPARTMENT_CLOSED',
          reason: 'Repair claimed by department'
        });

      res.json({
        success: true,
        issue_id: id,
        status: 'DEPARTMENT_CLOSED',
        verification_deadline: deadline
      });

    } catch (error) {
      console.error('Repair claim error:', error);

      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);


export default router;
// POST /issues/:id/claim-repair
