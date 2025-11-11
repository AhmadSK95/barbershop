#!/bin/bash

echo "Testing Available Barbers API"
echo "=============================="
echo ""

# Test 1: Get available barbers for a specific date/time
echo "Test 1: Get available barbers for 2024-11-10 at 10:00:00"
curl -s "http://localhost:5001/api/bookings/available-barbers?date=2024-11-10&time=10:00:00" | json_pp

echo ""
echo ""

# Test 2: Get available barbers for another time slot
echo "Test 2: Get available barbers for 2024-11-10 at 14:30:00"
curl -s "http://localhost:5001/api/bookings/available-barbers?date=2024-11-10&time=14:30:00" | json_pp

echo ""
echo "=============================="
echo "API test complete!"
