const pool = require('../config/database');

// Public endpoint hit from SMS "stop" links
// GET /api/sms/dnd?phone=<phone-in-e164>
const addSmsDnd = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone parameter',
      });
    }

    const normalizedPhone = phone.toString().trim();

    await pool.query(
      'INSERT INTO sms_dnd_numbers (phone_number) VALUES ($1) ON CONFLICT (phone_number) DO NOTHING',
      [normalizedPhone]
    );

    // Simple HTML confirmation page for users tapping the link in SMS
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SMS Preferences Updated</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.5; }
      h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
      p { margin: 0.25rem 0; }
    </style>
  </head>
  <body>
    <h1>SMS Preferences Updated</h1>
    <p>You will no longer receive SMS reminders from this number.</p>
  </body>
</html>`);
  } catch (error) {
    console.error('Add SMS DND error:', error);
    res.status(500).send('Error updating your SMS preferences. Please try again later.');
  }
};

module.exports = {
  addSmsDnd,
};
