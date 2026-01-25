const { callLLM } = require('./llmClient');
const { METRIC_TEMPLATES } = require('../../utils/assistantTools');

/**
 * Parse natural language question into metric + parameters
 * @param {string} question - Natural language question from admin
 * @returns {Promise<Object>} - {metric, params, confidence}
 */
async function resolveIntent(question) {
  const availableMetrics = Object.keys(METRIC_TEMPLATES).map(name => ({
    name,
    description: METRIC_TEMPLATES[name].description,
    params: METRIC_TEMPLATES[name].params
  }));

  const prompt = buildIntentPrompt(question, availableMetrics);
  
  try {
    const response = await callLLM(prompt, {
      temperature: 0.05, // Very low for deterministic intent classification
      num_predict: 300
    });

    return parseIntentResponse(response, question);
  } catch (error) {
    console.error('Intent resolution error (using fallback):', error.message);
    // Use keyword fallback when LLM unavailable
    return findBestMetricFallback(question);
  }
}

/**
 * Build the LLM prompt for intent classification
 */
function buildIntentPrompt(question, metrics) {
  return `You are a data assistant for a BARBERSHOP BOOKING SYSTEM. Map user questions to predefined database metrics.

DATABASE CONTEXT:
- Bookings: appointments with services, barbers, dates/times, prices, status (pending/confirmed/completed/cancelled)
- Users: customers who make bookings
- Barbers: staff who perform services (Al, Cynthia, John, Nick, Eric, Riza)
- Services: haircuts, shaves, beard trims ($20-$120)
- Revenue: calculated from completed bookings
- Ratings: customer feedback on barbers (1-5 stars)

AVAILABLE METRICS:
${metrics.map((m, i) => `${i + 1}. ${m.name}
   Description: ${m.description}
   Parameters: ${m.params.join(', ')}`).join('\n\n')}

USER QUESTION: "${question}"

RULES:
- Choose the ONE best metric that answers this question
- Extract parameter values if mentioned (dates, limits, etc.)
- DATE PARSING (CRITICAL):
  * If user says "this month" → use current month dates (2026-01-01 to 2026-01-31)
  * If user says "last month" → use previous month dates
  * If user says "this week" → use current week dates
  * If user says "today" → use today's date only
  * If user specifies a month/year (e.g. "January 2026") → use that full month
  * If NO dates mentioned → use "all" (returns ALL available data, no filtering)
  * Today is: 2026-01-25
- If question asks for "top N", extract limit parameter
- Revenue questions → revenue_trends
- Barber performance → top_barbers  
- Service popularity → service_popularity
- Booking status → bookings_by_status
- Return ONLY valid JSON, no extra text

RESPONSE FORMAT (JSON only):
{
  "metric": "metric_name_here",
  "params": {
    "startDate": "YYYY-MM-DD or 'all' for no date filter",
    "endDate": "YYYY-MM-DD or 'all' for no date filter",
    "limit": 10
  },
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}

Your JSON response:`;
}

/**
 * Parse LLM response into structured intent
 */
function parseIntentResponse(response, originalQuestion) {
  try {
    // Extract JSON from response (LLM might add extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate metric exists
    if (!METRIC_TEMPLATES[parsed.metric]) {
      // Try fallback mapping
      const metric = findBestMetricFallback(originalQuestion);
      if (metric) {
        parsed.metric = metric;
        parsed.confidence = 'medium';
      } else {
        throw new Error(`Unknown metric: ${parsed.metric}`);
      }
    }

    // Validate and normalize params
    const template = METRIC_TEMPLATES[parsed.metric];
    const normalizedParams = {};

    for (const paramName of template.params) {
      if (parsed.params && parsed.params[paramName]) {
        normalizedParams[paramName] = parsed.params[paramName];
      } else if (template.defaults[paramName]) {
        normalizedParams[paramName] = template.defaults[paramName];
      }
    }

    return {
      metric: parsed.metric,
      params: normalizedParams,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || 'Matched by LLM'
    };
  } catch (error) {
    console.error('Failed to parse intent response:', error);
    console.error('Raw response:', response);
    
    // Fallback to simple keyword matching
    return findBestMetricFallback(originalQuestion);
  }
}

/**
 * Fallback keyword-based metric matching (when LLM fails)
 */
function findBestMetricFallback(question) {
  const q = question.toLowerCase();

  // Direct keyword mapping
  const keywordMap = {
    'revenue': 'revenue_trends',
    'top barber': 'top_barbers',
    'best barber': 'top_barbers',
    'no show': 'no_show_rate',
    'no-show': 'no_show_rate',
    'payment': 'payment_summary',
    'service': 'service_popularity',
    'popular service': 'service_popularity',
    'booking status': 'bookings_by_status',
    'status': 'bookings_by_status',
    'reminder': 'reminder_effectiveness',
    'user growth': 'user_growth',
    'new user': 'user_growth',
    'cancel': 'cancellation_patterns',
    'peak hour': 'peak_hours',
    'busy': 'peak_hours',
    'rating': 'ratings_summary',
    'audit': 'audit_summary'
  };

  for (const [keyword, metric] of Object.entries(keywordMap)) {
    if (q.includes(keyword)) {
      const template = METRIC_TEMPLATES[metric];
      const params = {};
      for (const paramName of template.params) {
        params[paramName] = template.defaults[paramName];
      }

      return {
        metric,
        params,
        confidence: 'low',
        reasoning: `Keyword match: "${keyword}"`
      };
    }
  }

  // Default fallback
  return {
    metric: 'bookings_by_status',
    params: { startDate: 'last_30_days', endDate: 'today' },
    confidence: 'low',
    reasoning: 'Default metric (question unclear)'
  };
}

module.exports = {
  resolveIntent
};
