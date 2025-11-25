# Loading States Usage Guide

This guide shows how to implement loading states and skeleton loaders in the barbershop app.

## Components Available

### 1. LoadingSpinner
A rotating barber pole-style spinner for general loading states.

**Props:**
- `size`: 'small' | 'medium' | 'large' (default: 'medium')
- `message`: string (default: 'Loading...')

**Usage:**
```javascript
import LoadingSpinner from '../components/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// Custom size and message
<LoadingSpinner size="large" message="Loading bookings..." />

// No message
<LoadingSpinner message={null} />
```

### 2. Skeleton Loaders
Content placeholders that show the structure of loading content.

**Available Components:**
- `SkeletonText`: For text content
- `SkeletonCard`: For card layouts
- `SkeletonBooking`: For booking cards
- `SkeletonTable`: For table data

**Usage:**
```javascript
import { SkeletonText, SkeletonCard, SkeletonBooking, SkeletonTable } from '../components/SkeletonLoader';

// Text with custom lines
<SkeletonText lines={5} />

// Card placeholder
<SkeletonCard />

// Booking placeholder
<SkeletonBooking />

// Table with custom dimensions
<SkeletonTable rows={10} columns={5} />
```

## Implementation Patterns

### Pattern 1: Simple Loading State
Use when loading a full page or section:

```javascript
function MyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.getData();
      setData(response.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading page..." />;
  }

  return <div>{/* Your content */}</div>;
}
```

### Pattern 2: Skeleton Loading (Preferred for UX)
Use to show content structure while loading:

```javascript
function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  if (loading) {
    return (
      <div className="bookings-list">
        <SkeletonBooking />
        <SkeletonBooking />
        <SkeletonBooking />
      </div>
    );
  }

  return (
    <div className="bookings-list">
      {bookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
```

### Pattern 3: Inline Loading State
Use for buttons or small actions:

```javascript
function BookingButton() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveBooking();
    } finally {
      setSaving(false);
    }
  };

  return (
    <button onClick={handleSave} disabled={saving}>
      {saving ? (
        <>
          <LoadingSpinner size="small" message={null} />
          <span>Saving...</span>
        </>
      ) : (
        'Save Booking'
      )}
    </button>
  );
}
```

### Pattern 4: Combined Loading States
Use different states for different sections:

```javascript
function DashboardPage() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  return (
    <div className="dashboard">
      <div className="stats-section">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <StatCards data={stats} />
        )}
      </div>

      <div className="bookings-section">
        {bookingsLoading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : (
          <BookingsTable data={bookings} />
        )}
      </div>
    </div>
  );
}
```

## Best Practices

1. **Use skeletons for initial load** - Better UX than spinners
2. **Use spinners for actions** - Button clicks, form submissions
3. **Match skeleton to actual content** - Use SkeletonBooking for booking lists
4. **Show realistic loading time** - 3-5 skeleton items matches real data
5. **Disable interactions** - Disable buttons/forms while loading
6. **Provide feedback** - Always show loading state for >300ms operations

## Pages That Need Loading States

### High Priority
- ✅ ProfilePage (bookings list)
- ✅ AdminPage (table data)
- ✅ BarberDashboardPage (schedule)
- ✅ BookingPage (available slots)

### Medium Priority
- ConfigPage (settings forms)
- CareersPage (job listings)

### Low Priority
- Static pages don't need loading states

## Migration Checklist

- [ ] Replace `alert()` with toast notifications
- [ ] Add LoadingSpinner to all async operations
- [ ] Add skeleton loaders to list/table views
- [ ] Add button loading states
- [ ] Test loading states with slow network (throttle to 3G)
