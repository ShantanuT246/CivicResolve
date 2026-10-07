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


export default router;