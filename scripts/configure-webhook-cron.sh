#!/bin/bash

# Script to generate webhook cron configuration SQL
# Due to permission restrictions, this must be run in the Supabase Dashboard SQL Editor

set -e

echo "🔧 Webhook Cron Configuration Helper"
echo ""

# Get project ref from Supabase CLI
PROJECT_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: No Supabase project linked."
    echo "   Run: npx supabase link --project-ref your-project-ref"
    exit 1
fi

echo "📋 Project: $PROJECT_REF"

# Get service role key from Supabase CLI
echo "🔑 Fetching service role key..."
SERVICE_ROLE_KEY=$(npx supabase projects api-keys --project-ref "$PROJECT_REF" 2>/dev/null | grep "service_role" | awk '{print $3}')

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Could not fetch service role key."
    echo "   Make sure you're logged in: npx supabase login"
    exit 1
fi

# Construct Supabase URL
SUPABASE_URL="${PROJECT_REF}.supabase.co"

echo "🌐 URL: $SUPABASE_URL"
echo "🔐 Service Role Key: Retrieved"
echo ""
echo "================================================================="
echo "📋 COPY AND RUN THIS SQL IN YOUR SUPABASE DASHBOARD SQL EDITOR:"
echo "================================================================="
echo ""
echo "SELECT configure_webhook_cron_settings("
echo "  '$SUPABASE_URL',"
echo "  '$SERVICE_ROLE_KEY'"
echo ");"
echo ""
echo "================================================================="
echo ""
echo "📍 Dashboard URL: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
echo "After running the SQL, you should see:"
echo "  ✅ \"Configuration updated successfully. Please reconnect...\""
echo ""
echo "The webhook dispatcher cron job will then:"
echo "  • Run every minute"
echo "  • Process pending webhooks from the queue"
echo "  • Deliver events to registered webhook endpoints"
echo ""
