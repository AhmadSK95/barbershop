const { runMetric, listMetrics, getSchemaSnapshot } = require('../utils/assistantTools');
const { resolveIntent } = require('../services/assistant/intentResolver');
const { suggestVisualization } = require('../services/assistant/visualizationPlanner');
const crypto = require('crypto');

/**
 * List available metrics
 * @route GET /api/admin/assistant/metrics
 * @access Private (Admin only)
 */
const getAvailableMetrics = async (req, res) => {
  try {
    const metrics = listMetrics();
    
    res.json({
      success: true,
      data: {
        count: metrics.length,
        metrics
      }
    });
  } catch (error) {
    console.error('Error listing metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list metrics'
    });
  }
};

/**
 * Execute a metric query
 * @route POST /api/admin/assistant/query
 * @access Private (Admin only)
 */
const executeMetric = async (req, res) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const { question, metric, params = {}, revealPII = false } = req.body;

    let resolvedMetric = metric;
    let resolvedParams = params;
    let confidence = 'high';
    let reasoning = '';

    // If question provided, use LLM to resolve intent
    if (question && !metric) {
      const intent = await resolveIntent(question);
      resolvedMetric = intent.metric;
      resolvedParams = intent.params;
      confidence = intent.confidence;
      reasoning = intent.reasoning;
    } else if (!metric) {
      return res.status(400).json({
        success: false,
        message: 'Either question or metric name is required'
      });
    }

    // Execute metric
    const result = await runMetric(resolvedMetric, resolvedParams, revealPII);
    
    // Log to audit (will be handled by middleware)
    const latency = Date.now() - startTime;

    // Get visualization suggestion
    const visualization = suggestVisualization(resolvedMetric, result.rows);

    res.json({
      success: true,
      message: generateSummary(resolvedMetric, result),
      data: {
        requestId,
        ...result,
        summary: generateSummary(resolvedMetric, result),
        assumptions: generateAssumptions(result.params),
        confidence,
        reasoning,
        visualization
      }
    });

  } catch (error) {
    console.error('Error executing metric:', error);
    
    const latency = Date.now() - startTime;
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to execute metric',
      requestId,
      latency
    });
  }
};

/**
 * Get database schema information
 * @route GET /api/admin/assistant/schema
 * @access Private (Admin only)
 */
const getDatabaseSchema = async (req, res) => {
  try {
    const schema = await getSchemaSnapshot();
    
    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database schema'
    });
  }
};

/**
 * Generate natural language summary from metric results
 * @param {string} metricName
 * @param {Object} result
 * @returns {string}
 */
const generateSummary = (metricName, result) => {
  const { rows, params } = result;
  
  switch (metricName) {
    case 'bookings_by_status':
      const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);
      const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
      return `Found ${total} total bookings generating $${totalRevenue.toFixed(2)} in revenue. ` +
             `Status breakdown: ${rows.map(r => `${r.status} (${r.count})`).join(', ')}.`;
    
    case 'top_barbers':
      if (rows.length === 0) return 'No barber data available for this period.';
      const topBarber = rows[0];
      return `Top performer: ${topBarber.first_name} ${topBarber.last_name} with ` +
             `${topBarber.completed_bookings} completed bookings and $${topBarber.revenue} revenue.`;
    
    case 'no_show_rate':
      const rate = rows[0];
      return `No-show rate: ${rate.no_show_rate_pct}% (${rate.no_shows} out of ${rate.total_completed} completed bookings).`;
    
    case 'payment_summary':
      const paid = rows.find(r => r.payment_status === 'paid');
      const pending = rows.find(r => r.payment_status === 'pending');
      return `Payments: ${paid?.bookings || 0} paid ($${paid?.total_paid || 0}), ` +
             `${pending?.bookings || 0} pending ($${pending?.total_paid || 0}).`;
    
    case 'service_popularity':
      if (rows.length === 0) return 'No service data available.';
      const topService = rows[0];
      return `Most popular: "${topService.name}" with ${topService.total_bookings} bookings ` +
             `(${topService.completed} completed, $${topService.revenue} revenue).`;
    
    case 'revenue_trends':
      const totalDays = rows.length;
      const avgDaily = rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0) / totalDays;
      return `${totalDays} days of data. Average daily revenue: $${avgDaily.toFixed(2)}.`;
    
    case 'user_growth':
      const totalNew = rows.reduce((sum, r) => sum + parseInt(r.new_users), 0);
      return `${totalNew} new users registered during this period.`;
    
    case 'ratings_summary':
      if (rows.length === 0) return 'No ratings data available.';
      const avgRating = (rows.reduce((sum, r) => sum + parseFloat(r.avg_rating), 0) / rows.length).toFixed(2);
      return `Average rating across all barbers: ${avgRating} stars. ${rows.length} barbers rated.`;
    
    default:
      return `Retrieved ${rows.length} rows.`;
  }
};

/**
 * Generate assumptions note
 * @param {Object} params
 * @returns {string}
 */
const generateAssumptions = (params) => {
  const assumptions = [];
  
  if (params.startDate && params.endDate) {
    assumptions.push(`Date range: ${params.startDate} to ${params.endDate}`);
  }
  
  assumptions.push('Timezone: America/New_York (server time)');
  assumptions.push('Email/phone numbers are masked by default');
  
  return assumptions.join('. ');
};

module.exports = {
  getAvailableMetrics,
  executeMetric,
  getDatabaseSchema
};
