import express from 'express';
import { supabase } from '../db.js';

const router = express.Router();


// GET /api/analytics/durability
router.get('/durability', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('civic_issues')
      .select('category, status')
      .in('status', ['DEPARTMENT_CLOSED', 'VERIFIED_RESOLVED', 'REOPENED']);

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    const categories = {};

    for (const issue of (data || [])) {
      if (!categories[issue.category]) {
        categories[issue.category] = {
          total: 0,
          verified: 0,
          reopened: 0
        };
      }

      categories[issue.category].total++;

      if (issue.status === 'VERIFIED_RESOLVED') {
        categories[issue.category].verified++;
      }

      if (issue.status === 'REOPENED') {
        categories[issue.category].reopened++;
      }
    }

    const result = Object.entries(categories).map(([category, values]) => {
      const durability =
        values.total > 0
          ? `${((values.verified / values.total) * 100).toFixed(1)}%`
          : 'N/A';

      return {
        category,
        total: values.total,
        total_claims: values.total,
        verified_resolved: values.verified,
        reopened: values.reopened,
        durability_score: durability
      };
    });

    res.json(result);

  } catch (error) {
    console.error('Analytics error:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


export default router;
// GET /analytics/durability
