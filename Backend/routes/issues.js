// Route 1: POST /api/issues — Submit New Issue
router.post('/', async (req, res) => {
  const { title, category, description, latitude, longitude,
          address_text, reporter_id, before_image_url } = req.body;

  const { data, error } = await supabase.from('civic_issues').insert({
    title, category, description,
    location: `POINT(${longitude} ${latitude})`,
    address_text,
    reporter_id,
    before_image_url,
    status: 'REPORTED'
  }).select().single();

  await supabase.from('issue_status_history').insert({
    issue_id: data.id,
    previous_status: null,
    new_status: 'REPORTED',
    reason: 'Issue submitted by resident'
  });

  res.status(201).json({ success: true, issue: { id: data.id, status: data.status, created_at: data.created_at } });
});
