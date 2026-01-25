#!/bin/bash

API_URL="http://localhost:5001/api"
ADMIN_USERNAME="admin@barbershop.com"
ADMIN_PASSWORD="Admin@123456"

echo "🔐 Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test questions
declare -a questions=(
  "What is my total revenue this month?"
  "Show me the top barbers"
  "What is my no-show rate?"
  "How many bookings do I have today?"
  "Which services are most popular?"
  "Show me revenue trends"
  "What are my pending bookings?"
  "How many new users signed up this week?"
)

echo "🤖 Testing Assistant with various questions:"
echo "================================================================================"

for i in "${!questions[@]}"; do
  question="${questions[$i]}"
  num=$((i+1))
  
  echo ""
  echo "📝 Question $num: \"$question\""
  
  start=$(date +%s%3N)
  
  RESPONSE=$(curl -s -X POST "$API_URL/assistant/query" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"question\":\"$question\",\"revealPII\":false}")
  
  end=$(date +%s%3N)
  duration=$(echo "scale=2; ($end - $start) / 1000" | bc)
  
  echo "⏱️  Response time: ${duration}s"
  
  success=$(echo "$RESPONSE" | jq -r '.success')
  echo "✅ Success: $success"
  
  if [ "$success" == "true" ]; then
    metric=$(echo "$RESPONSE" | jq -r '.data.metric // "N/A"')
    summary=$(echo "$RESPONSE" | jq -r '.data.summary // "N/A"')
    rows=$(echo "$RESPONSE" | jq -r '.data.rows | length // 0')
    viz_type=$(echo "$RESPONSE" | jq -r '.data.visualization.type // "N/A"')
    viz_title=$(echo "$RESPONSE" | jq -r '.data.visualization.title // "N/A"')
    
    echo "📊 Metric: $metric"
    echo "💡 Summary: $summary"
    
    if [ "$viz_type" != "N/A" ]; then
      echo "📈 Visualization: $viz_type - $viz_title"
    fi
    
    if [ "$rows" -gt 0 ]; then
      echo "📋 Data rows: $rows"
      sample=$(echo "$RESPONSE" | jq -r '.data.rows[0] | tostring' | head -c 100)
      echo "   Sample: ${sample}..."
    fi
  else
    message=$(echo "$RESPONSE" | jq -r '.message // "Unknown error"')
    echo "❌ Error: $message"
  fi
  
  echo "--------------------------------------------------------------------------------"
  sleep 0.5
done

echo ""
echo "🏁 Testing complete!"
