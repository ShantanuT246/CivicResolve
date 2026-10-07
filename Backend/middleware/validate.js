export function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(
      field =>
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ''
    );

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      });
    }

    next();
  };
}