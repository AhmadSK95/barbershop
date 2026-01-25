const { callLLM } = require('./llmClient');

/**
 * Format data into a natural conversational response using OpenAI
 * @param {string} question - User's original question
 * @param {Object} data - Data returned from metric query
 * @param {string} metric - Metric name used
 * @returns {Promise<string>} - Formatted conversational response
 */
async function formatConversationalResponse(question, data, metric) {
  if (!data.rows || data.rows.length === 0) {
    return `I couldn't find any data to answer that question. This could mean there are no records for the specified time period, or the data hasn't been recorded yet.`;
  }

  // Build context about the data
  const dataContext = buildDataContext(data, metric);
  
  const prompt = `You are a helpful barbershop business assistant. A user asked: "${question}"

DATA RETRIEVED:
${dataContext}

INSTRUCTIONS:
- Provide a clear, conversational answer to the user's question
- Use specific numbers and insights from the data
- Format currency as $ with 2 decimals (e.g., $1,234.56)
- Be concise but informative (2-4 sentences)
- If showing multiple items, mention the top 3-5
- Sound natural and friendly, like a business consultant
- DO NOT just repeat the raw data - provide insights and analysis
- Focus on what's most important and actionable

Your response:`;

  try {
    const response = await callLLM(prompt, {
      temperature: 0.3, // Slightly higher for more natural language
      max_tokens: 300
    });

    return response.trim();
  } catch (error) {
    console.error('Response formatting error:', error.message);
    // Fallback to basic summary
    return data.summary || 'Here is the data for your question.';
  }
}

/**
 * Build data context string from query results
 */
function buildDataContext(data, metric) {
  const { rows, summary, params } = data;
  
  let context = `Metric: ${metric}\n`;
  
  if (params) {
    context += `Time period: ${params.startDate || 'all time'} to ${params.endDate || 'now'}\n`;
  }
  
  context += `Total rows: ${rows.length}\n\n`;
  
  // Format the data based on type
  if (metric === 'revenue_trends') {
    context += formatRevenueTrends(rows);
  } else if (metric === 'top_barbers') {
    context += formatTopBarbers(rows);
  } else if (metric === 'service_popularity') {
    context += formatServicePopularity(rows);
  } else if (metric === 'bookings_by_status') {
    context += formatBookingsByStatus(rows);
  } else if (metric === 'no_show_rate') {
    context += formatNoShowRate(rows);
  } else {
    // Generic formatting
    context += formatGenericData(rows);
  }
  
  return context;
}

function formatRevenueTrends(rows) {
  let result = 'Revenue by date:\n';
  const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
  const totalBookings = rows.reduce((sum, r) => sum + parseInt(r.bookings || 0), 0);
  
  result += `- Total revenue: $${totalRevenue.toFixed(2)}\n`;
  result += `- Total bookings: ${totalBookings}\n`;
  result += `- Days with data: ${rows.length}\n`;
  result += `- Average daily revenue: $${(totalRevenue / rows.length).toFixed(2)}\n`;
  
  // Show top revenue days
  const topDays = rows
    .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
    .slice(0, 3);
    
  result += '\nTop revenue days:\n';
  topDays.forEach(day => {
    result += `  ${day.date}: $${parseFloat(day.revenue).toFixed(2)} (${day.bookings} bookings)\n`;
  });
  
  return result;
}

function formatTopBarbers(rows) {
  let result = 'Barber performance:\n';
  rows.forEach((barber, i) => {
    result += `${i + 1}. ${barber.first_name} ${barber.last_name}\n`;
    result += `   - Revenue: $${parseFloat(barber.revenue || 0).toFixed(2)}\n`;
    result += `   - Completed bookings: ${barber.completed_bookings || 0}\n`;
    result += `   - Total bookings: ${barber.total_bookings || 0}\n`;
    if (barber.avg_booking_value) {
      result += `   - Avg booking value: $${parseFloat(barber.avg_booking_value).toFixed(2)}\n`;
    }
  });
  return result;
}

function formatServicePopularity(rows) {
  let result = 'Service performance:\n';
  rows.forEach((service, i) => {
    result += `${i + 1}. ${service.name}\n`;
    result += `   - Total bookings: ${service.total_bookings || 0}\n`;
    result += `   - Completed: ${service.completed || 0}\n`;
    result += `   - Revenue: $${parseFloat(service.revenue || 0).toFixed(2)}\n`;
    result += `   - Price: $${parseFloat(service.price || 0).toFixed(2)}\n`;
  });
  return result;
}

function formatBookingsByStatus(rows) {
  let result = 'Booking status breakdown:\n';
  const totalBookings = rows.reduce((sum, r) => sum + parseInt(r.count || 0), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
  
  rows.forEach(status => {
    const pct = ((parseInt(status.count) / totalBookings) * 100).toFixed(1);
    result += `- ${status.status}: ${status.count} bookings (${pct}%), $${parseFloat(status.revenue || 0).toFixed(2)} revenue\n`;
  });
  
  result += `\nTotal: ${totalBookings} bookings, $${totalRevenue.toFixed(2)} revenue\n`;
  return result;
}

function formatNoShowRate(rows) {
  const data = rows[0];
  return `No-show statistics:
- No-shows: ${data.no_shows || 0}
- Total completed: ${data.total_completed || 0}
- No-show rate: ${data.no_show_rate_pct || 0}%`;
}

function formatGenericData(rows) {
  let result = 'Data:\n';
  rows.slice(0, 10).forEach((row, i) => {
    result += `${i + 1}. ${JSON.stringify(row)}\n`;
  });
  if (rows.length > 10) {
    result += `... and ${rows.length - 10} more rows\n`;
  }
  return result;
}

module.exports = {
  formatConversationalResponse
};
