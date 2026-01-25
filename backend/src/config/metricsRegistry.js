/**
 * Metrics Registry - Single source of truth for all data assistant metrics
 * Defines parameters, schemas, and generates OpenAI tool definitions
 */

const METRICS_REGISTRY = {
  revenue_trends: {
    name: 'revenue_trends',
    description: 'Get daily revenue trends and booking counts over a date range',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date (YYYY-MM-DD) or use "all" for all available data',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date (YYYY-MM-DD) or "today"',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'What is my revenue this month?',
      'Show me revenue for January 2026',
      'How much did I make last week?',
      'Revenue trends over time'
    ]
  },

  top_barbers: {
    name: 'top_barbers',
    description: 'Get top performing barbers ranked by revenue and completed bookings',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for analysis period',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for analysis period',
        default: 'today'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Number of top barbers to return',
        default: 10
      }
    ],
    exampleQuestions: [
      'Who are my top barbers?',
      'Show me best performing barbers',
      'Which barber made the most money?',
      'Top 5 barbers this month'
    ]
  },

  bookings_by_status: {
    name: 'bookings_by_status',
    description: 'Get booking counts and revenue broken down by status (pending, confirmed, completed, cancelled)',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for bookings',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for bookings',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'How many pending bookings do I have?',
      'Show me bookings by status',
      'What are my confirmed bookings?',
      'Booking status breakdown'
    ]
  },

  service_popularity: {
    name: 'service_popularity',
    description: 'Get most popular services ranked by booking count and revenue',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for analysis',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for analysis',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'Which services are most popular?',
      'What services do customers book most?',
      'Best selling services',
      'Service popularity ranking'
    ]
  },

  no_show_rate: {
    name: 'no_show_rate',
    description: 'Calculate no-show rate percentage and statistics',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for calculation',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for calculation',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'What is my no-show rate?',
      'How many customers don\'t show up?',
      'No show statistics',
      'Calculate no-show percentage'
    ]
  },

  user_growth: {
    name: 'user_growth',
    description: 'Track new user registrations over time',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for user growth tracking',
        default: 'last_30_days'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for tracking',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'How many new users signed up?',
      'User registration trends',
      'New customer growth',
      'How many users this month?'
    ]
  },

  payment_summary: {
    name: 'payment_summary',
    description: 'Get payment status summary including paid, pending, and refunded amounts',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for payments',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for payments',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'Payment status summary',
      'How much has been paid?',
      'Show me pending payments',
      'Payment breakdown'
    ]
  },

  peak_hours: {
    name: 'peak_hours',
    description: 'Find most popular booking hours and times',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for analysis',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for analysis',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'When are my busiest hours?',
      'What time do most people book?',
      'Peak booking times',
      'Popular time slots'
    ]
  },

  cancellation_patterns: {
    name: 'cancellation_patterns',
    description: 'Analyze when customers typically cancel bookings (hours before appointment)',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for analysis',
        default: 'all'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for analysis',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'When do customers cancel?',
      'Cancellation timing patterns',
      'How far in advance do people cancel?'
    ]
  },

  ratings_summary: {
    name: 'ratings_summary',
    description: 'Get average ratings and feedback statistics for barbers',
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: 'Start date for ratings',
        default: 'last_90_days'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: 'End date for ratings',
        default: 'today'
      }
    ],
    exampleQuestions: [
      'What are my barber ratings?',
      'Average customer ratings',
      'How are my barbers rated?',
      'Customer satisfaction scores'
    ]
  }
};

/**
 * Generate OpenAI tool definitions from registry
 * @returns {Array} OpenAI-compatible tool definitions
 */
function generateOpenAITools() {
  return Object.values(METRICS_REGISTRY).map(metric => ({
    type: 'function',
    function: {
      name: metric.name,
      description: metric.description,
      parameters: {
        type: 'object',
        properties: metric.parameters.reduce((props, param) => {
          props[param.name] = {
            type: param.type === 'number' ? 'integer' : 'string',
            description: param.description
          };
          return props;
        }, {}),
        required: metric.parameters.filter(p => p.required).map(p => p.name)
      }
    }
  }));
}

/**
 * Get metric definition by name
 * @param {string} metricName 
 * @returns {Object|null}
 */
function getMetricDefinition(metricName) {
  return METRICS_REGISTRY[metricName] || null;
}

/**
 * List all available metrics
 * @returns {Array}
 */
function listAllMetrics() {
  return Object.values(METRICS_REGISTRY);
}

module.exports = {
  METRICS_REGISTRY,
  generateOpenAITools,
  getMetricDefinition,
  listAllMetrics
};
