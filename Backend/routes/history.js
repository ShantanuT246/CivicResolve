import express from 'express';
import { supabase } from '../db.js';

const router = express.Router();


// GET /api/issues/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('issue_status_history')
      .select('*')
      .eq('issue_id', id)
      .order('changed_at', {
        ascending: true
      });

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      issue_id: id,
      timeline: data
    });

  } catch (error) {
    console.error('History error:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


export default router;