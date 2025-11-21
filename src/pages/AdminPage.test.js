import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


// Mock the API and dependencies
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock services/api to avoid importing axios ESM in Jest
jest.mock('../services/api', () => ({
  authAPI: {
    getMe: jest.fn().mockResolvedValue({ data: { data: { user: { email: 'test@test.com', role: 'admin' } } } }),
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
  bookingAPI: {
    cancel: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage;

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') {
      return 'Jan 15, 2025';
    }
    if (formatStr === 'h:mm a') {
      return '10:00 AM';
    }
    return 'mocked date';
  }),
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

// Import after mocks
import AdminPage from './AdminPage';
import AuthContext from '../context/AuthContext';

// Helper to wrap component with necessary providers
const renderWithAuth = (component, userRole = 'admin') => {
  const mockUser = { role: userRole, email: 'test@test.com' };
  const mockAuthValue = {
    user: mockUser,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  };

  return render(
    <AuthContext.Provider value={mockAuthValue}>
      {component}
    </AuthContext.Provider>
  );
};

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('handleStatusChange function', () => {
    test('should optimistically update booking status in state before server response', async () => {
      // Mock the initial bookings fetch
      const mockBookings = [
        {
          id: 1,
          booking_date: '2025-01-15',
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          notes: 'Test note',
          created_at: '2025-01-10',
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
          barber_first_name: 'Mike',
          barber_last_name: 'Smith',
        },
      ];

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookings } }),
      });

      renderWithAuth(<AdminPage />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify initial status is "pending"
      const statusBadge = screen.getByText('pending');
      expect(statusBadge).toBeInTheDocument();

      // Mock the status update API call (simulate slow response)
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true }),
          }), 100)
        )
      );

      // Find and change the status select
      const statusSelect = screen.getByRole('combobox');
      
      // Change status to "confirmed"
      await act(async () => {
        await userEvent.selectOptions(statusSelect, 'confirmed');
      });

      // The status should be updated optimistically IMMEDIATELY (before server responds)
      // We verify this by checking that the select value changed instantly
      expect(statusSelect.value).toBe('confirmed');

      // Wait for the API call to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/bookings/1/status'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'confirmed' }),
          })
        );
      });
    });

    test('should revert optimistic update and show an error if the server update fails', async () => {
      const mockBookings = [
        {
          id: 1,
          booking_date: '2025-01-15',
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          notes: 'Test note',
          created_at: '2025-01-10',
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
          barber_first_name: 'Mike',
          barber_last_name: 'Smith',
        },
      ];

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookings } }),
      });

      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithAuth(<AdminPage />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Mock the status update API call to FAIL
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      // Mock the revert fetch (fetchAllBookings call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookings } }),
      });

      const statusSelect = screen.getByRole('combobox');
      
      // Attempt to change status
      await act(async () => {
        await userEvent.selectOptions(statusSelect, 'confirmed');
      });

      // Wait for error handling
      await waitFor(() => {
        // Should show error alert
        expect(mockAlert).toHaveBeenCalledWith('❌ Failed to update status');
      });

      // Should revert by calling fetchAllBookings (3rd fetch call)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3); // initial + failed update + revert
      });

      // Verify that the last fetch was to get all bookings (revert call)
      const lastFetchCall = mockFetch.mock.calls[2];
      expect(lastFetchCall[0]).toContain('/bookings/all');

      mockAlert.mockRestore();
    });
  });

  describe('normalizeDate function', () => {
    test('should correctly extract YYYY-MM-DD from ISO timestamp format', () => {
      // We'll test this by checking the todayBookings calculation
      const today = new Date().toISOString().split('T')[0];
      
      const mockBookingsWithTimestamp = [
        {
          id: 1,
          booking_date: `${today}T00:00:00.000Z`, // ISO timestamp format
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
        {
          id: 2,
          booking_date: '2025-01-01T00:00:00.000Z', // Past date
          booking_time: '11:00:00',
          status: 'completed',
          total_price: 60,
          service_name: 'Shave',
          customer_first_name: 'Jane',
          customer_last_name: 'Smith',
          customer_email: 'jane@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookingsWithTimestamp } }),
      });

      renderWithAuth(<AdminPage />);

      // Wait for data to load and verify today's bookings count
      waitFor(() => {
        // Should show "1 bookings today" in the revenue banner
        expect(screen.getByText(/1 bookings today/i)).toBeInTheDocument();
      });
    });

    test('should correctly extract YYYY-MM-DD from simple date string format', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const mockBookingsWithSimpleDate = [
        {
          id: 1,
          booking_date: today, // Simple YYYY-MM-DD format
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
        {
          id: 2,
          booking_date: '2025-01-01', // Past date (simple format)
          booking_time: '11:00:00',
          status: 'completed',
          total_price: 60,
          service_name: 'Shave',
          customer_first_name: 'Jane',
          customer_last_name: 'Smith',
          customer_email: 'jane@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookingsWithSimpleDate } }),
      });

      renderWithAuth(<AdminPage />);

      // Wait for data to load and verify today's bookings count
      waitFor(() => {
        expect(screen.getByText(/1 bookings today/i)).toBeInTheDocument();
      });
    });

    test('should handle empty or null date strings', () => {
      const mockBookingsWithInvalidDates = [
        {
          id: 1,
          booking_date: null,
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookingsWithInvalidDates } }),
      });

      renderWithAuth(<AdminPage />);

      // Component should not crash and should show 0 bookings today
      waitFor(() => {
        expect(screen.getByText(/0 bookings today/i)).toBeInTheDocument();
      });
    });
  });

  describe('todayBookings calculation', () => {
    test('should correctly filter bookings for today using normalizeDate', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const mockBookingsMultipleDates = [
        {
          id: 1,
          booking_date: `${today}T10:00:00.000Z`, // Today with timestamp
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
        {
          id: 2,
          booking_date: today, // Today without timestamp
          booking_time: '11:00:00',
          status: 'confirmed',
          total_price: 60,
          service_name: 'Shave',
          customer_first_name: 'Jane',
          customer_last_name: 'Smith',
          customer_email: 'jane@test.com',
        },
        {
          id: 3,
          booking_date: yesterday, // Yesterday
          booking_time: '12:00:00',
          status: 'completed',
          total_price: 70,
          service_name: 'Beard Trim',
          customer_first_name: 'Bob',
          customer_last_name: 'Johnson',
          customer_email: 'bob@test.com',
        },
        {
          id: 4,
          booking_date: tomorrow, // Tomorrow
          booking_time: '13:00:00',
          status: 'pending',
          total_price: 80,
          service_name: 'Haircut',
          customer_first_name: 'Alice',
          customer_last_name: 'Williams',
          customer_email: 'alice@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockBookingsMultipleDates } }),
      });

      renderWithAuth(<AdminPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Should show exactly 2 bookings for today (ids 1 and 2)
      await waitFor(() => {
        expect(screen.getByText(/2 bookings today/i)).toBeInTheDocument();
      });

      // Verify today's revenue calculation (50 + 60 = 110 total, but only completed counts for revenue)
      // Since neither booking is completed, today's completed revenue should be $0.00
      await waitFor(() => {
        const todayRevenue = screen.getByText(/\$0\.00/);
        expect(todayRevenue).toBeInTheDocument();
      });
    });

    test('should correctly calculate revenue for today bookings', async () => {
      const today = new Date().toISOString().split('T')[0];

      const mockTodayBookings = [
        {
          id: 1,
          booking_date: today,
          booking_time: '10:00:00',
          status: 'completed',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
        {
          id: 2,
          booking_date: today,
          booking_time: '11:00:00',
          status: 'completed',
          total_price: 60,
          service_name: 'Shave',
          customer_first_name: 'Jane',
          customer_last_name: 'Smith',
          customer_email: 'jane@test.com',
        },
        {
          id: 3,
          booking_date: today,
          booking_time: '12:00:00',
          status: 'pending', // Not completed, shouldn't count
          total_price: 40,
          service_name: 'Trim',
          customer_first_name: 'Bob',
          customer_last_name: 'Johnson',
          customer_email: 'bob@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockTodayBookings } }),
      });

      renderWithAuth(<AdminPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Should show 3 bookings today
      await waitFor(() => {
        expect(screen.getByText(/3 bookings today/i)).toBeInTheDocument();
      });

      // Today's completed revenue should be $110.00 (50 + 60, pending not counted)
      await waitFor(() => {
        const bannerLabel = screen.getByText("Today's Revenue");
        const banner = bannerLabel.closest('.revenue-content') || bannerLabel.parentElement;
        const bannerUtils = within(banner);
        expect(bannerUtils.getByText(/\$110\.00/)).toBeInTheDocument();
      });

      // Should show 2 completed bookings today
      await waitFor(() => {
        expect(screen.getByText(/2 completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle mixed date formats in the same dataset', async () => {
      const today = new Date().toISOString().split('T')[0];

      const mockMixedFormatBookings = [
        {
          id: 1,
          booking_date: `${today}T00:00:00.000Z`, // ISO timestamp
          booking_time: '10:00:00',
          status: 'pending',
          total_price: 50,
          service_name: 'Haircut',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_email: 'john@test.com',
        },
        {
          id: 2,
          booking_date: today, // Simple date string
          booking_time: '11:00:00',
          status: 'confirmed',
          total_price: 60,
          service_name: 'Shave',
          customer_first_name: 'Jane',
          customer_last_name: 'Smith',
          customer_email: 'jane@test.com',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { bookings: mockMixedFormatBookings } }),
      });

      renderWithAuth(<AdminPage />);

      // Both bookings should be recognized as today
      await waitFor(() => {
        expect(screen.getByText(/2 bookings today/i)).toBeInTheDocument();
      });
    });
  });
});
