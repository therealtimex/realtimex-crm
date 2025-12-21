#!/bin/bash
# Test script for ingestion webhook

WEBHOOK_URL="https://xydvyhnspkzcsocewhuy.supabase.co/functions/v1/ingest-activity?key=ik_live_09481a2d277f4070a943a0c196b86d75"

echo "Testing Generic Webhook..."
echo ""

# Test 1: Generic note/activity
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "note",
    "raw_data": {
      "source_type": "text",
      "content": "Test activity from webhook - checking ingestion system works!"
    },
    "metadata": {
      "from": "test@example.com",
      "test": true
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "---"
echo ""

# Test 2: Email-like activity with contact matching
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "raw_data": {
      "source_type": "text",
      "content": "This is a test email from a contact",
      "subject": "Test Email Subject",
      "sender": "test@example.com"
    },
    "metadata": {
      "from": "test@example.com",
      "to": "sales@company.com"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Test complete! Check your Activity Feed in the UI."
