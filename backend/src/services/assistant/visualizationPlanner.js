/**
 * Suggest appropriate visualizations for metrics
 */
function suggestVisualization(metricName, rows) {
  const suggestions = {
    bookings_by_status: {
      type: 'pie',
      x: 'status',
      y: 'count',
      title: 'Bookings by Status'
    },
    top_barbers: {
      type: 'bar',
      x: 'first_name',
      y: 'revenue',
      title: 'Top Barbers by Revenue'
    },
    revenue_trends: {
      type: 'line',
      x: 'date',
      y: 'revenue',
      title: 'Daily Revenue Trend'
    },
    service_popularity: {
      type: 'bar',
      x: 'name',
      y: 'total_bookings',
      title: 'Service Popularity'
    },
    user_growth: {
      type: 'line',
      x: 'date',
      y: 'new_users',
      title: 'User Growth Over Time'
    },
    peak_hours: {
      type: 'bar',
      x: 'hour',
      y: 'bookings',
      title: 'Peak Booking Hours'
    },
    payment_summary: {
      type: 'pie',
      x: 'payment_status',
      y: 'bookings',
      title: 'Payment Status Distribution'
    },
    ratings_summary: {
      type: 'bar',
      x: 'first_name',
      y: 'avg_rating',
      title: 'Barber Ratings'
    }
  };

  return suggestions[metricName] || {
    type: 'table',
    title: 'Results'
  };
}

module.exports = { suggestVisualization };
