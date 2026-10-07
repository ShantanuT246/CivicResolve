import express from 'express';
import { supabase } from '../db.js';
import { requireFields } from '../middleware/validate.js';

const router = express.Router();


// POST /api/issues
router.post(
  '/',
  requireFields([
    'title',
    'category',
    'latitude',
    'longitude',
    'reporter_id',
    'before_image_url'
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
        before_image_url
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
          status: 'REPORTED'
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: error.message
        });
      }

      // Add initial status history
      await supabase
        .from('issue_status_history')
        .insert({
          issue_id: data.id,
          previous_status: null,
          new_status: 'REPORTED',
          reason: 'Issue submitted by resident'
        });

      res.status(201).json({
        success: true,
        issue: {
          id: data.id,
          status: data.status,
          created_at: data.created_at
        }
      });

    } catch (error) {
      console.error('Create issue error:', error);

      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);


// GET /api/issues/nearby
router.get('/nearby', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 500
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'lat and lng are required'
      });
    }

    const { data, error } = await supabase.rpc(
      'get_nearby_issues',
      {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_meters: parseFloat(radius)
      }
    );

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      count: data.length,
      issues: data
    });

  } catch (error) {
    console.error('Nearby issues error:', error);

    res.status(500).json({
      error: 'Internal server error'
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

    const confirm_count = (votes || []).filter(v => v.vote === 'CONFIRM').length;
    const dispute_count = (votes || []).filter(v => v.vote === 'DISPUTE').length;

    const latestClaim = issue.repair_claims?.[0];

    res.json({
      ...issue,
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
