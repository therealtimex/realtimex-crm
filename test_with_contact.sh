#!/bin/bash
# Test webhook with contact matching

WEBHOOK_URL="https://xydvyhnspkzcsocewhuy.supabase.co/functions/v1/ingest-activity?key=ik_live_09481a2d277f4070a943a0c196b86d75"

echo "Enter an email address from your contacts table (or press Enter to skip):"
read EMAIL

if [ -z "$EMAIL" ]; then
  EMAIL="demo@example.com"
  echo "Using demo email: $EMAIL"
  echo "Note: This won't link to a contact unless this email exists in your contacts table"
fi

echo ""
echo "Sending test activity..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "raw_data": {
      "source_type": "text",
      "content": "This is a test email that should link to a contact",
      "subject": "Test Email via Webhook",
      "sender": "'"$EMAIL"'"
    },
    "metadata": {
      "from": "'"$EMAIL"'",
      "to": "sales@company.com",
      "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Done! If the email exists in your contacts table, the activity will appear in that contact's Activity Feed."
echo "   Otherwise, check the Supabase dashboard to verify the activity was created."
