// Import Express app
const app = require('./app');

const PORT = process.env.PORT || 5002;

// Initialize reminder scheduler
if (process.env.NODE_ENV !== 'test') {
  const { startReminderScheduler } = require('../services/scheduler');
  startReminderScheduler();
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
